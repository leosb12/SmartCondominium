// lib/features/mfa/mfa_models.dart

/// Modelos para MFA (2FA) usados por repository/controller y la UI.
/// Son DTOs simples con factories tolerantes a tipos (int/string/bool).

class MFAStatus {
  final bool mfaEnabled;
  final int backupTokensCount;
  final String? lastSetup; // ISO string o null
  final bool hasTotpSecret;

  MFAStatus({
    required this.mfaEnabled,
    required this.backupTokensCount,
    required this.lastSetup,
    required this.hasTotpSecret,
  });

  factory MFAStatus.fromJson(Map json) => MFAStatus(
    mfaEnabled: _asBool(json['mfa_enabled']),
    backupTokensCount: _asInt(json['backup_tokens_count']),
    lastSetup: _asStringOrNull(json['last_setup']),
    hasTotpSecret: _asBool(json['has_totp_secret']),
  );

  Map<String, dynamic> toJson() => {
    'mfa_enabled': mfaEnabled,
    'backup_tokens_count': backupTokensCount,
    'last_setup': lastSetup,
    'has_totp_secret': hasTotpSecret,
  };

  MFAStatus copyWith({
    bool? mfaEnabled,
    int? backupTokensCount,
    String? lastSetup,
    bool? hasTotpSecret,
  }) => MFAStatus(
    mfaEnabled: mfaEnabled ?? this.mfaEnabled,
    backupTokensCount: backupTokensCount ?? this.backupTokensCount,
    lastSetup: lastSetup ?? this.lastSetup,
    hasTotpSecret: hasTotpSecret ?? this.hasTotpSecret,
  );
}

class MFAAttempt {
  final bool success;
  final String method; // 'totp' | 'backup' | ...
  final String? failureReason; // texto o null
  final String ipAddress;
  final String createdAt; // ISO string

  MFAAttempt({
    required this.success,
    required this.method,
    required this.failureReason,
    required this.ipAddress,
    required this.createdAt,
  });

  factory MFAAttempt.fromJson(Map json) => MFAAttempt(
    success: _asBool(json['success']),
    method: _asString(json['method']),
    failureReason: _asStringOrNull(json['failure_reason']),
    ipAddress: _asString(json['ip_address']),
    createdAt: _asString(json['created_at']),
  );

  Map<String, dynamic> toJson() => {
    'success': success,
    'method': method,
    'failure_reason': failureReason,
    'ip_address': ipAddress,
    'created_at': createdAt,
  };
}

class MFASetupData {
  final String secret; // clave base32
  final String qrCode; // data URI o URL
  final String provisioningUri; // otpauth://...

  MFASetupData({
    required this.secret,
    required this.qrCode,
    required this.provisioningUri,
  });

  factory MFASetupData.fromJson(Map json) => MFASetupData(
    secret: _asString(json['secret']),
    qrCode: _asString(json['qr_code']),
    provisioningUri: _asString(json['provisioning_uri']),
  );

  Map<String, dynamic> toJson() => {
    'secret': secret,
    'qr_code': qrCode,
    'provisioning_uri': provisioningUri,
  };
}

// ----------------- Helpers de parseo -----------------

bool _asBool(dynamic v) {
  if (v is bool) return v;
  if (v is num) return v != 0;
  if (v is String) {
    final t = v.trim().toLowerCase();
    return t == 'true' || t == '1' || t == 'yes';
  }
  return false;
}

int _asInt(dynamic v) {
  if (v is int) return v;
  if (v is double) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}

String _asString(dynamic v) => (v ?? '').toString();

String? _asStringOrNull(dynamic v) {
  if (v == null) return null;
  final s = v.toString();
  return s.isEmpty ? null : s;
}
