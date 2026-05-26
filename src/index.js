var axiosLib = typeof require === "function" ? require("axios") : window.axios;

var monitorAPI;
if (typeof require === "function") {
    monitorAPI = require("./monitor");
} else {
    monitorAPI = window.monitorAPI;
}

function init(config = {}) {

    console.log("HealStack Initialized");

    window.onerror = async function(message, source, lineno, colno, error) {

        console.log("Frontend Error:", message);

        try {

            await axiosLib.post("http://localhost:8000/error", {
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