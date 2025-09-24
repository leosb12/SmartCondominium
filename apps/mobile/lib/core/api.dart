import 'package:dio/dio.dart';
import 'env.dart';
import 'token_storage.dart';

class Api {
  Api._();
  static final Api I = Api._();

  late final Dio dio;

  /// Llama esto una sola vez al iniciar la app (main.dart)
  Future<void> init() async {
    final hostBase =
        await Env.pickBaseUrl(); // ej: http://localhost:8001  ó  https://...onrender.com
    final apiBase = _join(hostBase, '/api'); // -> http://localhost:8001/api

    dio = Dio(
      BaseOptions(
        baseUrl: apiBase,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Adjunta Bearer automáticamente si existe
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (opt, handler) async {
          final token = await TokenStorage.I.accessToken;
          if (token != null && token.isNotEmpty) {
            opt.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(opt);
        },
      ),
    );

    // (opcional) log simple para verificar qué base se usa
    // ignore: avoid_print
    print('🔌 API base: ${dio.options.baseUrl}');
  }

  // ---------- AUTH ----------
  Future<Response> login({
    required String email,
    required String password,
    String? mfaCode,
    String mfaMethod = 'totp', // 'totp' | 'backup'
  }) {
    final payload = {
      'email': email.trim(),
      'password': password,
      if (mfaCode != null && mfaCode.isNotEmpty) 'mfa_code': mfaCode,
      if (mfaCode != null && mfaCode.isNotEmpty) 'mfa_method': mfaMethod,
    };
    // Con baseUrl = <host>/api, aquí solo “login/”
    return dio.post('/login/', data: payload);
  }

  Future<Response> register(Map<String, dynamic> body) =>
      dio.post('/register/', data: body);

  Future<Response> me() => dio.get('/me/');

  // (opcionales pero útiles)
  Future<Response> forgotPassword(String email) =>
      dio.post('/forgot-password/', data: {'email': email.trim()});

  Future<Response> resetPassword({
    String? accessToken,
    String? refreshToken,
    String? token, // token de recovery por correo
    required String newPassword,
  }) => dio.post(
    '/reset-password/',
    data: {
      if (token != null) 'token': token,
      if (accessToken != null) 'access_token': accessToken,
      if (refreshToken != null) 'refresh_token': refreshToken,
      'new_password': newPassword,
    },
  );

  // ---------- TOKENS ----------
  Future<void> setTokensFromLoginResponse(Response res) async {
    final data = res.data as Map<String, dynamic>;
    final access = (data['access_token'] ?? '') as String;
    final refresh = (data['refresh_token'] ?? '') as String;
    if (access.isNotEmpty) {
      await TokenStorage.I.saveTokens(access, refresh);
    }
  }

  // ---------- Helpers ----------
  String _join(String a, String b) {
    if (a.endsWith('/')) a = a.substring(0, a.length - 1);
    if (!b.startsWith('/')) b = '/$b';
    return '$a$b';
  }

  // ============================================================
  // =============  MÉTODOS NUEVOS (FINANZAS)  ==================
  // ============================================================

  /// CU-08: Consultar estado de cuenta
  Future<Response> getEstadoCuenta({
    int? propiedadId,
    String? tipo, // "expensa" | "reserva" | "multa"
    String? estado, // "pendiente" | "vencida" | "pagada"
    String? desde, // "YYYY-MM-DD"
    String? hasta, // "YYYY-MM-DD"
    int page = 1,
    int pageSize = 50,
    String orden = "vencimiento",
  }) {
    final qp = {
      if (propiedadId != null) 'propiedad_id': '$propiedadId',
      if (tipo != null) 'tipo': tipo,
      if (estado != null) 'estado': estado,
      if (desde != null) 'desde': desde,
      if (hasta != null) 'hasta': hasta,
      'page': '$page',
      'page_size': '$pageSize',
      'orden': orden,
    };
    return dio.get('/finanzas/estado', queryParameters: qp);
  }

  /// CU-09: Crear orden de pago (Stripe test) — el webhook escribe en BD
  Future<Response> crearOrdenPago({
    required String tipo, // "expensa" | "reserva" | "multa"
    required int id,
    double? montoParcial,
  }) {
    final body = {
      'tipo': tipo,
      'id': id,
      if (montoParcial != null) 'monto_parcial': montoParcial,
    };
    return dio.post('/pagos/orden', data: body);
  }

  // core/api.dart (añadir al final donde están los métodos nuevos)
  /// Lista de comprobantes Stripe (recibos) para un documento.
  Future<Response> getComprobantes({
    required String tipo, // "expensa" | "reserva" | "multa"
    required int id,
  }) {
    return dio.get(
      '/pagos/comprobantes',
      queryParameters: {'tipo': tipo, 'id': '$id'},
    );
  }

  // ---------- NOTIFICACIONES ----------
  Future<Response> registerPushToken({
    required String token,
    required String plataforma, // "android" | "ios"
  }) {
    // baseUrl ya termina en /api
    return dio.post(
      '/notificaciones/register-push-token',
      data: {'token': token, 'plataforma': plataforma},
    );
  }
}
