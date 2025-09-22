import 'package:flutter/material.dart';
import 'core/api.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/placeholder_screen.dart';

class Routes {
  static const login = '/login';
  static const register = '/register';

  // Tu “Home” con menú (dashboard de la app)
  static const home = '/home';

  // Secciones (puedes ir creando las reales luego)
  static const residentes = '/residentes';
  static const areasComunes = '/areas-comunes';
  static const finanzas = '/finanzas';
  static const mantenimiento = '/mantenimiento';
  static const comunicacion = '/comunicacion';
  static const reportes = '/reportes';
  static const seguridad = '/seguridad';
  static const authSeg = '/autenticacion-seguridad';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.I.init(); // auto local→prod + interceptor de token
  runApp(const App());
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
      initialRoute: Routes.login,
      routes: {
        Routes.login: (_) => const LoginScreen(),
        Routes.register: (_) => const RegisterScreen(),

        // HOME con tu menú (contenido atractivo del condominio)
        Routes.home: (_) => const HomeScreen(),

        // Placeholders (mientras no existan las screens reales)
        Routes.residentes: (_) => const PlaceholderScreen(title: 'Residentes'),
        Routes.areasComunes: (_) =>
            const PlaceholderScreen(title: 'Áreas Comunes'),
        Routes.finanzas: (_) => const PlaceholderScreen(title: 'Finanzas'),
        Routes.mantenimiento: (_) =>
            const PlaceholderScreen(title: 'Mantenimiento'),
        Routes.comunicacion: (_) =>
            const PlaceholderScreen(title: 'Comunicación'),
        Routes.reportes: (_) => const PlaceholderScreen(title: 'Reportes'),
        Routes.seguridad: (_) => const PlaceholderScreen(title: 'Seguridad'),
        Routes.authSeg: (_) =>
            const PlaceholderScreen(title: 'Autenticación y Seguridad'),
      },
    );
  }
}
