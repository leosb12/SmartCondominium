// lib/screens/mfa_screen.dart
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../features/mfa/mfa_controller.dart';
import '../features/mfa/mfa_repository.dart';

import '../main.dart'; // o donde tengas definido Routes

class Seguridad2FAScreen extends StatefulWidget {
  const Seguridad2FAScreen({super.key});

  @override
  State<Seguridad2FAScreen> createState() => _Seguridad2FAScreenState();
}

class _Seguridad2FAScreenState extends State<Seguridad2FAScreen> {
  late final MFAController c;

  // inputs principales
  final activationCtrl = TextEditingController();
  final confirmDisableCtrl = TextEditingController();
  final confirmRegenerateCtrl = TextEditingController();

  // estado de UI (setup modal)
  bool _showSecret = false;
  String _currentSecret = ''; // guardamos el secreto directamente
  int _lastTokensCount = 0;

  @override
  void initState() {
    super.initState();
    c = MFAController(MFARepository())
      ..addListener(() {
        if (!mounted) return;

        // Si llegaron tokens de respaldo nuevos, mostrar diálogo
        if (c.backupTokens.isNotEmpty &&
            c.backupTokens.length != _lastTokensCount) {
          _lastTokensCount = c.backupTokens.length;
          _showTokensDialog();
        }
        setState(() {});
      })
      ..loadAll();
  }

  @override
  void dispose() {
    c.dispose();
    activationCtrl.dispose();
    confirmDisableCtrl.dispose();
    confirmRegenerateCtrl.dispose();
    super.dispose();
  }

  // String _formatDate(DateTime date) {
  //   // Formato manual para evitar problemas de localización
  //   final weekdays = [
  //     'Lunes',
  //     'Martes',
  //     'Miércoles',
  //     'Jueves',
  //     'Viernes',
  //     'Sábado',
  //     'Domingo',
  //   ];
  //   final months = [
  //     'enero',
  //     'febrero',
  //     'marzo',
  //     'abril',
  //     'mayo',
  //     'junio',
  //     'julio',
  //     'agosto',
  //     'septiembre',
  //     'octubre',
  //     'noviembre',
  //     'diciembre',
  //   ];
  //
  //   final weekday = weekdays[date.weekday - 1];
  //   final day = date.day.toString().padLeft(2, '0');
  //   final month = months[date.month - 1];
  //   final year = date.year;
  //
  //   return '$weekday, $day de $month de $year';
  // }

  @override
  Widget build(BuildContext context) {
    final mfaEnabled = c.status?.mfaEnabled == true;

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => Navigator.of(
            context,
          ).pushNamedAndRemoveUntil(Routes.home, (route) => false),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF60A5FA)),
        ),
        title: const Text(
          'Autenticación y Seguridad',
          style: TextStyle(
            color: Color(0xFF60A5FA),
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: c.loadAll,
            icon: const Icon(Icons.refresh, color: Color(0xFF60A5FA)),
            tooltip: 'Actualizar',
          ),
        ],
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Mensajes de estado
              if ((c.message ?? '').isNotEmpty)
                _banner(c.message!, success: true),
              if ((c.error ?? '').isNotEmpty) _banner(c.error!, success: false),

              const SizedBox(height: 16),

              // Header principal
              _buildHeaderCard(mfaEnabled),

              const SizedBox(height: 16),

              // Estado y configuración 2FA
              _buildMainCard(mfaEnabled),

              const SizedBox(height: 16),

              // Actividad reciente
              _buildActivityCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderCard(bool mfaEnabled) {
    return Container(
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
            decoration: BoxDecoration(
              color: mfaEnabled
                  ? const Color(0xFF10B981)
                  : const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              mfaEnabled ? Icons.verified_user : Icons.warning_amber_outlined,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Verificación en dos pasos',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  mfaEnabled
                      ? 'Tu cuenta está protegida'
                      : 'Mejora la seguridad de tu cuenta',
                  style: const TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: mfaEnabled
                  ? const Color(0xFF10B981).withOpacity(0.2)
                  : const Color(0xFFF59E0B).withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              mfaEnabled ? 'ACTIVO' : 'INACTIVO',
              style: TextStyle(
                color: mfaEnabled
                    ? const Color(0xFF10B981)
                    : const Color(0xFFF59E0B),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainCard(bool mfaEnabled) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _statusBox(
            enabled: mfaEnabled,
            backupCount: c.status?.backupTokensCount ?? 0,
          ),

          const SizedBox(height: 20),

          if (!mfaEnabled)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Configurar 2FA',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Agrega una capa extra de seguridad usando una aplicación autenticadora',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: c.loading
                        ? null
                        : () async {
                            await c.setup();
                            if (!mounted) return;
                            if (c.setupData != null) _showSetupSheet();
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: c.loading
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
                                'Configurando...',
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
                              Icon(Icons.smartphone, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Activar 2FA',
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
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Desactivar 2FA
                const Text(
                  'Desactivar 2FA',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Para desactivar la verificación en dos pasos, confirma escribiendo el texto exacto',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                _darkTextField(
                  controller: confirmDisableCtrl,
                  hint: "Escribe 'DISABLE MFA' para confirmar",
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    onPressed: c.disabling
                        ? null
                        : () => c.disable(confirmDisableCtrl.text),
                    child: c.disabling
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
                                'Desactivando...',
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
                              Icon(Icons.security, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Desactivar 2FA',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),

                const SizedBox(height: 24),
                const Divider(color: Color(0xFF374151)),
                const SizedBox(height: 24),

                // Regenerar tokens
                const Text(
                  'Regenerar tokens de respaldo',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Los tokens actuales dejarán de funcionar y se generarán nuevos códigos de respaldo.',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                _darkTextField(
                  controller: confirmRegenerateCtrl,
                  hint: "Escribe 'REGENERATE TOKENS' para confirmar",
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: c.regenerating
                        ? null
                        : () async {
                            await c.regenerate(confirmRegenerateCtrl.text);
                          },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF60A5FA)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: c.regenerating
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFF60A5FA),
                                ),
                              ),
                              SizedBox(width: 12),
                              Text(
                                'Regenerando...',
                                style: TextStyle(
                                  color: Color(0xFF60A5FA),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.refresh,
                                color: Color(0xFF60A5FA),
                                size: 20,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Regenerar tokens',
                                style: TextStyle(
                                  color: Color(0xFF60A5FA),
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
        ],
      ),
    );
  }

  Widget _buildActivityCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.history, color: Color(0xFF60A5FA), size: 20),
              SizedBox(width: 8),
              Text(
                'Actividad reciente',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (c.attempts.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF374151),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Column(
                  children: [
                    Icon(Icons.timeline, color: Color(0xFF9CA3AF), size: 32),
                    SizedBox(height: 8),
                    Text(
                      'No hay actividad reciente',
                      style: TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: c.attempts.map((a) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF374151),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: a.success
                          ? const Color(0xFF10B981).withOpacity(0.3)
                          : const Color(0xFFDC2626).withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: a.success
                              ? const Color(0xFF10B981).withOpacity(0.2)
                              : const Color(0xFFDC2626).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          a.success ? Icons.check_circle : Icons.error_outline,
                          color: a.success
                              ? const Color(0xFF10B981)
                              : const Color(0xFFDC2626),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              a.success
                                  ? 'Verificación exitosa'
                                  : 'Verificación fallida',
                              style: TextStyle(
                                color: a.success
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFDC2626),
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Método: ${a.method}',
                              style: const TextStyle(
                                color: Color(0xFF9CA3AF),
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              'IP: ${a.ipAddress}',
                              style: const TextStyle(
                                color: Color(0xFF9CA3AF),
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              a.createdAt,
                              style: const TextStyle(
                                color: Color(0xFF9CA3AF),
                                fontSize: 12,
                              ),
                            ),
                            if ((a.failureReason ?? '').isNotEmpty)
                              Text(
                                a.failureReason!,
                                style: const TextStyle(
                                  color: Color(0xFFDC2626),
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  // ---------- Setup BottomSheet ----------
  void _showSetupSheet() {
    setState(() {
      _showSecret = false;
      activationCtrl.clear();
      // guardamos el secreto directamente
      _currentSecret = c.setupData?.secret ?? '';
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Color(0xFF111827),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        child: _buildSetupContent(),
      ),
    );
  }

  Widget _buildSetupContent() {
    final s = c.setupData!;
    final imgBytes = _decodeDataImage(s.qrCode);

    return Column(
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
                  Icons.shield,
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
                      'Configurar autenticador',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Escanea el código o ingresa la clave manualmente',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
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
                // QR Code
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: (imgBytes != null)
                        ? Image.memory(
                            imgBytes,
                            width: 200,
                            height: 200,
                            fit: BoxFit.contain,
                          )
                        : (s.qrCode.startsWith('http'))
                        ? Image.network(
                            s.qrCode,
                            width: 200,
                            height: 200,
                            fit: BoxFit.contain,
                          )
                        : const SizedBox(
                            width: 200,
                            height: 200,
                            child: Center(
                              child: Text(
                                'QR no disponible',
                                style: TextStyle(color: Colors.black54),
                              ),
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 24),

                // Clave manual
                const Text(
                  'Clave manual',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Si no puedes escanear el código, ingresa esta clave en tu aplicación autenticadora',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1F2937),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF374151)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _showSecret
                                  ? _currentSecret
                                  : '•' * _currentSecret.length,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                color: Colors.white,
                                fontSize: 16,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () =>
                                setState(() => _showSecret = !_showSecret),
                            icon: Icon(
                              _showSecret
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                          IconButton(
                            onPressed: () => _copy(_currentSecret),
                            icon: const Icon(
                              Icons.copy,
                              color: Color(0xFF60A5FA),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Código de verificación
                const Text(
                  'Código de verificación',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Ingresa el código de 6 dígitos que genera tu aplicación autenticadora',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: activationCtrl,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 6,
                  onChanged: (v) {
                    final digits = v.replaceAll(RegExp(r'\D'), '');
                    if (digits != v) {
                      activationCtrl.value = TextEditingValue(
                        text: digits,
                        selection: TextSelection.collapsed(
                          offset: digits.length,
                        ),
                      );
                    }
                    setState(() {});
                  },
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    letterSpacing: 8,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    counterText: '',
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
                      borderSide: const BorderSide(
                        color: Color(0xFF60A5FA),
                        width: 2,
                      ),
                    ),
                    hintText: '123456',
                    hintStyle: const TextStyle(
                      color: Color(0xFF6B7280),
                      letterSpacing: 8,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 20),
                  ),
                ),

                const SizedBox(height: 24),

                // Apps recomendadas
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF2563EB).withOpacity(0.3),
                    ),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: Color(0xFF60A5FA),
                            size: 20,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Apps recomendadas',
                            style: TextStyle(
                              color: Color(0xFF60A5FA),
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Google Authenticator • Microsoft Authenticator • Authy • 1Password',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 13,
                          height: 1.4,
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

        // Botones de acción
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Color(0xFF1F2937),
            border: Border(top: BorderSide(color: Color(0xFF374151), width: 1)),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).maybePop(),
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
                    onPressed:
                        (activationCtrl.text.length == 6 && !c.activating)
                        ? () async {
                            await c.activate(activationCtrl.text);
                            if (!mounted) return;
                            if ((c.error ?? '').isEmpty) {
                              Navigator.of(context).maybePop();
                            }
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: c.activating
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
                                'Activando...',
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
                              Icon(Icons.verified_user, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Activar 2FA',
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
    );
  }

  // ---------- Tokens Dialog ----------
  void _showTokensDialog() {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.7,
            maxWidth: MediaQuery.of(context).size.width * 0.9,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Color(0xFF374151), width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.download,
                        color: Color(0xFF10B981),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Tokens de respaldo',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close, color: Color(0xFF9CA3AF)),
                    ),
                  ],
                ),
              ),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF2563EB).withOpacity(0.3),
                          ),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: Color(0xFF60A5FA),
                              size: 20,
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Guarda estos códigos en un lugar seguro. Cada uno puede usarse solo una vez para acceder a tu cuenta.',
                                style: TextStyle(
                                  color: Color(0xFF9CA3AF),
                                  fontSize: 14,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF374151),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            if (c.backupTokens.isEmpty)
                              const Padding(
                                padding: EdgeInsets.all(20),
                                child: Text(
                                  'No hay tokens disponibles',
                                  style: TextStyle(color: Color(0xFF9CA3AF)),
                                ),
                              )
                            else ...[
                              // Grid de tokens más compacto
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      childAspectRatio: 3.5,
                                      crossAxisSpacing: 8,
                                      mainAxisSpacing: 8,
                                    ),
                                itemCount: c.backupTokens.length,
                                itemBuilder: (context, index) {
                                  final token = c.backupTokens[index];
                                  return Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1F2937),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: const Color(0xFF4B5563),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            token,
                                            style: const TextStyle(
                                              fontFamily: 'monospace',
                                              color: Colors.white,
                                              fontSize: 12,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        GestureDetector(
                                          onTap: () => _copy(token),
                                          child: Container(
                                            padding: const EdgeInsets.all(4),
                                            child: const Icon(
                                              Icons.copy,
                                              color: Color(0xFF60A5FA),
                                              size: 14,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),

                              const SizedBox(height: 16),

                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () =>
                                      _copy(c.backupTokens.join('\n')),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2563EB),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.copy_all, size: 18),
                                      SizedBox(width: 8),
                                      Text(
                                        'Copiar todos',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Footer
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Color(0xFF374151), width: 1),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF60A5FA),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Cerrar',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------- Helpers UI ----------
  Widget _statusBox({required bool enabled, required int backupCount}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: enabled
            ? const Color(0xFF10B981).withOpacity(0.1)
            : const Color(0xFFF59E0B).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: enabled
              ? const Color(0xFF10B981).withOpacity(0.3)
              : const Color(0xFFF59E0B).withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: enabled
                  ? const Color(0xFF10B981).withOpacity(0.2)
                  : const Color(0xFFF59E0B).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.shield,
              color: enabled
                  ? const Color(0xFF10B981)
                  : const Color(0xFFF59E0B),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  enabled ? 'Protección activa' : 'Protección básica',
                  style: TextStyle(
                    color: enabled
                        ? const Color(0xFF10B981)
                        : const Color(0xFFF59E0B),
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  enabled
                      ? 'Tokens de respaldo disponibles: $backupCount'
                      : 'Tu cuenta solo está protegida con contraseña',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _banner(String text, {required bool success}) {
    final color = success ? const Color(0xFF10B981) : const Color(0xFFDC2626);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            success ? Icons.check_circle : Icons.warning_amber_rounded,
            color: color,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _darkTextField({
    required TextEditingController controller,
    String? hint,
  }) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF6B7280)),
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
    );
  }

  // ---------- Helpers varios ----------
  Future<void> _copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copiado al portapapeles'),
        backgroundColor: Color(0xFF1F2937),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Uint8List? _decodeDataImage(String src) {
    const prefix = 'base64,';
    final idx = src.indexOf(prefix);
    if (idx == -1) return null;
    try {
      return base64Decode(src.substring(idx + prefix.length));
    } catch (_) {
      return null;
    }
  }
}

enum InfoTone { warning, neutral }
