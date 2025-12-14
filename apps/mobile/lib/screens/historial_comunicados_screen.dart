import 'dart:async';
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/menu_dashboard.dart';

class Author {
  final String id;
  final String firstName;
  final String lastName;
  final String fullName;
  const Author({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.fullName,
  });

  factory Author.fromJson(Map<String, dynamic> d) {
    return Author(
      id: (d['id'] ?? '').toString(),
      firstName: (d['first_name'] ?? '').toString(),
      lastName: (d['last_name'] ?? '').toString(),
      fullName: (d['full_name'] ?? '').toString(),
    );
  }
}

class Comunicado {
  final String id;
  final String titulo;
  final String contenido;
  final String? portadaUrl;
  final Author? author;
  final String createdAt;
  final String updatedAt;
  final String publishedAt;
  final String? scheduledFor;
  final String? expiresAt;

  const Comunicado({
    required this.id,
    required this.titulo,
    required this.contenido,
    required this.portadaUrl,
    required this.author,
    required this.createdAt,
    required this.updatedAt,
    required this.publishedAt,
    required this.scheduledFor,
    required this.expiresAt,
  });

  factory Comunicado.fromJson(Map<String, dynamic> d) {
    Author? a;
    if (d['author'] is Map) {
      a = Author.fromJson((d['author'] as Map).cast<String, dynamic>());
    }
    return Comunicado(
      id: (d['id'] ?? '').toString(),
      titulo: (d['titulo'] ?? '').toString(),
      contenido: (d['contenido'] ?? '').toString(),
      portadaUrl: (d['portada_url'] as String?)?.toString(),
      author: a,
      createdAt: (d['created_at'] ?? '').toString(),
      updatedAt: (d['updated_at'] ?? '').toString(),
      publishedAt: (d['published_at'] ?? '').toString(),
      scheduledFor: (d['scheduled_for'] as String?)?.toString(),
      expiresAt: (d['expires_at'] as String?)?.toString(),
    );
  }
}

class HistorialComunicadosScreen extends StatefulWidget {
  const HistorialComunicadosScreen({super.key});

  @override
  State<HistorialComunicadosScreen> createState() =>
      _HistorialComunicadosScreenState();
}

class _HistorialComunicadosScreenState
    extends State<HistorialComunicadosScreen> {
  // Datos
  List<Comunicado> _comunicados = [];

  // Estado
  bool _loading = false;
  String? _error;

  // Filtros (mismos del web)
  String _searchTerm = '';
  String _authorName = '';
  DateTime? _publishedFrom;
  DateTime? _publishedTo;

  // Paginación
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasNext = false;
  bool _hasPrevious = false;
  final int _pageSize = 8;

  // Debounce para inputs de texto
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _fetchComunicados(1);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _debounced(void Function() apply) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      apply();
      _fetchComunicados(1);
    });
  }

  Future<void> _fetchComunicados(int page) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final qp = <String, dynamic>{'page': '$page', 'page_size': '$_pageSize'};
      if (_searchTerm.trim().isNotEmpty) qp['search'] = _searchTerm.trim();
      if (_authorName.trim().isNotEmpty) qp['author_name'] = _authorName.trim();
      if (_publishedFrom != null)
        qp['published_from'] = _toIsoMinute(_publishedFrom!);
      if (_publishedTo != null)
        qp['published_to'] = _toIsoMinute(_publishedTo!);

      final res = await Api.I.dio.get(
        '/historial-comunicados/',
        queryParameters: qp,
      );
      final data = res.data;

      List results = const [];
      int count = 0;
      String? next;
      String? previous;

      if (data is Map<String, dynamic>) {
        results = (data['results'] is List)
            ? (data['results'] as List)
            : <dynamic>[];
        count = (data['count'] is int)
            ? data['count'] as int
            : int.tryParse('${data['count']}') ?? results.length;
        next = data['next']?.toString();
        previous = data['previous']?.toString();
      } else if (data is List) {
        results = data;
        count = results.length;
      }

      final comunicados = results
          .map((e) => Comunicado.fromJson((e as Map).cast<String, dynamic>()))
          .toList();

      setState(() {
        _comunicados = comunicados;
        _hasNext = (next != null && next.isNotEmpty);
        _hasPrevious = (previous != null && previous.isNotEmpty);
        _totalPages = (_pageSize > 0)
            ? ((count + _pageSize - 1) ~/ _pageSize)
            : 1;
        _currentPage = page;
      });
    } catch (e) {
      setState(() {
        _error = 'Error cargando comunicados';
        _comunicados = [];
        _hasNext = false;
        _hasPrevious = false;
        _totalPages = 1;
        _currentPage = 1;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _two(int x) => x.toString().padLeft(2, '0');

  // Mismo formato que <input type="datetime-local" /> (sin segundos)
  String _toIsoMinute(DateTime dt) {
    final d = dt.toLocal();
    return '${d.year}-${_two(d.month)}-${_two(d.day)}T${_two(d.hour)}:${_two(d.minute)}';
  }

  String _formatDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      return '${_two(d.day)}/${_two(d.month)}/${d.year} ${_two(d.hour)}:${_two(d.minute)}';
    } catch (_) {
      return s;
    }
  }

  String _truncate(String s, [int max = 150]) =>
      s.length <= max ? s : '${s.substring(0, max)}...';

  Future<void> _pickDateTime({required bool from}) async {
    final now = DateTime.now();
    final initial = from ? (_publishedFrom ?? now) : (_publishedTo ?? now);

    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDate: initial,
      helpText: from ? 'Desde' : 'Hasta',
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF3B82F6),
            surface: Color(0xFF0B1220),
            onSurface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (date == null) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF3B82F6),
            surface: Color(0xFF0B1220),
            onSurface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (time == null) return;

    final dt = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (from) {
        _publishedFrom = dt;
      } else {
        _publishedTo = dt;
      }
    });
    _fetchComunicados(1);
  }

  void _clearFilters() {
    setState(() {
      _searchTerm = '';
      _authorName = '';
      _publishedFrom = null;
      _publishedTo = null;
      _currentPage = 1;
    });
    _fetchComunicados(1);
  }

  void _viewComunicado(Comunicado c) {
    final isExpired = c.expiresAt != null && c.expiresAt!.isNotEmpty
        ? DateTime.tryParse(c.expiresAt!)?.isBefore(DateTime.now().toUtc()) ??
              false
        : false;

    showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (ctx) {
        return Dialog(
          backgroundColor: const Color(0xFF0A0F1A),
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 24,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Portada
              if (c.portadaUrl != null && c.portadaUrl!.isNotEmpty)
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                  child: Stack(
                    children: [
                      AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Image.network(
                          c.portadaUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFF111827),
                            child: const Center(
                              child: Icon(
                                Icons.image_not_supported_outlined,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (isExpired)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'Expirado',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Título
                      Text(
                        c.titulo,
                        style: const TextStyle(
                          color: Color(0xFFE2E8F0),
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Metadatos
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.schedule,
                                size: 16,
                                color: Color(0xFF94A3B8),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Publicado: ${_formatDate(c.publishedAt)}',
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          if (c.author?.fullName != null &&
                              c.author!.fullName.isNotEmpty)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.person_outline,
                                  size: 16,
                                  color: Color(0xFF94A3B8),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Por: ${c.author!.fullName}',
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          if (c.expiresAt != null && c.expiresAt!.isNotEmpty)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.calendar_today_outlined,
                                  size: 16,
                                  color: Color(0xFF94A3B8),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${isExpired ? "Expiró" : "Expira"}: ${_formatDate(c.expiresAt!)}',
                                  style: TextStyle(
                                    color: isExpired
                                        ? const Color(0xFFF59E0B)
                                        : const Color(0xFF94A3B8),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Contenido completo
                      Text(
                        c.contenido,
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
              // Botón Cerrar
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF334155)),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Cerrar'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1220),
        title: const Text('Historial de comunicados'),
      ),
      drawer: const MenuDashboard(),
      body: SafeArea(
        child: RefreshIndicator(
          color: const Color(0xFF3B82F6),
          onRefresh: () => _fetchComunicados(_currentPage),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            children: [
              // Panel de filtros
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A0F1A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1F2937)),
                ),
                child: Column(
                  children: [
                    // Búsqueda
                    Row(
                      children: [
                        const Icon(
                          Icons.search,
                          color: Color(0xFF94A3B8),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            decoration: const InputDecoration(
                              hintText:
                                  'Buscar comunicados por título o contenido...',
                              hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                              border: InputBorder.none,
                            ),
                            style: const TextStyle(color: Color(0xFFE2E8F0)),
                            onChanged: (v) => _debounced(() => _searchTerm = v),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Filtros
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FilterChipBox(
                          label: 'Desde',
                          value: _publishedFrom == null
                              ? '—'
                              : _toIsoMinute(_publishedFrom!),
                          icon: Icons.calendar_today_outlined,
                          onTap: () => _pickDateTime(from: true),
                          onClear: _publishedFrom == null
                              ? null
                              : () {
                                  setState(() => _publishedFrom = null);
                                  _fetchComunicados(1);
                                },
                        ),
                        _FilterChipBox(
                          label: 'Hasta',
                          value: _publishedTo == null
                              ? '—'
                              : _toIsoMinute(_publishedTo!),
                          icon: Icons.calendar_today_outlined,
                          onTap: () => _pickDateTime(from: false),
                          onClear: _publishedTo == null
                              ? null
                              : () {
                                  setState(() => _publishedTo = null);
                                  _fetchComunicados(1);
                                },
                        ),
                        _TextEntryBox(
                          label: 'Autor (nombre o apellido)',
                          hint: 'Ej: Leonardo, Serrate...',
                          onChanged: (v) => _debounced(() => _authorName = v),
                        ),
                        OutlinedButton.icon(
                          onPressed: _clearFilters,
                          icon: const Icon(
                            Icons.filter_alt_off,
                            size: 18,
                            color: Color(0xFFE2E8F0),
                          ),
                          label: const Text(
                            'Limpiar filtros',
                            style: TextStyle(color: Color(0xFFE2E8F0)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF334155)),
                            backgroundColor: const Color(0xFF0B1220),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Loading / Error
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFF60A5FA),
                      ),
                    ),
                  ),
                ),
              if (!_loading && _error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF7F1D1D),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF991B1B)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFFCA5A5)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Color(0xFFFCA5A5)),
                        ),
                      ),
                      IconButton(
                        onPressed: () => setState(() => _error = null),
                        icon: const Icon(Icons.close, color: Color(0xFFFCA5A5)),
                      ),
                    ],
                  ),
                ),

              // Lista de comunicados
              if (!_loading && _error == null && _comunicados.isNotEmpty)
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _comunicados.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 1,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    // Más alto para evitar overflow cuando el contenido es largo
                    childAspectRatio: 0.9,
                  ),
                  itemBuilder: (context, i) {
                    final c = _comunicados[i];
                    return _ComunicadoCard(
                      comunicado: c,
                      formatDate: _formatDate,
                      truncate: _truncate,
                      onView: () => _viewComunicado(c),
                    );
                  },
                ),

              // Sin resultados
              if (!_loading && _error == null && _comunicados.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 28),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 48,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No se encontraron comunicados',
                        style: t.titleMedium?.copyWith(
                          color: const Color(0xFFCBD5E1),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Intenta ajustar los filtros de búsqueda',
                        style: t.bodySmall?.copyWith(
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),

              // Paginación
              if (!_loading && _error == null && _totalPages > 1)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _hasPrevious
                              ? () => _fetchComunicados(_currentPage - 1)
                              : null,
                          icon: const Icon(Icons.chevron_left),
                          label: const Text('Anterior'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            disabledForegroundColor: const Color(0xFF6B7280),
                            side: const BorderSide(color: Color(0xFF334155)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Página $_currentPage de $_totalPages',
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _hasNext
                              ? () => _fetchComunicados(_currentPage + 1)
                              : null,
                          icon: const Icon(Icons.chevron_right),
                          label: const Text('Siguiente'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            disabledForegroundColor: const Color(0xFF6B7280),
                            side: const BorderSide(color: Color(0xFF334155)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChipBox extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback? onClear;
  const _FilterChipBox({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final hasValue = value != '—';
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1220),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: const Color(0xFF94A3B8)),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: Color(0xFFE2E8F0),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            if (hasValue && onClear != null) ...[
              const SizedBox(width: 6),
              InkWell(
                onTap: onClear,
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.all(4.0),
                  child: Icon(Icons.close, size: 16, color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TextEntryBox extends StatelessWidget {
  final String label;
  final String hint;
  final ValueChanged<String> onChanged;
  const _TextEntryBox({
    required this.label,
    required this.hint,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 260),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
          ),
          const SizedBox(height: 6),
          TextField(
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFF0B1220),
              enabledBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Color(0xFF334155)),
                borderRadius: BorderRadius.circular(10),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                borderRadius: BorderRadius.circular(10),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
            ),
            style: const TextStyle(color: Color(0xFFE2E8F0)),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

class _ComunicadoCard extends StatelessWidget {
  final Comunicado comunicado;
  final String Function(String) formatDate;
  final String Function(String, [int]) truncate;
  final VoidCallback onView;

  const _ComunicadoCard({
    required this.comunicado,
    required this.formatDate,
    required this.truncate,
    required this.onView,
  });

  @override
  Widget build(BuildContext context) {
    final isExpired =
        comunicado.expiresAt != null && comunicado.expiresAt!.isNotEmpty
        ? DateTime.tryParse(
                comunicado.expiresAt!,
              )?.isBefore(DateTime.now().toUtc()) ??
              false
        : false;
    final authorName = comunicado.author?.fullName ?? 'Autor desconocido';

    return InkWell(
      onTap: onView,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0A0F1A),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isExpired
                ? const Color(0xFFF59E0B).withOpacity(0.5)
                : const Color(0xFF1F2937),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            // Portada
            if (comunicado.portadaUrl != null &&
                comunicado.portadaUrl!.isNotEmpty)
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.network(
                      comunicado.portadaUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(0xFF111827),
                        child: const Center(
                          child: Icon(
                            Icons.image_not_supported_outlined,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (isExpired)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Expirado',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                ],
              )
            else
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Container(
                  color: const Color(0xFF111827),
                  child: const Center(
                    child: Icon(Icons.image_outlined, color: Color(0xFF64748B)),
                  ),
                ),
              ),

            // Contenido
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      comunicado.titulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFE2E8F0),
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      truncate(comunicado.contenido, 100),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF94A3B8)),
                    ),
                    const SizedBox(height: 8),
                    // Metadatos
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _metaRow(
                          icon: Icons.schedule,
                          text:
                              'Publicado: ${formatDate(comunicado.publishedAt)}',
                        ),
                        const SizedBox(height: 4),
                        _metaRow(
                          icon: Icons.person_outline,
                          text: 'Por: $authorName',
                        ),
                        if (comunicado.expiresAt != null &&
                            comunicado.expiresAt!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _metaRow(
                            icon: Icons.calendar_today_outlined,
                            text:
                                '${isExpired ? "Expiró" : "Expira"}: ${formatDate(comunicado.expiresAt!)}',
                            color: isExpired
                                ? const Color(0xFFF59E0B)
                                : const Color(0xFF94A3B8),
                          ),
                        ],
                      ],
                    ),
                    const Spacer(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaRow({
    required IconData icon,
    required String text,
    Color color = const Color(0xFF94A3B8),
  }) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(color: color, fontSize: 12),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
