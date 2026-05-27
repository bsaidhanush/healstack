var axiosLib = typeof require === "function" ? require("axios") : window.axios;
var recoverAPI;
if (typeof require === "function") {
    try {
        recoverAPI = require("./recovery");
    } catch (e) {
        recoverAPI = undefined;
    }
} else {
    recoverAPI = window.recoverAPI;
}

function monitorAPI(apiInstance) {

    apiInstance.interceptors.response.use(

        response => response,

        async error => {

            console.log("API FAILURE DETECTED");

            const config = error.config;

            if (!config.__retryCount) {
                config.__retryCount = 0;
            }

            if (config.__retryCount < 2) {

                config.__retryCount += 1;

                console.log(`Retry Attempt: ${config.__retryCount}`);

                try {

                    await axiosLib.post("http://localhost:8000/api-error", {

                        url: config?.url,
                        method: config?.method,
                        status: error.response?.status,
                        message: error.message,
                        retry: config.__retryCount

                    });

                } catch(err) {

                    console.log("Failed to send API error");

                }

                return apiInstance(config);
            }

            console.log("Max retries reached");

            if (typeof recoverAPI === 'function') {
                return recoverAPI(error, apiInstance);
            }

            return Promise.reject(error);
        }
    );
}

if (typeof window !== "undefined") {
    window.monitorAPI = monitorAPI;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = monitorAPI;
} 