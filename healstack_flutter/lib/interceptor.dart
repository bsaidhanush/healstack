import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'healstack_flutter.dart';

class HealStackInterceptor extends Interceptor {

  static const String defaultApiUrl =
      "http://10.0.2.2:8000";

  String get effectiveApiUrl {
    if (HealStack.apiUrl.isNotEmpty) {
      return HealStack.apiUrl;
    }
    return defaultApiUrl;
  }

  String _getDeviceOS() {
    if (kIsWeb) return "web";
    try {
      return Platform.operatingSystem;
    } catch (_) {
      return "unknown";
    }
  }

  @override
  void onError(
      DioException err,
      ErrorInterceptorHandler handler) async {

    final request = err.requestOptions;
    int retryCount = request.extra["retryCount"] ?? 0;

    print("HealStack API Failure Intercepted");

    // 1. Timeout Classification & Severity
    bool isTimeout = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout;

    String logType = isTimeout ? "timeout" : "api_failure";
    String severity = isTimeout ? "high" : "medium";
    
    int? statusCode = err.response?.statusCode;

    // 2. Token Refresh Hook Slot (401 Unauthorized handling)
    if (statusCode == 401) {
      print("HealStack Auth Recovery: 401 Unauthorized detected. Executing Token Refresh hook...");
      // Placeholder for refresh token logic:
      // await HealStack.refreshToken();
    }

    // 3. Send structured failure log to the backend
    try {
      await http.post(
        Uri.parse("$effectiveApiUrl/api-error"),
        headers: {
          "Content-Type": "application/json"
        },
        body: jsonEncode({
          "platform": "flutter",
          "sdk": "healstack_flutter",
          "type": logType,
          "severity": severity,
          "url": request.uri.toString(),
          "method": request.method,
          "statusCode": statusCode,
          "retryCount": retryCount,
          "message": err.message ?? err.toString(),
          "apiKey": HealStack.apiKey,
          "device": {
            "os": _getDeviceOS(),
            "version": "1.0.0"
          },
          "timestamp": DateTime.now().toUtc().toIso8601String()
        }),
      );
    } catch (e) {
      print("HealStack backend connection failed: $e");
    }

    // 4. Smart Retryable Status Logic
    // Retry ONLY network failures, 5xx server errors, or timeouts.
    // Do NOT retry 4xx errors (auth, client validation, not found).
    bool isRetryable = false;
    if (isTimeout) {
      isRetryable = true;
    } else if (err.type == DioExceptionType.connectionError) {
      isRetryable = true;
    } else if (statusCode == null) {
      isRetryable = true; // Host lookup failures, offline transitions
    } else if (statusCode >= 500) {
      isRetryable = true; // Server-side exceptions
    }

    if (isRetryable && retryCount < 2) {
      request.extra["retryCount"] = retryCount + 1;

      // 5. Retry Delay to avoid hammering the server
      print("HealStack API Observability: Backing off for 1 second before retry attempt ${retryCount + 1}...");
      await Future.delayed(const Duration(seconds: 1));

      final dio = Dio();
      dio.interceptors.add(HealStackInterceptor());

      try {
        final response = await dio.fetch(request);
        return handler.resolve(response);
      } catch (_) {
        // Fall through to error propagation
      }
    }

    print("HealStack Recovery Chain Complete");
    return handler.next(err);
  }
}
