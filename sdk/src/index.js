var axiosLib = typeof require === "function" ? require("axios") : window.axios;

var monitorAPI;
if (typeof require === "function") {
    monitorAPI = require("./monitor");
} else {
    monitorAPI = window.monitorAPI;
}

function init(config = {}) {

    var apiUrl = config.apiUrl || "http://localhost:8000";
    var apiKey = config.apiKey || null;

    // Configure axios defaults if available
    try {
        if (axiosLib && axiosLib.defaults) {
            axiosLib.defaults.baseURL = apiUrl;
            if (apiKey) {
                axiosLib.defaults.headers = axiosLib.defaults.headers || {};
                axiosLib.defaults.headers.common = axiosLib.defaults.headers.common || {};
                axiosLib.defaults.headers.common['x-api-key'] = apiKey;
            }
        }
    } catch (e) {
        // ignore
    }

    var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
    var isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

    // expose config for other modules
    if (isBrowser) {
        window.healstackConfig = { apiUrl, apiKey, autoHeal: !!config.autoHeal };
    } else if (typeof globalThis !== "undefined") {
        globalThis.healstackConfig = { apiUrl, apiKey, autoHeal: !!config.autoHeal };
    }

    console.log("HealStack Initialized", { apiUrl, autoHeal: !!config.autoHeal });

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
            } catch(err) {
                console.log("Backend unavailable");
            }
        };
    } else if (isNode && process && typeof process.on === "function") {
        process.on("uncaughtException", async function(error) {
            console.log("Node Runtime Error:", error.message);

            try {
                await axiosLib.post(apiUrl + "/error", {
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
                await axiosLib.post(apiUrl + "/error", {
                    type: "runtime",
                    message: String(reason),
                    stack: reason && reason.stack
                });
            } catch (err) {
                console.log("Backend unavailable");
            }
        });
    }

    if (monitorAPI) {
        monitorAPI(axiosLib);
    }
}

if (typeof window !== "undefined") {
    window.init = init;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        init
    };
} 