import 'package:flutter/material.dart';

class MFADialog extends StatefulWidget {
  const MFADialog({
    super.key,
    required this.onSubmit,
    this.error,
    this.loading = false,
  });

  final Future<void> Function(String code, String method) onSubmit;
  final String? error;
  final bool loading;

  @override
  State<MFADialog> createState() => _MFADialogState();
}

class _MFADialogState extends State<MFADialog> {
  final _code = TextEditingController();
  String _method = 'totp'; // 'totp' | 'backup'

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF111827), // bg-gray-900
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(
              0xFF1d4ed8,
            ).withOpacity(0.4), // border-blue-800/40
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header con icono y título
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563eb).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.shield,
                    size: 24,
                    color: Color(0xFF60a5fa), // text-blue-400
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Verificación en dos pasos',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const Text(
                        'Ingresa tu código de autenticación',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF9ca3af), // text-gray-400
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Error message
            if (widget.error != null && widget.error!.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(
                    0xFFdc2626,
                  ).withOpacity(0.9), // bg-red-600/90
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.white,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.error!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Selector de método
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _method = 'totp'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: _method == 'totp'
                            ? const Color(0xFF2563eb)
                            : const Color(0xFF1f2937), // bg-gray-800
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _method == 'totp'
                              ? const Color(0xFF2563eb)
                              : const Color(0xFF374151), // border-gray-700
                        ),
                      ),
                      child: Text(
                        'Código de la app',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _method == 'totp'
                              ? Colors.white
                              : const Color(0xFF9ca3af), // text-gray-300
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _method = 'backup'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: _method == 'backup'
                            ? const Color(0xFF2563eb)
                            : const Color(0xFF1f2937), // bg-gray-800
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _method == 'backup'
                              ? const Color(0xFF2563eb)
                              : const Color(0xFF374151), // border-gray-700
                        ),
                      ),
                      child: Text(
                        'Token de respaldo',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _method == 'backup'
                              ? Colors.white
                              : const Color(0xFF9ca3af), // text-gray-300
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Label del código
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _method == 'totp' ? 'Código de 6 dígitos' : 'Token de respaldo',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF9ca3af), // text-gray-300
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Input del código
            Container(
              decoration: BoxDecoration(
                color: const Color(
                  0xFF1f2937,
                ).withOpacity(0.8), // bg-gray-800/80
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF374151), // border-gray-700
                ),
              ),
              child: TextField(
                controller: _code,
                maxLength: _method == 'totp' ? 6 : 8,
                textAlign: TextAlign.center,
                keyboardType: _method == 'totp'
                    ? TextInputType.number
                    : TextInputType.text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2,
                ),
                decoration: InputDecoration(
                  hintText: _method == 'totp' ? '123456' : 'ABC12345',
                  hintStyle: const TextStyle(
                    color: Color(0xFF9ca3af), // placeholder-gray-400
                    fontSize: 18,
                    fontWeight: FontWeight.normal,
                    letterSpacing: 2,
                  ),
                  border: InputBorder.none,
                  counterText: '',
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Texto de ayuda
            Text(
              _method == 'totp'
                  ? 'Abre tu app autenticadora y obtén el código de 6 dígitos'
                  : 'Usa uno de los tokens de respaldo que guardaste',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF9ca3af), // text-gray-400
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Botones
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: widget.loading
                          ? null
                          : () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFF374151), // bg-gray-700
                        foregroundColor: Colors.white,
                        side: const BorderSide(
                          color: Color(0xFF4b5563), // border-gray-600
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Cancelar',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: widget.loading
                          ? null
                          : () async {
                              final code = _code.text.trim();
                              if (code.isEmpty) return;
                              await widget.onSubmit(code, _method);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563eb),
                        disabledBackgroundColor: const Color(0xFF1e40af),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: widget.loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Text(
                              'Verificar',
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
          ],
        ),
      ),
    );
  }
}
