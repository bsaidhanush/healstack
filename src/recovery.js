async function recoverAPI(error, apiInstance) {

    console.log("HealStack Recovery Triggered");

    const config = error.config;

    // Example fallback API
    const fallbackURL =
        "https://jsonplaceholder.typicode.com/posts/1";

    try {

        console.log("Switching to fallback API");

        return await apiInstance.get(fallbackURL);

    } catch(err) {

        console.log("Fallback recovery failed");

        return Promise.reject(err);
    }
}

if (typeof window !== "undefined") {
    window.recoverAPI = recoverAPI;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = recoverAPI;
}
