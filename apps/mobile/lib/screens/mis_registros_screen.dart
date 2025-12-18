import 'package:flutter/material.dart';

import '../core/api.dart';

class MisRegistrosScreen extends StatefulWidget {
  const MisRegistrosScreen({super.key});

  @override
  State<MisRegistrosScreen> createState() => _MisRegistrosScreenState();
}

class _MisRegistrosScreenState extends State<MisRegistrosScreen> {
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _autos = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await Api.I.getMisRegistros();
      final root = (res.data as Map).cast<String, dynamic>();
      final data = (root['data'] as Map?)?.cast<String, dynamic>() ?? const {};

      final autosRaw = (data['autos'] is List) ? data['autos'] as List : const [];

      _autos = autosRaw
          .whereType<Map>()
          .map((e) => e.cast<String, dynamic>())
          .toList(growable: false);
    } catch (_) {
      _error = 'No se pudo cargar tus vehículos.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0b1220),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Volver',
        ),
        title: const Text('Mis Vehículos'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar',
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2563eb)),
              ),
            )
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _SectionTitle(
                        icon: Icons.directions_car,
                        title: 'Vehículos Registrados',
                        subtitle: 'Para control de acceso con OCR',
                      ),
                      const SizedBox(height: 8),
                      if (_autos.isEmpty)
                        const _EmptyHint(
                            text:
                                'No tienes vehículos registrados. Registra tu auto para el control de acceso.')
                      else
                        ..._autos.map(_AutoCard.new),
                      const SizedBox(height: 24),
                      const _NoteBox(
                        text:
                            'ℹ️ Importante: Estos vehículos están registrados para el control de acceso automático por OCR. Si necesitas modificar algún dato, contacta a la administración.',
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _SectionTitle({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF2563eb).withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: const Color(0xFF60a5fa), size: 22),
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
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
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
      ],
    );
  }
}

class _AutoCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const _AutoCard(this.data);

  @override
  Widget build(BuildContext context) {
    final placa = (data['placa'] ?? '—').toString();
    final modelo = (data['modelo'] ?? '').toString();
    final marca = (data['marca'] ?? '').toString();
    final nroCasa = (data['nro_casa'] ?? '').toString();
    final nombrePropietario = (data['nombre_propietario'] ?? '').toString();
    final apellidoPropietario = (data['apellido_propietario'] ?? '').toString();
    final telefonoContacto = (data['telefono_contacto'] ?? '').toString();

    final subtitle = [
      if (marca.isNotEmpty) marca,
      if (modelo.isNotEmpty) modelo,
    ].join(' • ');

    final hasOwnerInfo = nombrePropietario.isNotEmpty || apellidoPropietario.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1f2937)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.directions_car,
                    color: Color(0xFF34d399),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Placa',
                        style: TextStyle(
                          color: Color(0xFF9ca3af),
                          fontSize: 11,
                        ),
                      ),
                      Text(
                        placa,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              subtitle.isEmpty ? '—' : subtitle,
              style: const TextStyle(
                color: Color(0xFF9ca3af),
                fontSize: 13,
              ),
            ),
            if (nroCasa.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Casa: $nroCasa',
                style: const TextStyle(
                  color: Color(0xFF9ca3af),
                  fontSize: 11,
                ),
              ),
            ],
            if (hasOwnerInfo) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.only(top: 12),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Color(0xFF1f2937)),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Propietario',
                      style: TextStyle(
                        color: Color(0xFF9ca3af),
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$nombrePropietario $apellidoPropietario',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                    if (telefonoContacto.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.phone,
                            color: Color(0xFF9ca3af),
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            telefonoContacto,
                            style: const TextStyle(
                              color: Color(0xFF9ca3af),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String text;

  const _EmptyHint({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1f2937)),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Color(0xFF9ca3af)),
      ),
    );
  }
}

class _NoteBox extends StatelessWidget {
  final String text;

  const _NoteBox({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1f2937),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, color: Color(0xFF9ca3af), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Color(0xFF9ca3af)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Color(0xFFf87171), size: 38),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(color: Colors.white),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563eb),
                foregroundColor: Colors.white,
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
