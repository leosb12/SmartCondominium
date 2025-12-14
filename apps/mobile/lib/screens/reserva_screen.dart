import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';

/// ---------------------------------------------------------------
///  Screen: Crear Reserva de Área Social
///  - Consume directamente Api.I.dio con los endpoints /reservas/*
///  - Valida horas y maneja errores 400/403/409
///  - Muestra Total estimado (precioxhora * horas)
///  - En el éxito, muestra el total real que devuelve el backend
/// ---------------------------------------------------------------
class ReservaScreen extends StatefulWidget {
  const ReservaScreen({super.key});

  @override
  State<ReservaScreen> createState() => _ReservaScreenState();
}

class _ReservaScreenState extends State<ReservaScreen> {
  final _formKey = GlobalKey<FormState>();

  // catálogos
  List<_Area> _areas = [];
  List<_Propiedad> _props = [];
  List<_Hora> _horas = [];

  // selección
  _Area? _selArea;
  _Propiedad? _selProp;
  DateTime _selFecha = DateTime.now();
  _Hora? _selHoraIni;
  _Hora? _selHoraFin;

  // calculado
  double? _totalEstimado; // precioxhora * (fin - ini)

  // estado
  bool _loading = true;
  bool _submitting = false;

  // util
  final _dateFmt = DateFormat('yyyy-MM-dd');

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final dio = Api.I.dio;
      final futures = await Future.wait([
        dio.get('/reservas/areas-disponibles/'),
        dio.get('/reservas/mis-propiedades/'),
        dio.get('/reservas/horas/'),
      ]);

      final areas =
          (futures[0].data['data'] as List? ?? const [])
              .map((e) => _Area.fromJson(e))
              .toList()
            ..sort((a, b) => a.nombre.compareTo(b.nombre));

      final props =
          (futures[1].data['data'] as List? ?? const [])
              .map((e) => _Propiedad.fromJson(e))
              .toList()
            ..sort((a, b) => a.nroCasa.compareTo(b.nroCasa));

      final horas =
          (futures[2].data['data'] as List? ?? const [])
              .map((e) => _Hora.fromJson(e))
              .toList()
            ..sort((a, b) => a.id.compareTo(b.id));

      setState(() {
        _areas = areas;
        _props = props;
        _horas = horas;

        // preselecciones convenientes
        _selArea = _areas.isNotEmpty ? _areas.first : null;
        _selProp = _props.isNotEmpty ? _props.first : null;
        _selHoraIni = _horas.firstWhere(
          (h) => h.id == 8,
          orElse: () => _horas.firstOrNull ?? _Hora(id: 0, valor: '00:00:00'),
        );
        _selHoraFin = _horas.firstWhere(
          (h) => h.id == 10,
          orElse: () =>
              _horas.elementAtOrNull(1) ?? _Hora(id: 1, valor: '01:00:00'),
        );

        _recalcTotal();
      });
    } catch (e) {
      // Si llega a fallar algo, muestra un mensaje visible
      _showSnack('Error cargando datos: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _recalcTotal() {
    if (_selArea == null || _selHoraIni == null || _selHoraFin == null) {
      _totalEstimado = null;
      return;
    }
    final horas = (_selHoraFin!.id - _selHoraIni!.id).toDouble();
    if (horas <= 0) {
      _totalEstimado = null;
      return;
    }
    _totalEstimado = _selArea!.precioXHora * horas;
  }

  Future<void> _pickFecha() async {
    final now = DateTime.now();
    final sel = await showDatePicker(
      context: context,
      initialDate: _selFecha.isBefore(now) ? now : _selFecha,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF60A5FA),
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (sel != null) setState(() => _selFecha = sel);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selArea == null ||
        _selProp == null ||
        _selHoraIni == null ||
        _selHoraFin == null) {
      _showSnack('Completa todos los campos');
      return;
    }

    final ini = _selHoraIni!.id;
    final fin = _selHoraFin!.id;
    if (fin <= ini) {
      _showSnack('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    setState(() => _submitting = true);
    try {
      final dio = Api.I.dio;
      final body = {
        'area_social_id': _selArea!.id,
        'propiedad_id': _selProp!.id,
        'fecha': _dateFmt.format(_selFecha),
        'hora_inicio_id': ini,
        'hora_fin_id': fin,
      };
      final res = await dio.post('/reservas/reservas/', data: body);
      if (!mounted) return;

      if ((res.data is Map) && res.data['status'] == 'success') {
        // mostrar total real si viene en la respuesta (lo calcula un trigger)
        String extra = '';
        final data = res.data['data'];
        if (data is Map && data['total'] != null) {
          final tot = double.tryParse('${data['total']}');
          if (tot != null) {
            extra = '\nTotal: \$${tot.toStringAsFixed(2)}';
          }
        }
        _showDialog(
          title: 'Reserva creada',
          message: 'Tu reserva fue registrada correctamente.$extra',
        );
      } else {
        _showSnack('Respuesta inesperada del servidor');
      }
    } catch (e) {
      if (!mounted) return;
      final msg = _friendlyError(e);
      _showDialog(title: 'No se pudo crear', message: msg);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _friendlyError(dynamic error) {
    try {
      final res = (error as dynamic).response;
      final code = res?.statusCode as int?;
      final data = res?.data;
      final serverMsg = (data is Map && data['message'] != null)
          ? data['message'].toString()
          : null;

      switch (code) {
        case 400:
          return serverMsg ?? 'Datos inválidos';
        case 403:
          return serverMsg ??
              'No tienes permisos para reservar en esa propiedad';
        case 409:
          final codeStr = (data is Map ? (data['code']?.toString() ?? '') : '');
          if (codeStr == 'RESERVA_SOLAPADA') {
            return 'Ese horario ya está ocupado para el área seleccionada.';
          }
          return serverMsg ?? 'Conflicto de datos';
        default:
          return serverMsg ?? 'Error inesperado (${code ?? ''})';
      }
    } catch (_) {
      return 'Error de red o del servidor';
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF1F2937),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Future<void> _showDialog({
    required String title,
    required String message,
  }) async {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        content: Text(
          message,
          style: const TextStyle(color: Color(0xFF9CA3AF)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF60A5FA),
            ),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard({required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: child,
    );
  }

  Widget _buildDropdownField<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
    required String? Function(T?) validator,
    IconData? icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, color: const Color(0xFF60A5FA), size: 18),
              const SizedBox(width: 8),
            ],
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<T>(
          initialValue: value,
          items: items,
          onChanged: onChanged,
          validator: validator,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF374151),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF4B5563)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF4B5563)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF60A5FA), width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
          ),
          dropdownColor: const Color(0xFF374151),
          iconEnabledColor: const Color(0xFF9CA3AF),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // final money = NumberFormat.simpleCurrency(decimalDigits: 2);

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        title: const Text(
          'Reservar Área Social',
          style: TextStyle(
            color: Color(0xFF60A5FA),
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: const Color(0xFF111827),
        iconTheme: const IconThemeData(color: Color(0xFF60A5FA)),
        elevation: 0,
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
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFF60A5FA)),
              )
            : Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header con icono
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F2937),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF374151)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: const BoxDecoration(
                                color: Color(0xFF2563EB),
                                borderRadius: BorderRadius.all(
                                  Radius.circular(12),
                                ),
                              ),
                              child: const Icon(
                                Icons.event_available,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Nueva Reserva',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    'Completa los datos para tu reserva',
                                    style: TextStyle(
                                      color: Color(0xFF9CA3AF),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Propiedad
                      _buildFormCard(
                        child: _buildDropdownField<_Propiedad>(
                          label: 'Propiedad',
                          value: _selProp,
                          icon: Icons.home,
                          items: _props
                              .map(
                                (p) => DropdownMenuItem(
                                  value: p,
                                  child: Text('Casa ${p.nroCasa}'),
                                ),
                              )
                              .toList(),
                          onChanged: (val) => setState(() => _selProp = val),
                          validator: (v) =>
                              v == null ? 'Selecciona tu propiedad' : null,
                        ),
                      ),

                      // Área social (estructura original sin overflow fix)
                      _buildFormCard(
                        child: _buildDropdownField<_Area>(
                          label: 'Área Social',
                          value: _selArea,
                          icon: Icons.pool,
                          items: _areas
                              .map(
                                (a) => DropdownMenuItem(
                                  value: a,
                                  child: Text.rich(
                                    TextSpan(
                                      text: a.nombre,
                                      children: [
                                        const TextSpan(text: '  —  '),
                                        TextSpan(
                                          text:
                                              '\$${a.precioXHora.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                        const TextSpan(
                                          text: '/h',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (val) => setState(() {
                            _selArea = val;
                            _recalcTotal();
                          }),
                          validator: (v) =>
                              v == null ? 'Selecciona un área' : null,
                        ),
                      ),

                      // Fecha
                      _buildFormCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.calendar_today,
                                  color: Color(0xFF60A5FA),
                                  size: 18,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Fecha',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: _pickFecha,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF374151),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF4B5563),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Text(
                                      DateFormat(
                                        'EEEE, dd MMMM yyyy',
                                        'es',
                                      ).format(_selFecha),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const Spacer(),
                                    const Icon(
                                      Icons.arrow_drop_down,
                                      color: Color(0xFF9CA3AF),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Horarios
                      _buildFormCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.access_time,
                                  color: Color(0xFF60A5FA),
                                  size: 18,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Horario',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Inicio',
                                        style: TextStyle(
                                          color: Color(0xFF9CA3AF),
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      DropdownButtonFormField<_Hora>(
                                        initialValue: _selHoraIni,
                                        items: _horas
                                            .map(
                                              (h) => DropdownMenuItem(
                                                value: h,
                                                child: Text(h.display),
                                              ),
                                            )
                                            .toList(),
                                        onChanged: (val) {
                                          setState(() {
                                            _selHoraIni = val;
                                            // si quedó fin <= ini, empuja fin
                                            if (_selHoraFin != null &&
                                                _selHoraFin!.id <=
                                                    _selHoraIni!.id) {
                                              final cand = _horas.firstWhere(
                                                (x) => x.id > _selHoraIni!.id,
                                                orElse: () => _selHoraIni!,
                                              );
                                              _selHoraFin = cand == _selHoraIni
                                                  ? null
                                                  : cand;
                                            }
                                            _recalcTotal();
                                          });
                                        },
                                        validator: (v) =>
                                            v == null ? 'Requerido' : null,
                                        style: const TextStyle(
                                          color: Colors.white,
                                        ),
                                        decoration: InputDecoration(
                                          filled: true,
                                          fillColor: const Color(0xFF374151),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF4B5563),
                                            ),
                                          ),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF4B5563),
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF60A5FA),
                                              width: 2,
                                            ),
                                          ),
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 8,
                                              ),
                                        ),
                                        dropdownColor: const Color(0xFF374151),
                                        iconEnabledColor: const Color(
                                          0xFF9CA3AF,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.only(
                                    top: 16,
                                    left: 8,
                                    right: 8,
                                  ),
                                  child: Icon(
                                    Icons.arrow_forward,
                                    color: Color(0xFF9CA3AF),
                                    size: 20,
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Fin',
                                        style: TextStyle(
                                          color: Color(0xFF9CA3AF),
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      DropdownButtonFormField<_Hora>(
                                        initialValue: _selHoraFin,
                                        items: _horas
                                            .where(
                                              (h) =>
                                                  _selHoraIni == null ||
                                                  h.id > _selHoraIni!.id,
                                            )
                                            .map(
                                              (h) => DropdownMenuItem(
                                                value: h,
                                                child: Text(h.display),
                                              ),
                                            )
                                            .toList(),
                                        onChanged: (val) => setState(() {
                                          _selHoraFin = val;
                                          _recalcTotal();
                                        }),
                                        validator: (v) => v == null
                                            ? 'Requerido'
                                            : (v.id <= (_selHoraIni?.id ?? -1)
                                                  ? 'Debe ser posterior'
                                                  : null),
                                        style: const TextStyle(
                                          color: Colors.white,
                                        ),
                                        decoration: InputDecoration(
                                          filled: true,
                                          fillColor: const Color(0xFF374151),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF4B5563),
                                            ),
                                          ),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF4B5563),
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            borderSide: const BorderSide(
                                              color: Color(0xFF60A5FA),
                                              width: 2,
                                            ),
                                          ),
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 8,
                                              ),
                                        ),
                                        dropdownColor: const Color(0xFF374151),
                                        iconEnabledColor: const Color(
                                          0xFF9CA3AF,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Total estimado
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
                          children: [
                            const Icon(
                              Icons.account_balance_wallet,
                              color: Colors.white,
                              size: 28,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Total Estimado',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _totalEstimado == null
                                  ? '- -'
                                  : '\$${_totalEstimado!.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (_totalEstimado != null && _selArea != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${((_selHoraFin?.id ?? 0) - (_selHoraIni?.id ?? 0))} hora(s) × \$${_selArea!.precioXHora.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Botón crear
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                            disabledBackgroundColor: const Color(0xFF374151),
                          ),
                          child: _submitting
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text(
                                      'Creando reserva...',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.check_circle, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Crear Reserva',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Nota informativa
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F2937),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF374151)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.info_outline,
                              color: Color(0xFF60A5FA),
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Información importante',
                                    style: TextStyle(
                                      color: Color(0xFF9CA3AF),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Los horarios se bloquean automáticamente si se solapan con reservas existentes. Si recibes un error 409, selecciona otro rango horario.',
                                    style: TextStyle(
                                      color: Color(0xFF9CA3AF),
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

/// ----------------- Modelos simples para el screen -----------------
class _Area {
  final int id;
  final String nombre;
  final double precioXHora;

  _Area({required this.id, required this.nombre, required this.precioXHora});

  factory _Area.fromJson(Map<String, dynamic> j) => _Area(
    id: (j['id'] as num).toInt(),
    nombre: (j['nombre'] ?? '').toString(),
    precioXHora: (j['precioxhora'] is num)
        ? (j['precioxhora'] as num).toDouble()
        : double.tryParse('${j['precioxhora'] ?? '0'}') ?? 0.0,
  );
}

class _Propiedad {
  final int id;
  final String nroCasa;

  _Propiedad({required this.id, required this.nroCasa});

  factory _Propiedad.fromJson(Map<String, dynamic> j) => _Propiedad(
    id: (j['id'] as num).toInt(),
    nroCasa: (j['nro_casa'] ?? j['nroCasa'] ?? '').toString(),
  );
}

class _Hora {
  final int id; // coincide con catálogo 'hora'.id
  final String valor; // "HH:mm:ss"

  _Hora({required this.id, required this.valor});

  factory _Hora.fromJson(Map<String, dynamic> j) =>
      _Hora(id: (j['id'] as num).toInt(), valor: (j['valor'] ?? '').toString());

  String get display => valor.length >= 5 ? valor.substring(0, 5) : valor;
}

extension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
  T? elementAtOrNull(int index) =>
      (index >= 0 && index < length) ? this[index] : null;
}
