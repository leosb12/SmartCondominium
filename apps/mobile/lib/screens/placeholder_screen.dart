import 'package:flutter/material.dart';
import '../widgets/menu_dashboard.dart';

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      drawer: const MenuDashboard(), // mantiene el mismo menú en todo lado
      body: Center(child: Text('$title (en construcción)')),
    );
  }
}
