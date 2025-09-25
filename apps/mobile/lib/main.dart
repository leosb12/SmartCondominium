import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/api.dart';
import 'core/push_service.dart';

import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/placeholder_screen.dart';
import 'screens/finanzas_screen.dart';
import 'screens/reserva_screen.dart';
import 'screens/comunicacion_screen.dart';
import 'screens/mensajes_screen.dart';
import 'screens/historial_comunicados_screen.dart';
import 'screens/mfa_screen.dart';

class Routes {
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';

  // Secciones
  static const residentes = '/residentes';
  static const areasComunes = '/areas-comunes';
  static const finanzas = '/finanzas';
  static const mantenimiento = '/mantenimiento';
  static const comunicacion = '/comunicacion';
  static const reportes = '/reportes';
  static const seguridad = '/seguridad';
  static const authSeg = '/autenticacion-seguridad';
  static const comunicacionHistorial = '/comunicacion/historial';
  // Subrutas de Comunicación
  static const comunicacionMensajes = '/comunicacion/mensajes';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Intl / Locales
  Intl.defaultLocale = 'es';
  await initializeDateFormatting('es');

  await Api.I.init(); // Config de tu API (Dio)
  await PushService.init(); // Firebase/FCM + permisos + handlers

  runApp(const App());

  // No bloquear el arranque (ni crashear por 401).
  // Intencionalmente SIN await: corre en background.
  // ignore: unawaited_futures
  PushService.registerTokenIfLoggedInSafe();
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartCondominium',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF06B6D4)),
        useMaterial3: true,
      ),
      locale: const Locale('es'),
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      initialRoute: Routes.login,
      routes: {
        Routes.login: (_) => const LoginScreen(),
        Routes.register: (_) => const RegisterScreen(),
        Routes.home: (_) => const HomeScreen(),
        Routes.residentes: (_) => const PlaceholderScreen(title: 'Residentes'),
        Routes.areasComunes: (_) => const ReservaScreen(),
        Routes.finanzas: (_) => const FinanzasScreen(),
        Routes.mantenimiento: (_) =>
            const PlaceholderScreen(title: 'Mantenimiento'),
        Routes.comunicacion: (_) => const ComunicacionScreen(),
        Routes.comunicacionMensajes: (_) => const MensajesScreen(),
        Routes.reportes: (_) => const PlaceholderScreen(title: 'Reportes'),
        Routes.seguridad: (_) => const PlaceholderScreen(title: 'Seguridad'),
        Routes.authSeg: (_) => const Seguridad2FAScreen(),
        Routes.comunicacionHistorial: (_) => HistorialComunicadosScreen(),
      },
    );
  }
}
