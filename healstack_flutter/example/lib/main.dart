import 'package:flutter/material.dart';
import 'package:healstack_flutter/healstack_flutter.dart';
import 'package:dio/dio.dart';

final dio = Dio();

void main() {

  HealStack.init(

    apiKey: "flutter-demo",

    apiUrl: "http://10.0.2.2:8000",

  );

  dio.interceptors.add(
    HealStackInterceptor(),
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {

  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {

    return MaterialApp(

      home: Scaffold(

        appBar: AppBar(
          title: const Text("HealStack Demo"),
        ),

        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(

                onPressed: () {

                  throw Exception(
                    "Flutter test crash"
                  );

                },

                child: const Text(
                  "Trigger Crash"
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(

                onPressed: () async {

                  try {

                    await dio.get(
                      "https://fake-api-url-demo.com/test"
                    );

                  } catch (e) {

                    debugPrint("API Failed");

                  }
                },

                child: const Text(
                  "Trigger API Failure"
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
