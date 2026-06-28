/// App configuration. Override at build time with --dart-define.
class Config {
  /// Backend base URL. Android emulator reaches the host machine at 10.0.2.2.
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  /// Dev user id until real auth lands (Phase 6+). Set with --dart-define.
  static const userId = String.fromEnvironment('USER_ID', defaultValue: '');
}
