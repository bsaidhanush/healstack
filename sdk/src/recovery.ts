import { AxiosInstance, AxiosError } from "axios";

async function recoverAPI(error: AxiosError<unknown>, apiInstance: AxiosInstance) {
    console.log("HealStack Recovery Triggered");

    const fallbackURL = "https://jsonplaceholder.typicode.com/posts/1";

    try {
        console.log("Switching to fallback API");
        return await apiInstance.get(fallbackURL);
    } catch (err) {
        console.log("Fallback recovery failed");
        return Promise.reject(err);
    }
}

export default recoverAPI;
