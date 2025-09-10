// apps/mobile/lib/main.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'env.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;
  String _pingMsg = 'Ping pendiente…';

  void _incrementCounter() => setState(() => _counter++);

  Future<void> _ping() async {
    try {
      final uri = Uri.parse('${Env.apiBase}/api/ping/');
      final res = await http.get(uri);
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        setState(() => _pingMsg = 'OK: ${data.toString()}');
      } else {
        setState(() => _pingMsg = 'Error HTTP ${res.statusCode}');
      }
    } catch (e) {
      setState(() => _pingMsg = 'Error: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _ping();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(_pingMsg),
            const SizedBox(height: 16),
            const Text('You have pushed the button this many times:'),
            Text('$_counter', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _ping,
              icon: const Icon(Icons.wifi_tethering),
              label: const Text('Reintentar ping'),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
