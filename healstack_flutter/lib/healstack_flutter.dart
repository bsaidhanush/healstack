library healstack_flutter;

export 'interceptor.dart';

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class HealStack {

  static String apiKey = "";
  static String apiUrl = "";

  static void init({
    required String apiKey,
    required String apiUrl,
  }) {
    WidgetsFlutterBinding.ensureInitialized();

    HealStack.apiKey = apiKey;
    HealStack.apiUrl = apiUrl;

    // Capture standard Flutter framework errors (build, layout, etc.)
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      captureError(
        details.exceptionAsString(),
      );
    };

    // Capture uncaught asynchronous & button callback errors
    WidgetsBinding.instance.platformDispatcher.onError = (Object error, StackTrace stack) {
      captureError(error.toString());
      return false; // Let the platform print the error to console as well
    };

    debugPrint("HealStack Initialized");
  }

  static Future<void> captureError(
      String message) async {

    try {

      await http.post(

        Uri.parse("$apiUrl/error"),

        headers: {
          "Content-Type": "application/json"
        },

        body: jsonEncode({

          "platform": "flutter",
          "message": message,
          "apiKey": apiKey

        }),
      );

    } catch (e) {

      debugPrint(
        "HealStack backend connection failed"
      );
    }
  }
}
