import axios, { AxiosInstance } from "axios";
import monitorAPI from "./monitor";

export interface HealStackConfig {
    apiKey?: string;
    apiUrl?: string;
    autoHeal?: boolean;
}

declare global {
    interface Window {
        healstackConfig?: HealStackConfig;
        init?: typeof init;
    }
    var healstackConfig: HealStackConfig | undefined;
}

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
const axiosLib: AxiosInstance = axios;

function init(config: HealStackConfig = {}): void {
    const apiUrl = config.apiUrl || "http://localhost:8000";
    const apiKey = config.apiKey || null;

    try {
        axiosLib.defaults.baseURL = apiUrl;

        if (apiKey) {
            axiosLib.defaults.headers = axiosLib.defaults.headers || {};
            axiosLib.defaults.headers.common = axiosLib.defaults.headers.common || {};
            axiosLib.defaults.headers.common["x-api-key"] = apiKey;
        }
    } catch (e) {
        // ignore
    }

    const configState: HealStackConfig = {
        apiUrl,
        apiKey: apiKey ?? undefined,
        autoHeal: !!config.autoHeal
    };

    if (isBrowser) {
        window.healstackConfig = configState;
    } else {
        globalThis.healstackConfig = configState;
    }

    console.log("HealStack Initialized", configState);

    if (isBrowser) {
        window.onerror = async function(message, source, lineno, colno, error) {
            console.log("Frontend Error:", message);

            try {
                await axiosLib.post("/error", {
                    type: "frontend",
                    message,
                    source,
                    lineno,
                    colno
                });
            } catch (err) {
                console.log("Backend unavailable");
            }
        };
    }

    if (isNode && typeof process.on === "function") {
        process.on("uncaughtException", async function(error: Error) {
            console.log("Node Runtime Error:", error.message);

            try {
                await axiosLib.post(`${apiUrl}/error`, {
                    type: "runtime",
                    message: error.message,
                    stack: error.stack
                });
            } catch (err) {
                console.log("Backend unavailable");
            }

            process.exit(1);
        });

        process.on("unhandledRejection", async function(reason) {
            console.log("Unhandled Rejection:", reason);

            try {
                await axiosLib.post(`${apiUrl}/error`, {
                    type: "runtime",
                    message: String(reason),
                    stack: reason instanceof Error ? reason.stack : undefined
                });
            } catch (err) {
                console.log("Backend unavailable");
            }
        });
    }

    monitorAPI(axiosLib);
}

if (isBrowser) {
    window.init = init;
}

export default {
    init
};

export { init };
