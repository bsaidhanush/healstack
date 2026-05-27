"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  init: () => init
});
module.exports = __toCommonJS(index_exports);
var import_axios = __toESM(require("axios"));

// src/recovery.ts
async function recoverAPI(error, apiInstance) {
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
var recovery_default = recoverAPI;

// src/monitor.ts
function monitorAPI(apiInstance) {
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
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
        return apiInstance(config);
      }
      console.log("Max retries reached");
      return recovery_default(error, apiInstance);
    }
  );
}
var monitor_default = monitorAPI;

// src/index.ts
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
var isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
var axiosLib = import_axios.default;
function init(config = {}) {
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
  }
  const configState = {
    apiUrl,
    apiKey: apiKey ?? void 0,
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
    process.on("uncaughtException", async function(error) {
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
          stack: reason instanceof Error ? reason.stack : void 0
        });
      } catch (err) {
        console.log("Backend unavailable");
      }
    });
  }
  monitor_default(axiosLib);
}
if (isBrowser) {
  window.init = init;
}
var index_default = {
  init
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  init
});
