// lib/core/push_service.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase_options.dart';
import 'api.dart';
import 'token_storage.dart';

/// Canal de notificaciones (DEBE coincidir con el usado en el backend)
const _channelId = 'high_importance_channel';
const _channelName = 'Notificaciones importantes';
const _channelDesc = 'Canal para notificaciones de alta prioridad';

final FlutterLocalNotificationsPlugin _local =
    FlutterLocalNotificationsPlugin();

class PushService {
  static bool _inited = false;
  static bool _boundRefresh = false;

  /// Inicializa Firebase, permisos y manejadores. Idempotente.
  static Future<void> init() async {
    if (_inited) return;

    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Handler de mensajes en background/terminated (debe ser top-level).
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Inicializa notificaciones locales + canal Android
    const initAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initIOS = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: initAndroid,
      iOS: initIOS,
    );

    await _local.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (resp) {
        // Aquí podrías rutear con resp.payload si lo deseas.
      },
    );

    // Crear canal (Android 8+)
    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
      showBadge: true,
    );
    await _local
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);

    // iOS: permitir banner/sonido en foreground
    if (Platform.isIOS) {
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: true,
            badge: true,
            sound: true,
          );
    }

    // Pedir permiso si hiciera falta (Android 13+ / iOS)
    await askNotificationPermissionIfNeeded();

    // Mostrar una notificación local cuando llega un FCM en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      final notif = message.notification;
      final title = notif?.title ?? message.data['title'] ?? 'Notificación';
      final body = notif?.body ?? message.data['body'] ?? '';

      await _local.show(
        message.hashCode,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDesc,
            importance: Importance.max,
            priority: Priority.high,
            playSound: true,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: message.data.isNotEmpty ? message.data.toString() : null,
      );
    });

    // Abrir app al tocar una notificación
    final initialMsg = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMsg != null) _handleMessageTap(initialMsg);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

    _inited = true;
  }

  /// Pide permiso de notificaciones si todavía no lo tiene.
  static Future<void> askNotificationPermissionIfNeeded() async {
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    if (settings.authorizationStatus == AuthorizationStatus.notDetermined ||
        (Platform.isAndroid &&
            settings.authorizationStatus == AuthorizationStatus.denied)) {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
      );
    }
  }

  /// Wrapper “a prueba de 401/errores”. Úsalo en arranque y no bloquea la UI.
  static Future<void> registerTokenIfLoggedInSafe() async {
    try {
      await registerTokenIfLoggedIn();
    } catch (e, _) {
      debugPrint('⚠️  Registro de push ignorado: $e');
    }
  }

  /// Registra el token en backend SOLO si hay sesión válida.
  /// Lanza excepto en 401 (que se ignora).
  static Future<void> registerTokenIfLoggedIn() async {
    final access = await TokenStorage.I.accessToken;
    if (access == null || access.isEmpty) return; // sin sesión

    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return;

    final plataforma = Platform.isIOS ? 'ios' : 'android';
    try {
      await Api.I.registerPushToken(token: token, plataforma: plataforma);
    } on DioException catch (e) {
      if ((e.response?.statusCode ?? 0) == 401) {
        debugPrint('🔒 401 al registrar push (sesión caducada). Se omite.');
        return;
      }
      rethrow; // otros errores sí se propagan (para debug)
    }

    // Suscribirse a refresh del token
    if (!_boundRefresh) {
      _boundRefresh = true;
      FirebaseMessaging.instance.onTokenRefresh.listen((t) async {
        try {
          await Api.I.registerPushToken(token: t, plataforma: plataforma);
        } catch (_) {
          /* no bloquear por errores de red */
        }
      });
    }
  }

  static void _handleMessageTap(RemoteMessage message) {
    // Lee message.data y navega si quieres:
    // final route = message.data['route'];
    // if (route == 'reserva') navigatorKey.currentState?.pushNamed('/areas-comunes');
  }
}

// === Background handler (debe ser top-level) ===
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Si tu backend enviara SOLO "data", aquí podrías disparar una local,
  // pero recuerda que el plugin puede no estar inicializado en el isolate de bg.
}
