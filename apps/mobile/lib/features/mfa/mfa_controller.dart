import 'package:flutter/foundation.dart';
import 'mfa_models.dart';
import 'mfa_repository.dart';

class MFAController with ChangeNotifier {
  MFAController(this._repo);

  final MFARepository _repo;

  // Estado expuesto a la UI
  bool loading = false;
  String? message;
  String? error;

  MFAStatus? status;
  List<MFAAttempt> attempts = const [];
  MFASetupData? setupData;
  List<String> backupTokens = const [];

  bool activating = false;
  bool disabling = false;
  bool regenerating = false;

  Future<void> loadAll() async {
    loading = true;
    message = null;
    error = null;
    notifyListeners();
    try {
      final s = await _repo.getStatus();
      final a = await _repo.getAttempts();
      status = s;
      attempts = a;
    } catch (e) {
      error = _asErr(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setup() async {
    loading = true;
    message = null;
    error = null;
    setupData = null;
    notifyListeners();
    try {
      setupData = await _repo.setup();
      message = 'MFA preparado. Escanea el QR o usa la clave.';
    } catch (e) {
      error = _asErr(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> activate(String code) async {
    if (code.length != 6) {
      error = 'Ingresa un código de 6 dígitos';
      notifyListeners();
      return;
    }
    activating = true;
    message = null;
    error = null;
    notifyListeners();
    try {
      backupTokens = await _repo.activate(code);
      setupData = null;
      await refreshStatus();
      message = '¡MFA activado! Guarda tus tokens de respaldo.';
    } catch (e) {
      error = _asErr(e);
    } finally {
      activating = false;
      notifyListeners();
    }
  }

  Future<void> disable(String confirm) async {
    if (confirm.toUpperCase() != 'DISABLE MFA') {
      error = 'Debes escribir "DISABLE MFA"';
      notifyListeners();
      return;
    }
    disabling = true;
    message = null;
    error = null;
    notifyListeners();
    try {
      await _repo.disable(confirm);
      await refreshStatus();
      message = 'MFA desactivado correctamente';
    } catch (e) {
      error = _asErr(e);
    } finally {
      disabling = false;
      notifyListeners();
    }
  }

  Future<void> regenerate(String confirm) async {
    if (confirm.toUpperCase() != 'REGENERATE TOKENS') {
      error = 'Debes escribir "REGENERATE TOKENS"';
      notifyListeners();
      return;
    }
    regenerating = true;
    message = null;
    error = null;
    notifyListeners();
    try {
      backupTokens = await _repo.regenerate(confirm);
      await refreshStatus();
      message = 'Tokens de respaldo regenerados';
    } catch (e) {
      error = _asErr(e);
    } finally {
      regenerating = false;
      notifyListeners();
    }
  }

  Future<void> refreshStatus() async {
    try {
      status = await _repo.getStatus();
    } catch (e) {
      error = _asErr(e);
    }
  }

  String _asErr(Object e) {
    // Simplificado: si quieres, extrae de DioException.response?.data['error']
    return e.toString();
  }
}
