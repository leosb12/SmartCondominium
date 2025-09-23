import 'package:flutter/material.dart';
import '../widgets/menu_dashboard.dart';
import '../main.dart';

class ComunicacionScreen extends StatelessWidget {
  const ComunicacionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    Widget hero = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1F2937).withOpacity(0.6)),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Color(0x99172554),
            Color(0x66121A2B),
            Color(0x3306080F),
          ],
        ),
      ),
      padding: const EdgeInsets.all(22),
      child: Text(
        'Gestiona la comunicación entre administración y residentes',
        style: t.bodyMedium?.copyWith(color: const Color(0xFFCBD5E1)),
      ),
    );

    Widget mensajesCard = _CardButton(
      leadingIcon: const Icon(
        Icons.mark_chat_unread_rounded,
        size: 28,
        color: Color(0xFF60A5FA),
      ),
      title: 'Mensajes',
      desc: 'Envía, recibe y administra mensajes y avisos del condominio.',
      onTap: () => Navigator.of(context).pushNamed(Routes.comunicacionMensajes),
      // Para aislar el problema de rutas, prueba esto:
      // onTap: () => Navigator.of(context).push(
      //   MaterialPageRoute(builder: (_) => const MensajesScreen()),
      // ),
    );

    Widget grid = LayoutBuilder(
      builder: (context, constraints) {
        int cross = 1;
        if (constraints.maxWidth >= 1200) cross = 3;
        else if (constraints.maxWidth >= 640) cross = 2;

        return GridView.count(
          crossAxisCount: cross,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [mensajesCard],
        );
      },
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1220),
        elevation: 0,
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A8A).withOpacity(0.35),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF60A5FA).withOpacity(0.35)),
              ),
              child: const Icon(Icons.forum_outlined,
                  color: Color(0xFF60A5FA), size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              'Comunicación',
              style: t.titleLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      drawer: const MenuDashboard(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          children: [
            Text(
              'Centro de mensajes del condominio',
              style: t.bodyMedium?.copyWith(color: const Color(0xFF93C5FD)),
            ),
            const SizedBox(height: 16),
            hero,
            const SizedBox(height: 18),
            grid,
          ],
        ),
      ),
    );
  }
}

class _CardButton extends StatefulWidget {
  final Widget leadingIcon;
  final String title;
  final String desc;
  final VoidCallback onTap;
  const _CardButton({
    required this.leadingIcon,
    required this.title,
    required this.desc,
    required this.onTap,
  });

    @override
    State<_CardButton> createState() => _CardButtonState();
}

class _CardButtonState extends State<_CardButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    final border = Border.all(
      color: _hover
          ? const Color(0xFF2563EB).withOpacity(0.6)
          : const Color(0xFF1F2937).withOpacity(0.7),
    );

    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: _hover
          ? [const Color(0xFF172554), const Color(0xFF0B1220)]
          : [const Color(0xFF0A0F1A), const Color(0xFF06080F)],
    );

    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        transform: Matrix4.identity()..scale(_hover ? 1.01 : 1.0),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(18),
          border: border,
          boxShadow: [
            if (_hover)
              BoxShadow(
                color: const Color(0xFF2563EB).withOpacity(0.20),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
          ],
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: widget.onTap,
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withOpacity(0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF60A5FA).withOpacity(0.30),
                        ),
                      ),
                      child: Center(child: widget.leadingIcon),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        widget.title,
                        style: t.titleMedium?.copyWith(
                          color: _hover
                              ? const Color(0xFF60A5FA)
                              : const Color(0xFFE2E8F0),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  widget.desc,
                  style: t.bodySmall?.copyWith(
                    color: const Color(0xFF94A3B8),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}