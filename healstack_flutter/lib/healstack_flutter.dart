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

    HealStack.apiKey = apiKey;
    HealStack.apiUrl = apiUrl;

    FlutterError.onError = (FlutterErrorDetails details) {

      captureError(
        details.exceptionAsString(),
      );
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
