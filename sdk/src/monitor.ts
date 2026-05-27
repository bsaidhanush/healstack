import { AxiosInstance, AxiosError } from "axios";
import recoverAPI from "./recovery";

type HealStackAxiosError = AxiosError<unknown> & {
    config: {
        __retryCount?: number;
        url?: string;
        method?: string;
        [key: string]: unknown;
    };
};

function monitorAPI(apiInstance: AxiosInstance): void {
    apiInstance.interceptors.response.use(
        response => response,
        async (error: HealStackAxiosError) => {
            console.log("API FAILURE DETECTED");

            const config = error.config;

            if (!config.__retryCount) {
                config.__retryCount = 0;
            }

            if (config.__retryCount < 2) {
                config.__retryCount += 1;
                console.log(`Retry Attempt: ${config.__retryCount}`);

                try {
                    await apiInstance.post("http://localhost:8000/api-error", {
                        url: config.url,
                        method: config.method,
                        status: error.response?.status,
                        message: error.message,
                        retry: config.__retryCount
                    });
                } catch (err) {
                    console.log("Failed to send API error");
                }

                return apiInstance(config as any);
            }

            console.log("Max retries reached");
            return recoverAPI(error, apiInstance);
        }
    );
}

export default monitorAPI;
