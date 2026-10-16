/// Build-time configuration.
///
/// Override at build/run time, e.g.
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000`
class AppConfig {
  AppConfig._();

  static const String _apiOverride = String.fromEnvironment('API_BASE_URL');
  static const String productionApiUrl = 'https://hungry-bird-jye4.onrender.com';

  /// Flask backend root (without the `/api` suffix and without a trailing slash).
  static String get apiBaseUrl {
    final url = _apiOverride.isNotEmpty ? _apiOverride : productionApiUrl;
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  /// Public website, used for share links and legal pages.
  static const String websiteUrl = String.fromEnvironment(
    'WEBSITE_URL',
    defaultValue: 'https://hungry-bird-gamma.vercel.app',
  );

  static const String mapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const String mapUserAgentPackage = 'com.hungrybird.hungry_bird_app';

  /// Default map centre (Jaipur) when a city has no coordinates.
  static const double fallbackLat = 26.9124;
  static const double fallbackLng = 75.7873;
}
