// screens/finanzas_models.dart
import 'dart:convert';

double _asDouble(dynamic v) {
  if (v == null) return 0.0;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is String) {
    final t = v.trim();
    if (t.isEmpty) return 0.0;
    return double.tryParse(t.replaceAll(',', '.')) ?? 0.0;
  }
  return 0.0;
}

int _asInt(dynamic v) {
  if (v is int) return v;
  if (v is String) return int.tryParse(v) ?? 0;
  if (v is double) return v.toInt();
  return 0;
}

String _asString(dynamic v) => (v ?? '').toString();

DateTime? _asDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String && v.isNotEmpty) {
    // soporta "YYYY-MM-DD" y timestamps ISO
    try {
      return DateTime.parse(v);
    } catch (_) {}
  }
  return null;
}

/// ---------- MODELOS ----------

class EstadoCuentaResponse {
  final EstadoResumen resumen;
  final List<EstadoItem> items;

  EstadoCuentaResponse({required this.resumen, required this.items});

  factory EstadoCuentaResponse.fromJson(Map<String, dynamic> json) {
    final r = json['resumen'] as Map<String, dynamic>? ?? const {};
    final list = (json['items'] as List? ?? const [])
        .map((e) => EstadoItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return EstadoCuentaResponse(
      resumen: EstadoResumen.fromJson(r),
      items: list,
    );
  }

  Map<String, dynamic> toJson() => {
    'resumen': resumen.toJson(),
    'items': items.map((e) => e.toJson()).toList(),
  };
}

class EstadoResumen {
  final double vencido;
  final double porVencer;
  final double sinVencimiento;
  final double total;
  final String? ultimoPago;

  EstadoResumen({
    required this.vencido,
    required this.porVencer,
    required this.sinVencimiento,
    required this.total,
    this.ultimoPago,
  });

  factory EstadoResumen.fromJson(Map<String, dynamic> json) {
    // aceptar alias por si el backend usa otros nombres
    double pick(Map j, List<String> keys) {
      for (final k in keys) {
        if (j.containsKey(k)) return _asDouble(j[k]);
      }
      return 0.0;
    }

    return EstadoResumen(
      vencido: pick(json, ['vencido']),
      porVencer: pick(json, ['por_vencer', 'porVencer']),
      sinVencimiento: pick(json, ['sin_vencimiento', 'sinVencimiento']),
      total: pick(json, ['total', 'monto_total', 'saldo_total']),
      ultimoPago:
          json['ultimo_pago']?.toString() ?? json['ultimoPago']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'vencido': vencido,
    'por_vencer': porVencer,
    'sin_vencimiento': sinVencimiento,
    'total': total,
    'ultimo_pago': ultimoPago,
  };
}

class EstadoItem {
  final int id;
  final String tipo; // expensa | reserva | multa
  final int propiedadId;
  final String nroCasa;
  final DateTime? periodoFecha;
  final DateTime? fechaVenc;
  final double total;
  final double pagado;
  final double saldo;
  final String estado; // pendiente | vencida | pagada

  EstadoItem({
    required this.id,
    required this.tipo,
    required this.propiedadId,
    required this.nroCasa,
    required this.periodoFecha,
    required this.fechaVenc,
    required this.total,
    required this.pagado,
    required this.saldo,
    required this.estado,
  });

  factory EstadoItem.fromJson(Map<String, dynamic> json) {
    // aceptar alias de campos comunes
    double pickD(Map j, List<String> keys) {
      for (final k in keys) {
        if (j.containsKey(k)) return _asDouble(j[k]);
      }
      return 0.0;
    }

    final id = _asInt(json['id']);
    final tipo = _asString(json['tipo']);
    final propiedadId = _asInt(json['propiedad_id'] ?? json['propiedadId']);
    final nroCasa = _asString(json['nro_casa'] ?? json['nroCasa']);

    // fechas (muchos backends devuelven 'periodo_fecha' y 'fecha_venc')
    final periodoFecha = _asDate(
      json['periodo_fecha'] ?? json['periodoFecha'] ?? json['fecha'],
    );
    final fechaVenc = _asDate(
      json['fecha_venc'] ?? json['fechaVenc'] ?? json['fecha_vencimiento'],
    );

    final total = pickD(json, ['total', 'monto_total', 'monto']);
    // algunos servicios exponen 'pagado_sum', 'monto_pagado' o similar
    final pagado = pickD(json, ['pagado', 'pagado_sum', 'monto_pagado']);
    // si no viene 'saldo', lo calculamos
    final saldo = json.containsKey('saldo')
        ? _asDouble(json['saldo'])
        : (total - pagado);

    final estado = _asString(json['estado']);

    return EstadoItem(
      id: id,
      tipo: tipo,
      propiedadId: propiedadId,
      nroCasa: nroCasa,
      periodoFecha: periodoFecha,
      fechaVenc: fechaVenc,
      total: total,
      pagado: pagado,
      saldo: saldo,
      estado: estado,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'tipo': tipo,
    'propiedad_id': propiedadId,
    'nro_casa': nroCasa,
    'periodo_fecha': periodoFecha?.toIso8601String(),
    'fecha_venc': fechaVenc?.toIso8601String(),
    'total': total,
    'pagado': pagado,
    'saldo': saldo,
    'estado': estado,
  };
}
