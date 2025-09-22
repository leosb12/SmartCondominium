import 'package:flutter/material.dart';
import '../core/api.dart';
import 'finanzas_models.dart';
import 'package:url_launcher/url_launcher.dart';

class FinanzasScreen extends StatefulWidget {
  const FinanzasScreen({super.key});
  @override
  State<FinanzasScreen> createState() => _FinanzasScreenState();
}

class _FinanzasScreenState extends State<FinanzasScreen> {
  bool _loading = true;
  String? _error;
  EstadoCuentaResponse? _data;

  // filtros
  String? _tipo; // null | expensa | reserva | multa
  String? _estado; // null | pendiente | vencida | pagada

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
      final r = await Api.I.getEstadoCuenta(
        tipo: _tipo,
        estado: _estado,
        page: 1,
        pageSize: 100,
      );
      setState(() {
        _data = EstadoCuentaResponse.fromJson(r.data as Map<String, dynamic>);
      });
    } catch (e) {
      setState(() => _error = 'No se pudo cargar el estado de cuenta');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pagar(EstadoItem it) async {
    final controller = TextEditingController(text: it.saldo.toStringAsFixed(2));
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PagoBottomSheet(
        tipo: it.tipo,
        docId: it.id,
        saldo: it.saldo,
        controller: controller,
      ),
    );
    if (ok == true) {
      await Future.delayed(const Duration(seconds: 1)); // dar tiempo al webhook
      _load();
    }
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF2563EB) : const Color(0xFF1F2937),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF374151)),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : const Color(0xFF9CA3AF),
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        title: const Text(
          'Finanzas',
          style: TextStyle(color: Color(0xFF60A5FA)),
        ),
        backgroundColor: const Color(0xFF111827),
        iconTheme: const IconThemeData(color: Color(0xFF60A5FA)),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF111827), Color(0xFF000000), Color(0xFF1E3A8A)],
            stops: [0.0, 0.7, 1.0],
          ),
        ),
        child: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? Center(
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.white70),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_data != null) _ResumenCard(_data!.resumen),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _chip('Todos', _tipo == null, () {
                          setState(() => _tipo = null);
                          _load();
                        }),
                        _chip('Expensas', _tipo == 'expensa', () {
                          setState(() => _tipo = 'expensa');
                          _load();
                        }),
                        _chip('Reservas', _tipo == 'reserva', () {
                          setState(() => _tipo = 'reserva');
                          _load();
                        }),
                        _chip('Multas', _tipo == 'multa', () {
                          setState(() => _tipo = 'multa');
                          _load();
                        }),
                        const SizedBox(width: 8),
                        _chip('Pendiente', _estado == 'pendiente', () {
                          setState(() => _estado = 'pendiente');
                          _load();
                        }),
                        _chip('Vencida', _estado == 'vencida', () {
                          setState(() => _estado = 'vencida');
                          _load();
                        }),
                        _chip('Pagada', _estado == 'pagada', () {
                          setState(() => _estado = 'pagada');
                          _load();
                        }),
                        _chip('Todas', _estado == null, () {
                          setState(() => _estado = null);
                          _load();
                        }),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_data != null)
                      ..._data!.items
                          .map((it) => _ItemCard(item: it, onPagar: _pagar))
                          .toList(),
                    if (_data != null && _data!.items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 40),
                        child: Center(
                          child: Text(
                            'Sin deudas por ahora 👌',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ResumenCard extends StatelessWidget {
  const _ResumenCard(this.r);
  final EstadoResumen r;
  @override
  Widget build(BuildContext context) {
    Text _t(String label, double v) => Text(
      '$label: \$${v.toStringAsFixed(2)}',
      style: const TextStyle(
        color: Colors.white,
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Resumen',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          _t('Vencido', r.vencido),
          _t('Por vencer', r.porVencer),
          _t('Sin vencimiento', r.sinVencimiento),
          const Divider(color: Color(0xFF374151)),
          _t('Total', r.total),
          if (r.ultimoPago != null)
            Text(
              'Último pago: ${r.ultimoPago}',
              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
            ),
        ],
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({required this.item, required this.onPagar});
  final EstadoItem item;
  final Future<void> Function(EstadoItem) onPagar;

  Color get _badgeColor {
    switch (item.estado) {
      case 'vencida':
        return const Color(0xFFDC2626);
      case 'pagada':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _badgeColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  item.estado.toUpperCase(),
                  style: TextStyle(
                    color: _badgeColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                item.tipo.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Casa: ${item.nroCasa.isEmpty ? item.propiedadId : item.nroCasa}',
            style: const TextStyle(color: Colors.white, fontSize: 15),
          ),
          const SizedBox(height: 4),
          Text(
            'Período: ${item.periodoFecha.toString().split(" ").first}'
            '${item.fechaVenc != null ? "  •  Vence: ${item.fechaVenc!.toString().split(" ").first}" : ""}',
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Total: \$${item.total.toStringAsFixed(2)}',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(width: 12),
              Text(
                'Pagado: \$${item.pagado.toStringAsFixed(2)}',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const Spacer(),
              Text(
                'Saldo: \$${item.saldo.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (item.saldo > 0)
                ElevatedButton.icon(
                  onPressed: () => onPagar(item),
                  icon: const Icon(Icons.credit_card, size: 18),
                  label: const Text('Pagar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: () async {
                    try {
                      final res = await Api.I.getComprobantes(
                        tipo: item.tipo,
                        id: item.id,
                      );
                      final data = res.data as Map<String, dynamic>;
                      final list = (data['results'] as List?) ?? [];
                      if (list.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('No hay comprobantes aún'),
                          ),
                        );
                        return;
                      }
                      final first = list.first as Map<String, dynamic>;
                      final url = (first['receipt_url'] ?? '').toString();
                      if (url.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Comprobante no disponible'),
                          ),
                        );
                        return;
                      }
                      final ok = await launchUrl(
                        Uri.parse(url),
                        mode: LaunchMode.externalApplication,
                      );
                      if (!ok) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('No se pudo abrir el comprobante'),
                          ),
                        );
                      }
                    } catch (_) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Error al obtener comprobante'),
                        ),
                      );
                    }
                  },
                  icon: const Icon(
                    Icons.receipt_long,
                    size: 18,
                    color: Color(0xFF60A5FA),
                  ),
                  label: const Text(
                    'Comprobante',
                    style: TextStyle(color: Color(0xFF60A5FA)),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF60A5FA)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PagoBottomSheet extends StatefulWidget {
  const _PagoBottomSheet({
    required this.tipo,
    required this.docId,
    required this.saldo,
    required this.controller,
  });
  final String tipo;
  final int docId;
  final double saldo;
  final TextEditingController controller;

  @override
  State<_PagoBottomSheet> createState() => _PagoBottomSheetState();
}

class _PagoBottomSheetState extends State<_PagoBottomSheet> {
  bool _loading = false;
  String? _error;

  // Datos falsos de la tarjeta (no editables)
  final String _cardNumber = '4242 4242 4242 4242';
  final String _expiryDate = '12/28';
  final String _cvv = '123';
  final String _cardHolder = 'Juan Pérez';

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final txt = widget.controller.text.trim();
      final monto = double.tryParse(txt);
      final res = await Api.I.crearOrdenPago(
        tipo: widget.tipo,
        id: widget.docId,
        montoParcial: (monto != null && monto > 0 && monto < widget.saldo)
            ? monto
            : null,
      );
      final data = res.data as Map<String, dynamic>;
      final status = (data['status'] ?? '').toString();
      if (status == 'succeeded' || status == 'processing') {
        if (!mounted) return;
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              status == 'succeeded' ? 'Pago realizado' : 'Pago procesándose…',
            ),
          ),
        );
      } else {
        setState(() => _error = 'Estado: $status');
      }
    } catch (e) {
      setState(() => _error = 'No se pudo crear el pago');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _buildCardField({
    required String label,
    required String value,
    required IconData icon,
    bool isLast = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          decoration: BoxDecoration(
            color: const Color(0x4D374151),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF4B5563)),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF9CA3AF), size: 18),
              const SizedBox(width: 12),
              Text(
                value,
                style: TextStyle(
                  color: const Color(0xFF9CA3AF),
                  fontSize: 16,
                  letterSpacing: label == 'Número de tarjeta' ? 1.2 : 0.0,
                ),
              ),
            ],
          ),
        ),
        if (!isLast) const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF111827),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          // Handle indicator
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            height: 4,
            width: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF4B5563),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.credit_card,
                    color: Color(0xFF60A5FA),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Confirmar pago',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Revisa los detalles de tu tarjeta',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context, false),
                  icon: const Icon(Icons.close, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Monto a pagar
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF374151)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Monto a pagar',
                          style: TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        TextField(
                          controller: widget.controller,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: const InputDecoration(
                            hintText: 'Monto (vacío = saldo completo)',
                            hintStyle: TextStyle(
                              color: Color(0xFF6B7280),
                              fontSize: 16,
                              fontWeight: FontWeight.normal,
                            ),
                            border: InputBorder.none,
                            prefix: Text(
                              '\$ ',
                              style: TextStyle(
                                color: Color(0xFF60A5FA),
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        Text(
                          'Saldo disponible: \$${widget.saldo.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Título de método de pago
                  const Row(
                    children: [
                      Icon(Icons.lock, color: Color(0xFF10B981), size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Método de pago seguro',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Tarjeta visual
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'VISA',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 2,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'TEST',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Text(
                          _cardNumber,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TITULAR',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _cardHolder.toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text(
                                  'VENCE',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _expiryDate,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Campos de información (no editables)
                  _buildCardField(
                    label: 'Número de tarjeta',
                    value: _cardNumber,
                    icon: Icons.credit_card,
                  ),

                  Row(
                    children: [
                      Expanded(
                        child: _buildCardField(
                          label: 'Fecha de vencimiento',
                          value: _expiryDate,
                          icon: Icons.calendar_today,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildCardField(
                          label: 'CVV',
                          value: _cvv,
                          icon: Icons.lock,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  _buildCardField(
                    label: 'Nombre del titular',
                    value: _cardHolder,
                    icon: Icons.person,
                    isLast: true,
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFDC2626)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Color(0xFFDC2626),
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Color(0xFFDC2626)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Botones de acción
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFF1F2937),
              border: Border(
                top: BorderSide(color: Color(0xFF374151), width: 1),
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading
                          ? null
                          : () => Navigator.pop(context, false),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF6B7280)),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Cancelar',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.security, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'Pagar ahora',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
