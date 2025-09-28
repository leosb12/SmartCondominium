import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/token_storage.dart';
import '../main.dart';

class MenuDashboard extends StatefulWidget {
  const MenuDashboard({super.key});
  @override
  State<MenuDashboard> createState() => _MenuDashboardState();
}

class _MenuDashboardState extends State<MenuDashboard> {
  bool _loading = false;
  String _fullName = '';
  String _email = '';

  @override
  void initState() {
    super.initState();
    _loadMe();
  }

  Future<void> _loadMe() async {
    setState(() => _loading = true);
    try {
      final res = await Api.I.me(); // Authorization lo pone el interceptor
      final d = res.data as Map<String, dynamic>;
      _fullName = (d['full_name'] ?? '') as String;
      _email = (d['email'] ?? '') as String;
    } catch (_) {
      await TokenStorage.I.clear();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, Routes.login, (_) => false);
      return;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Cerrar sesión',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        content: const Text(
          '¿Estás seguro que deseas cerrar sesión?',
          style: TextStyle(color: Color(0xFF9ca3af)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Cancelar',
              style: TextStyle(color: Color(0xFF9ca3af)),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await TokenStorage.I.clear();
              if (!mounted) return;
              Navigator.pushNamedAndRemoveUntil(
                context,
                Routes.login,
                (_) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFdc2626),
              foregroundColor: Colors.white,
            ),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }

  void _go(String route) {
    Navigator.pop(context); // cierra el drawer
    Navigator.pushReplacementNamed(context, route);
  }

  @override
  Widget build(BuildContext context) {
    final items = <({String route, String label, IconData icon, Color color})>[
      (
        route: Routes.home,
        label: 'Dashboard',
        icon: Icons.home_outlined,
        color: const Color(0xFF60a5fa),
      ),
      (
        route: Routes.areasComunes,
        label: 'Áreas Comunes',
        icon: Icons.apartment_outlined,
        color: const Color(0xFFf59e0b),
      ),
      (
        route: Routes.finanzas,
        label: 'Finanzas',
        icon: Icons.attach_money,
        color: const Color(0xFF059669),
      ),
      (
        route: Routes.comunicacion,
        label: 'Comunicación',
        icon: Icons.forum_outlined,
        color: const Color(0xFF2563eb),
      ),
      (
        route: Routes.authSeg,
        label: 'Autenticación y Seguridad',
        icon: Icons.verified_user_outlined,
        color: const Color(0xFF6366f1),
      ),
    ];

    final initial =
        (_fullName.isNotEmpty ? _fullName : (_email.isNotEmpty ? _email : 'U'))
            .trim()
            .characters
            .first
            .toUpperCase();

    return Drawer(
      backgroundColor: const Color(0xFF111827),
      child: SafeArea(
        child: Column(
          children: [
            // Header del drawer
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF2563eb), Color(0xFF1d4ed8)],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.apartment,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Text(
                          'Smart Condominium',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_loading)
                    const Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Cargando información...',
                          style: TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                      ],
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _fullName.isNotEmpty ? _fullName : 'Usuario',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _email.isEmpty ? 'Torre A - Apt 504' : _email,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                ],
              ),
            ),

            // Lista de opciones
            Expanded(
              child: Container(
                color: const Color(0xFF111827),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: items.length,
                  itemBuilder: (_, i) {
                    final item = items[i];
                    return Container(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 4,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: item.color.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(item.icon, color: item.color, size: 22),
                        ),
                        title: Text(
                          item.label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        trailing: const Icon(
                          Icons.chevron_right,
                          color: Color(0xFF9ca3af),
                          size: 20,
                        ),
                        onTap: () => _go(item.route),
                      ),
                    );
                  },
                ),
              ),
            ),

            // Footer con usuario y logout
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF1f2937),
                border: Border(
                  top: BorderSide(color: Color(0xFF374151), width: 1),
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: const Color(0xFF2563eb),
                    child: Text(
                      initial,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _fullName.isNotEmpty ? _fullName : 'Usuario',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Residente',
                          style: const TextStyle(
                            color: Color(0xFF9ca3af),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _logout,
                    icon: const Icon(
                      Icons.logout,
                      color: Color(0xFFdc2626),
                      size: 22,
                    ),
                    tooltip: 'Cerrar sesión',
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFdc2626).withOpacity(0.1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}