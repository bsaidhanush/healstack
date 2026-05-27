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

    // expose config for other modules
    if (typeof window !== 'undefined') {
        window.healstackConfig = { apiUrl, apiKey, autoHeal: !!config.autoHeal };
    }

    console.log("HealStack Initialized", { apiUrl, autoHeal: !!config.autoHeal });

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