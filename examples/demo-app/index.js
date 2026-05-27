const HealStack = require("healstack");

HealStack.init({
    apiKey: "demo-key"
});

console.log("Demo App Running");

// Simulate crash
try {
    nonExistingFunction();
} catch (error) {
    console.error("Error detected:", error.message);
}
