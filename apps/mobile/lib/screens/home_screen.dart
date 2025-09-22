import 'package:flutter/material.dart';
import '../widgets/menu_dashboard.dart';
import '../main.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        title: const Text(
          'Smart Condominium',
          style: TextStyle(
            color: Color(0xFF60a5fa),
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        iconTheme: const IconThemeData(color: Color(0xFF60a5fa)),
      ),
      drawer: const MenuDashboard(),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF111827), Color(0xFF000000), Color(0xFF1e3a8a)],
            stops: [0.0, 0.7, 1.0],
          ),
        ),
        child: const _HomeContent(),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Hero / cabecera de bienvenida
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF2563eb), Color(0xFF1d4ed8)],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2563eb).withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
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
                        Icons.home,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bienvenido a casa',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'Torre A - Apartamento 504',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Gestiona tu hogar de forma inteligente y mantente conectado con tu comunidad.',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 16,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),

                // Chips de acceso rápido
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _QuickChip(
                      icon: Icons.forum_outlined,
                      label: 'Comunicados',
                      onTap: () =>
                          Navigator.pushNamed(context, Routes.comunicacion),
                    ),
                    _QuickChip(
                      icon: Icons.calendar_month_outlined,
                      label: 'Reservas',
                      onTap: () =>
                          Navigator.pushNamed(context, Routes.areasComunes),
                    ),
                    _QuickChip(
                      icon: Icons.attach_money,
                      label: 'Pagos',
                      onTap: () =>
                          Navigator.pushNamed(context, Routes.finanzas),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Sección de servicios principales
          const Text(
            'Servicios principales',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),

          // Grid de servicios
          Row(
            children: [
              Expanded(
                child: _ServiceCard(
                  title: 'Áreas Comunes',
                  subtitle: 'Reserva espacios',
                  icon: Icons.apartment_outlined,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF047857)],
                  ),
                  onTap: () =>
                      Navigator.pushNamed(context, Routes.areasComunes),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _ServiceCard(
                  title: 'Residentes',
                  subtitle: 'Directorio',
                  icon: Icons.groups_outlined,
                  gradient: const LinearGradient(
                    colors: [Color(0xFFdc2626), Color(0xFFb91c1c)],
                  ),
                  onTap: () => Navigator.pushNamed(context, Routes.residentes),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ServiceCard(
                  title: 'Mantenimiento',
                  subtitle: 'Reportar issues',
                  icon: Icons.build_outlined,
                  gradient: const LinearGradient(
                    colors: [Color(0xFFd97706), Color(0xFFb45309)],
                  ),
                  onTap: () =>
                      Navigator.pushNamed(context, Routes.mantenimiento),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _ServiceCard(
                  title: 'Seguridad',
                  subtitle: 'Acceso y reglas',
                  icon: Icons.shield_outlined,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF7c3aed), Color(0xFF6d28d9)],
                  ),
                  onTap: () => Navigator.pushNamed(context, Routes.seguridad),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Sección de estado actual
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1f2937),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF374151), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10b981).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.check_circle_outline,
                        color: Color(0xFF10b981),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Estado del condominio',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _StatusItem(
                  icon: Icons.water_drop_outlined,
                  title: 'Suministro de agua',
                  status: 'Normal',
                  statusColor: const Color(0xFF10b981),
                ),
                _StatusItem(
                  icon: Icons.electrical_services_outlined,
                  title: 'Sistema eléctrico',
                  status: 'Operativo',
                  statusColor: const Color(0xFF10b981),
                ),
                _StatusItem(
                  icon: Icons.elevator_outlined,
                  title: 'Ascensores',
                  status: '2 de 3 funcionando',
                  statusColor: const Color(0xFFf59e0b),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Avisos importantes
          const Text(
            'Avisos importantes',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          const _NewsTile(
            title: 'Reunión de propietarios',
            subtitle: 'Viernes 25 de octubre - 19:00h en salón social',
            icon: Icons.groups_2_outlined,
            priority: true,
          ),
          const _NewsTile(
            title: 'Mantenimiento preventivo',
            subtitle: 'Próximo sábado - Sistema de bombas de agua',
            icon: Icons.water_drop_outlined,
            priority: false,
          ),
          const _NewsTile(
            title: 'Nueva normativa de mascotas',
            subtitle: 'Consulta las nuevas reglas en el área de comunicación',
            icon: Icons.pets_outlined,
            priority: false,
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Gradient gradient;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const Spacer(),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white70,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusItem extends StatelessWidget {
  const _StatusItem({
    required this.icon,
    required this.title,
    required this.status,
    required this.statusColor,
  });

  final IconData icon;
  final String title;
  final String status;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF9ca3af), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: statusColor,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NewsTile extends StatelessWidget {
  const _NewsTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.priority,
  });
  final String title;
  final String subtitle;
  final IconData icon;
  final bool priority;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1f2937),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: priority ? const Color(0xFFf59e0b) : const Color(0xFF374151),
          width: priority ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: priority
                  ? const Color(0xFFf59e0b).withOpacity(0.2)
                  : const Color(0xFF60a5fa).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: priority
                  ? const Color(0xFFf59e0b)
                  : const Color(0xFF60a5fa),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF9ca3af),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (priority)
            const Icon(Icons.priority_high, color: Color(0xFFf59e0b), size: 16),
        ],
      ),
    );
  }
}
