import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:healstack_flutter/healstack_flutter.dart';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;

void main() {
  test('End-to-End SaaS Validation (Register, Create Project, Intercept Log, OpenAI Fallback)', () async {
    final client = http.Client();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final testEmail = "test_developer_$timestamp@healstack.io";
    final testPassword = "securePassword123!";

    // 1. Sign up on the running backend
    final registerRes = await client.post(
      Uri.parse("http://127.0.0.1:8000/auth/register"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": testEmail, "password": testPassword}),
    );

    expect(registerRes.statusCode, 200);
    final authData = jsonDecode(registerRes.body);
    final token = authData["access_token"];
    expect(token, isNotEmpty);

    // 2. Create a Project
    final projectRes = await client.post(
      Uri.parse("http://127.0.0.1:8000/projects"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token"
      },
      body: jsonEncode({"name": "Test Flutter SDK App"}),
    );

    expect(projectRes.statusCode, 200);
    final projectData = jsonDecode(projectRes.body);
    final apiKey = projectData["api_key"];
    expect(apiKey, startsWith("hs_live_"));

    // 3. Initialize HealStack SDK with the new Project API Key!
    HealStack.init(
      apiKey: apiKey,
      apiUrl: "http://127.0.0.1:8000",
    );

    expect(HealStack.apiKey, apiKey);
    expect(HealStack.apiUrl, "http://127.0.0.1:8000");

    // 4. Send an unhandled exception
    await HealStack.captureError("Exception: Test crash with SaaS secure authentication");

    // 5. Test Dio Interceptor with the secure API key!
    final dio = Dio();
    dio.interceptors.add(HealStackInterceptor());

    try {
      await dio.get("https://fake-api-url-demo.com/test");
      fail("Request should have failed");
    } on DioException catch (e) {
      expect(e.requestOptions.extra["retryCount"], 2);
    }

    // 6. Fetch Logs and verify they are persisted and analyzed!
    final logsRes = await client.get(
      Uri.parse("http://127.0.0.1:8000/logs?project_id=${projectData["id"]}"),
      headers: {"Authorization": "Bearer $token"},
    );

    expect(logsRes.statusCode, 200);
    final List logsList = jsonDecode(logsRes.body);
    expect(logsList.length, greaterThanOrEqualTo(2));
    
    // Check that OpenAI fallback/analysis successfully persisted details!
    final frontendErr = logsList.firstWhere((l) => l["type"] == "Frontend Error");
    expect(frontendErr["analysis"]["severity"], isNotEmpty);
    expect(frontendErr["analysis"]["cause"], isNotEmpty);
    expect(frontendErr["analysis"]["solution"], isNotEmpty);

    print("End-to-End SaaS Validation PASSED successfully!");
    client.close();
  });
}
