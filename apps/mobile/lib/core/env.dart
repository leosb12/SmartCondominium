import 'package:dio/dio.dart';

class Env {
  // Dev con celular físico + adb reverse:
  static const String localBase = 'http://localhost:8001';

  // Producción:
  static const String prodBase = 'https://smartcondominiumbackend.onrender.com';

  /// Opción para forzar local durante pruebas (pon temporalmente true si quieres).
  static const bool FORCE_LOCAL = false;

  /// Elige baseUrl automáticamente SIN usar /api/ping/.
  /// Prueba contra /api/login/ (debe responder 405/400/200 <500).
  static Future<String> pickBaseUrl() async {
    if (FORCE_LOCAL) return localBase;
    if (await _isReachable(localBase)) return localBase;
    return prodBase;
  }

  static Future<bool> _isReachable(String base) async {
    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: base,
          connectTimeout: const Duration(milliseconds: 1500),
          receiveTimeout: const Duration(milliseconds: 1500),
          followRedirects: false,
          validateStatus: (_) => true, // aceptamos cualquier status
        ),
      );
      // Probar un endpoint REAL bajo /api/
      final r = await dio.get(
        '/api/login/',
      ); // 405/400 también indican que el host responde
      return r.statusCode != null && r.statusCode! < 500;
    } catch (_) {
      return false;
    }
  }
}
