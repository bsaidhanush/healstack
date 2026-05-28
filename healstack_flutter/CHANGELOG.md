## 1.0.0

* Stable production release of the HealStack Flutter SDK.
* Added `HealStack` core initialization and automatic capturing of global unhandled exceptions via `FlutterError.onError`.
* Added `HealStackInterceptor` for Dio API clients to intercept failed requests, execute up to 2 automated retries, and report details to the HealStack backend database.
