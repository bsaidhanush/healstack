import 'dart:convert';
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

  @override
  void onError(
      DioException err,
      ErrorInterceptorHandler handler) async {

    final request = err.requestOptions;

    int retryCount =
        request.extra["retryCount"] ?? 0;

    print("HealStack API Failure Detected");

    // Send failure log
    await http.post(

      Uri.parse("$effectiveApiUrl/api-error"),

      headers: {
        "Content-Type": "application/json"
      },

      body: jsonEncode({

        "platform": "flutter",
        "url": request.uri.toString(),
        "method": request.method,
        "statusCode": err.response?.statusCode,
        "message": err.message,
        "retryCount": retryCount

      }),
    );

    // Retry logic
    if (retryCount < 2) {

      request.extra["retryCount"] =
          retryCount + 1;

      print(
        "HealStack Retry Attempt: ${retryCount + 1}"
      );

      final dio = Dio();
      dio.interceptors.add(HealStackInterceptor());

      try {

        final response =
            await dio.fetch(request);

        return handler.resolve(response);

      } catch (_) {}

    }

    print("HealStack Recovery Triggered");

    return handler.next(err);
  }
}
