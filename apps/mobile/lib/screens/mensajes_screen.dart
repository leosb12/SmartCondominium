import 'dart:collection';

import 'package:flutter/material.dart';
import '../core/api.dart';
import '../widgets/menu_dashboard.dart';
import '../main.dart';

class Usuario {
  final String id;
  final String fullName;
  final String email;
  Usuario({required this.id, required this.fullName, required this.email});

  factory Usuario.fromMe(dynamic d) {
    final map = d as Map<String, dynamic>;
    final id = (map['id'] ?? '').toString();
    if (id.isEmpty) {
      throw Exception('El endpoint /me/ debe devolver id');
    }
    return Usuario(
      id: id,
      fullName: (map['full_name'] ?? map['email'] ?? 'Yo').toString(),
      email: (map['email'] ?? '').toString(),
    );
  }

  factory Usuario.fromJson(Map<String, dynamic> d) {
    return Usuario(
      id: (d['id'] ?? '').toString(),
      fullName: (d['full_name'] ?? d['email'] ?? 'Usuario').toString(),
      email: (d['email'] ?? '').toString(),
    );
  }
}

class Mensaje {
  final int id;
  final String emisorId;
  final String receptorId;
  final String cuerpo;
  final String ts;
  Mensaje({
    required this.id,
    required this.emisorId,
    required this.receptorId,
    required this.cuerpo,
    required this.ts,
  });

  factory Mensaje.fromJson(Map<String, dynamic> d) {
    return Mensaje(
      id: d['id'] is int ? d['id'] as int : int.tryParse('${d['id']}') ?? 0,
      emisorId: (d['emisor_id'] ?? '').toString(),
      receptorId: (d['receptor_id'] ?? '').toString(),
      cuerpo: (d['cuerpo'] ?? '').toString(),
      ts: (d['ts'] ?? '').toString(),
    );
  }
}

class Conversacion {
  final Usuario usuario; // el “otro”
  final Mensaje? ultimoMensaje;
  final int noLeidos;
  Conversacion({
    required this.usuario,
    required this.ultimoMensaje,
    required this.noLeidos,
  });
}

class MensajesScreen extends StatefulWidget {
  const MensajesScreen({super.key});

  @override
  State<MensajesScreen> createState() => _MensajesScreenState();
}

class _MensajesScreenState extends State<MensajesScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _messagesCtrl = ScrollController();

  bool _loading = false;
  bool _sending = false;
  String? _error;

  Usuario? _me;
  List<Usuario> _usuarios = [];
  List<Conversacion> _conversaciones = [];
  Usuario? _conversacionActiva;
  List<Mensaje> _mensajes = [];

  bool _mostrarUsuarios = false;
  String _busqueda = '';

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _messagesCtrl.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // 1) Perfil (debe traer id)
      final meRes = await Api.I.me();
      final me = Usuario.fromMe(meRes.data);
      setState(() {
        _me = me;
      });

      // 2) Usuarios (si falla, seguimos)
      try {
        final usersRes = await Api.I.dio.get('/users/');
        final raw = (usersRes.data is List) ? usersRes.data as List : <dynamic>[];
        final usuarios = raw
            .map((e) => Usuario.fromJson((e as Map).cast<String, dynamic>()))
            .where((u) => u.id != me.id)
            .toList();
        setState(() {
          _usuarios = usuarios;
        });
      } catch (_) {
        // no bloquea
      }

      // 3) Conversaciones
      await _cargarConversaciones(me.id);
    } catch (e) {
      setState(() {
        _error = 'Error cargando datos iniciales';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<dynamic> _safeGetResults(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'] as List;
    return const [];
  }

  Future<void> _cargarConversaciones(String meId) async {
    try {
      final res = await Api.I.dio.get('/mensajes/');
      final items = _safeGetResults(res.data)
          .map((e) => Mensaje.fromJson((e as Map).cast<String, dynamic>()))
          .toList();

      // Agrupar por “otro” usuario
      final Map<String, List<Mensaje>> map = HashMap();
      for (final m in items) {
        if (m.emisorId != meId && m.receptorId != meId) continue;
        final otherId = m.emisorId == meId ? m.receptorId : m.emisorId;
        map.putIfAbsent(otherId, () => <Mensaje>[]).add(m);
      }

      final List<Conversacion> list = [];
      for (final entry in map.entries) {
        final otherId = entry.key;
        final msgs = entry.value..sort((a, b) => DateTime.parse(b.ts).compareTo(DateTime.parse(a.ts)));
        final ultimo = msgs.isNotEmpty ? msgs.first : null;
        final user = _usuarios.firstWhere(
          (u) => u.id == otherId,
          orElse: () => Usuario(id: otherId, fullName: 'Usuario', email: ''),
        );
        list.add(Conversacion(usuario: user, ultimoMensaje: ultimo, noLeidos: 0));
      }

      list.sort((a, b) {
        final ta = a.ultimoMensaje?.ts;
        final tb = b.ultimoMensaje?.ts;
        final da = ta != null && ta.isNotEmpty ? DateTime.tryParse(ta)?.millisecondsSinceEpoch ?? 0 : 0;
        final db = tb != null && tb.isNotEmpty ? DateTime.tryParse(tb)?.millisecondsSinceEpoch ?? 0 : 0;
        return db.compareTo(da);
      });

      setState(() {
        _conversaciones = list;
      });
    } catch (e) {
      // no bloquea UI
    }
  }

  Future<void> _seleccionarConversacion(Usuario usuario) async {
    setState(() {
      _conversacionActiva = usuario;
      _loading = true;
      _error = null;
      _mensajes = [];
    });
    try {
      final res = await Api.I.dio.get('/mensajes/', queryParameters: {'with': usuario.id});
      final items = _safeGetResults(res.data)
          .map((e) => Mensaje.fromJson((e as Map).cast<String, dynamic>()))
          .toList()
        ..sort((a, b) => DateTime.parse(a.ts).compareTo(DateTime.parse(b.ts))); // cronológico

      setState(() {
        _mensajes = items;
      });

      // Scroll al final
      await Future.delayed(const Duration(milliseconds: 50));
      if (_messagesCtrl.hasClients) {
        _messagesCtrl.jumpTo(_messagesCtrl.position.maxScrollExtent);
      }
    } catch (e) {
      setState(() {
        _error = 'Error cargando mensajes';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _enviarMensaje() async {
    final txt = _inputCtrl.text.trim();
    final to = _conversacionActiva;
    if (txt.isEmpty || to == null || _sending) return;

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      final res = await Api.I.dio.post('/mensajes/', data: {'receptor_id': to.id, 'cuerpo': txt});
      final nuevo = Mensaje.fromJson((res.data as Map).cast<String, dynamic>());

      setState(() {
        _mensajes = List.of(_mensajes)..add(nuevo);
        _inputCtrl.clear();
      });

      // Scroll al final
      await Future.delayed(const Duration(milliseconds: 50));
      if (_messagesCtrl.hasClients) {
        _messagesCtrl.animateTo(
          _messagesCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }

      // Refrescar conversaciones (orden/último)
      final me = _me;
      if (me != null) await _cargarConversaciones(me.id);
    } catch (e) {
      setState(() {
        _error = 'Error enviando mensaje';
      });
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  String _formatTime(String ts) {
    DateTime? date;
    try {
      date = DateTime.parse(ts).toLocal();
    } catch (_) {
      return '';
    }
    final now = DateTime.now();
    final diff = now.difference(date);
    final hours = diff.inMinutes / 60.0;
    if (hours < 1) return 'Ahora';
    if (hours < 24) return '${hours.floor()}h';
    if (hours < 48) return 'Ayer';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    // Nota: puedes ajustar a locale si quieres
  }

  List<Usuario> get _usuariosFiltrados {
    final q = _busqueda.toLowerCase();
    return _usuarios
        .where((u) => u.fullName.toLowerCase().contains(q) || u.email.toLowerCase().contains(q))
        .toList();
  }

  List<Conversacion> get _conversacionesFiltradas {
    final q = _busqueda.toLowerCase();
    return _conversaciones
        .where((c) => c.usuario.fullName.toLowerCase().contains(q) || c.usuario.email.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final w = MediaQuery.of(context).size.width;
    final isMobile = w < 800;

    final leftPanel = Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0B1220),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Column(
        children: [
          // Header lista
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFF1F2937))),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Text('Conversaciones',
                        style: t.titleMedium?.copyWith(color: const Color(0xFFE2E8F0), fontWeight: FontWeight.w600)),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Iniciar nueva conversación',
                      onPressed: () => setState(() => _mostrarUsuarios = !_mostrarUsuarios),
                      icon: const Icon(Icons.groups_2_outlined, color: Color(0xFF60A5FA)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Buscar...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 20),
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
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  style: const TextStyle(color: Color(0xFFE2E8F0)),
                  onChanged: (v) => setState(() => _busqueda = v),
                ),
              ],
            ),
          ),
          // Lista
          Expanded(
            child: _mostrarUsuarios
                ? _buildUsuariosList()
                : _conversacionesFiltradas.isEmpty
                    ? _emptyState(
                        icon: Icons.message_outlined,
                        title: 'No hay conversaciones',
                        subtitle: 'Inicia una nueva conversación',
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: _conversacionesFiltradas.length,
                        itemBuilder: (context, i) {
                          final c = _conversacionesFiltradas[i];
                          final active = _conversacionActiva?.id == c.usuario.id;
                          return _conversationTile(c, active, onTap: () {
                            if (isMobile) {
                              // en móvil, primero oculto la lista para que se vea el chat
                              setState(() => _conversacionActiva = c.usuario);
                            }
                            _seleccionarConversacion(c.usuario);
                          });
                        },
                      ),
          ),
        ],
      ),
    );

    final rightPanel = Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0B1220),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: _conversacionActiva == null
          ? Center(
              child: _emptyState(
                icon: Icons.message_outlined,
                title: 'Selecciona una conversación',
                subtitle: 'Elige un contacto para comenzar a chatear',
              ),
            )
          : Column(
              children: [
                // Header chat
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFF1F2937))),
                  ),
                  child: Row(
                    children: [
                      if (isMobile)
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _conversacionActiva = null;
                              _mensajes = [];
                            });
                          },
                          icon: const Icon(Icons.arrow_back, color: Color(0xFF94A3B8)),
                        ),
                      _avatar(_conversacionActiva!.fullName),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_conversacionActiva!.fullName,
                                style: t.titleMedium?.copyWith(
                                  color: const Color(0xFFE2E8F0),
                                  fontWeight: FontWeight.w600,
                                )),
                            Text(_conversacionActiva!.email,
                                style: t.bodySmall?.copyWith(color: const Color(0xFF94A3B8))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Mensajes
                Expanded(
                  child: _loading && _mensajes.isEmpty
                      ? const Center(
                          child: SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF60A5FA)),
                          ),
                        )
                      : _mensajes.isEmpty
                          ? _emptyState(
                              icon: Icons.forum_outlined,
                              title: 'No hay mensajes',
                              subtitle: 'Envía el primer mensaje',
                            )
                          : ListView.builder(
                              controller: _messagesCtrl,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                              itemCount: _mensajes.length,
                              itemBuilder: (context, i) {
                                final m = _mensajes[i];
                                final mine = m.emisorId == _me?.id;
                                return _bubble(m, mine);
                              },
                            ),
                ),
                // Input
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                  decoration:
                      const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFF1F2937)))),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _inputCtrl,
                          enabled: !_sending && _conversacionActiva != null,
                          decoration: InputDecoration(
                            hintText: 'Escribe un mensaje...',
                            hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                            filled: true,
                            fillColor: const Color(0xFF0B1220),
                            enabledBorder: OutlineInputBorder(
                              borderSide: const BorderSide(color: Color(0xFF334155)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding:
                                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                          style: const TextStyle(color: Color(0xFFE2E8F0)),
                          onSubmitted: (_) => _enviarMensaje(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: (_sending || _inputCtrl.text.trim().isEmpty || _conversacionActiva == null)
                            ? null
                            : _enviarMensaje,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFF334155),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _sending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.send, size: 18),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1220),
        title: const Text('Mensajes'),
      ),
      drawer: const MenuDashboard(),
      body: SafeArea(
        child: Column(
          children: [
            if (_error != null)
              Container(
                margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                padding: const EdgeInsets.all(12),
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
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: LayoutBuilder(
                  builder: (context, c) {
                    final wide = c.maxWidth >= 1000;
                    if (wide) {
                      return Row(
                        children: [
                          SizedBox(width: 360, child: leftPanel),
                          const SizedBox(width: 12),
                          Expanded(child: rightPanel),
                        ],
                      );
                    } else {
                      // móvil: alternar entre lista y chat
                      final mostrarLista = _conversacionActiva == null;
                      return AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: mostrarLista ? leftPanel : rightPanel,
                      );
                    }
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _conversationTile(Conversacion c, bool active, {required VoidCallback onTap}) {
    final ultimo = c.ultimoMensaje;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(10),
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF1E3A8A).withOpacity(0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active ? const Color(0xFF3B82F6).withOpacity(0.4) : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            _avatar(c.usuario.fullName, badge: c.noLeidos),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        c.usuario.fullName,
                        style: const TextStyle(color: Color(0xFFE2E8F0), fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (ultimo != null)
                      Text(
                        _formatTime(ultimo.ts),
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      ),
                  ],
                ),
                if (ultimo != null)
                  Text(
                    '${ultimo.emisorId == _me?.id ? "Tú: " : ""}${ultimo.cuerpo}',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatar(String name, {int badge = 0}) {
    final initial = name.isNotEmpty ? name.trim().characters.first.toUpperCase() : 'U';
    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: const Color(0xFF2563EB),
          child: Text(
            initial,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ),
        if (badge > 0)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFF0B1220), width: 2),
              ),
              child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
          ),
      ],
    );
  }

  Widget _bubble(Mensaje m, bool mine) {
    final bg = mine ? const Color(0xFF2563EB) : const Color(0xFF1F2937);
    final fg = mine ? Colors.white : const Color(0xFFE2E8F0);
    final align = mine ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final radius = mine
        ? const BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
            bottomLeft: Radius.circular(14),
            bottomRight: Radius.circular(6),
          )
        : const BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
            bottomLeft: Radius.circular(6),
            bottomRight: Radius.circular(14),
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Container(
              decoration: BoxDecoration(color: bg, borderRadius: radius),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                crossAxisAlignment: align,
                children: [
                  Text(m.cuerpo, style: TextStyle(color: fg)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule, size: 12, color: Color(0xFFBFDBFE)),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(m.ts),
                        style: TextStyle(color: mine ? const Color(0xFFDBEAFE) : const Color(0xFF94A3B8), fontSize: 11),
                      ),
                      if (mine) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.done_all, size: 14, color: Color(0xFFDBEAFE)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState({required IconData icon, required String title, required String subtitle}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 48, color: const Color(0xFF475569)),
        const SizedBox(height: 8),
        Text(title, style: const TextStyle(color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
      ],
    );
  }

  Widget _buildUsuariosList() {
    final list = _usuariosFiltrados;
    if (list.isEmpty) {
      return _emptyState(
        icon: Icons.group_outlined,
        title: 'No hay usuarios',
        subtitle: 'No hay usuarios disponibles',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: list.length,
      itemBuilder: (context, i) {
        final u = list[i];
        return InkWell(
          onTap: () {
            setState(() {
              _mostrarUsuarios = false;
              _conversacionActiva = u;
              _mensajes = [];
            });
            _seleccionarConversacion(u);
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              children: [
                _avatar(u.fullName),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(u.fullName,
                        style: const TextStyle(color: Color(0xFFE2E8F0), fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis),
                    Text(u.email, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ]),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}