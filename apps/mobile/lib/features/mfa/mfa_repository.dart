import 'package:dio/dio.dart';
import '../../core/api.dart';
import 'mfa_models.dart';

class MFARepository {
  final Dio _dio = Api.I.dio;

  Future<MFAStatus?> getStatus() async {
    final r = await _dio.get('/mfa/status/');
    if (r.data is Map && r.data['success'] == true && r.data['data'] is Map) {
      return MFAStatus.fromJson(r.data['data']);
    }
    throw DioException(requestOptions: r.requestOptions, response: r);
  }

  Future<List<MFAAttempt>> getAttempts() async {
    final r = await _dio.get('/mfa/attempts/');
    if (r.data is Map && r.data['success'] == true && r.data['data'] is List) {
      return (r.data['data'] as List)
          .whereType<Map>()
          .map(MFAAttempt.fromJson)
          .toList();
    }
    return const [];
  }

  Future<MFASetupData> setup() async {
    final r = await _dio.post('/mfa/setup/', data: {});
    if (r.data is Map && r.data['success'] == true && r.data['data'] is Map) {
      return MFASetupData.fromJson(r.data['data']);
    }
    throw DioException(requestOptions: r.requestOptions, response: r);
  }

  Future<List<String>> activate(String totp) async {
    final r = await _dio.post('/mfa/activate/', data: {'totp_code': totp});
    if (r.data is Map && r.data['success'] == true) {
      final list = (r.data['backup_tokens'] as List? ?? const [])
          .whereType<String>()
          .toList();
      return list;
    }
    throw DioException(requestOptions: r.requestOptions, response: r);
  }

  Future<void> disable(String confirmation) async {
    await _dio.post('/mfa/disable/', data: {'confirmation': confirmation});
  }

  Future<List<String>> regenerate(String confirmation) async {
    final r = await _dio.post(
      '/mfa/backup-tokens/',
      data: {'confirmation': confirmation},
    );
    if (r.data is Map && r.data['success'] == true) {
      return (r.data['backup_tokens'] as List? ?? const [])
          .whereType<String>()
          .toList();
    }
    throw DioException(requestOptions: r.requestOptions, response: r);
  }
}
