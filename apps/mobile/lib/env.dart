class Env {
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://localhost:8001', // backend dev
  );
}
