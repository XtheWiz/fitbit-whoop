import 'package:flutter/material.dart';

import 'features/home/home_screen.dart';

void main() => runApp(const RecoverApp());

class RecoverApp extends StatelessWidget {
  const RecoverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Recover',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF16C784),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
