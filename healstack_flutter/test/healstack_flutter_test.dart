import 'package:flutter_test/flutter_test.dart';
import 'package:healstack_flutter/healstack_flutter.dart';
import 'package:dio/dio.dart';

void main() {
  setUpAll(() {
    HealStack.init(
      apiKey: "flutter-test-key",
      apiUrl: "http://127.0.0.1:8000",
    );
  });

  test('HealStack SDK successfully sends error report to backend', () async {
    expect(HealStack.apiKey, "flutter-test-key");
    expect(HealStack.apiUrl, "http://127.0.0.1:8000");

    // Send the error payload to the running backend server
    await HealStack.captureError("Exception: Flutter test crash from automated test suite");
  });

  test('HealStackInterceptor successfully catches, retries and logs API errors', () async {
    final dio = Dio();
    dio.interceptors.add(HealStackInterceptor());

    try {
      // Perform a request that will fail and trigger our interceptor onError
      await dio.get("https://fake-api-url-demo.com/test");
      fail("Request should have failed");
    } on DioException catch (e) {
      // Verify that 2 retries were attempted and logged
      expect(e.requestOptions.extra["retryCount"], 2);
    }
  });
}
