import '../core/formatters.dart';
import 'premium.dart';

class FoodCategory {
  const FoodCategory({required this.name, required this.slug, this.icon, this.imageUrl});

  final String name;
  final String slug;
  final String? icon;
  final String? imageUrl;

  factory FoodCategory.fromJson(Map<String, dynamic> json) => FoodCategory(
        name: asString(json['name']) ?? '',
        slug: asString(json['slug']) ?? '',
        icon: asString(json['icon']),
        imageUrl: asString(json['image_url']),
      );

  /// Offline fallback only: shown until the first config load and kept when that request
  /// FAILED (no connection). A server that answers with an empty list gets an empty list.
  static const defaults = [
    FoodCategory(name: 'Street Food', slug: 'street-food', icon: '🌮'),
    FoodCategory(name: 'Kachori & Samosa', slug: 'kachori-samosa', icon: '🥟'),
    FoodCategory(name: 'Chai & Tea', slug: 'tea-chai', icon: '☕'),
    FoodCategory(name: 'Lassi & Dairy', slug: 'dairy-lassi', icon: '🥛'),
    FoodCategory(name: 'Sweets', slug: 'sweets', icon: '🍬'),
    FoodCategory(name: 'Kulfi & Ice Cream', slug: 'kulfi-ice-cream', icon: '🍦'),
    FoodCategory(name: 'Snacks & Fast Food', slug: 'fast-food-snacks', icon: '🍔'),
    FoodCategory(name: 'Rajasthani', slug: 'rajasthani-traditional', icon: '🍛'),
  ];
}

enum LinkType { none, vendor, city, category, url }

LinkType parseLinkType(Object? value) => switch (value?.toString()) {
      'vendor' => LinkType.vendor,
      'city' => LinkType.city,
      'category' => LinkType.category,
      'url' => LinkType.url,
      _ => LinkType.none,
    };

class AppBanner {
  const AppBanner({
    required this.title,
    this.subtitle,
    this.imageUrl,
    this.assetImage,
    this.linkType = LinkType.none,
    this.linkValue,
  });

  final String title;
  final String? subtitle;
  final String? imageUrl;
  final String? assetImage;
  final LinkType linkType;
  final String? linkValue;

  factory AppBanner.fromJson(Map<String, dynamic> json) => AppBanner(
        title: asString(json['title']) ?? '',
        subtitle: asString(json['subtitle']),
        imageUrl: asString(json['image_url']),
        linkType: parseLinkType(json['link_type']),
        linkValue: asString(json['link_value']),
      );

  /// Bundled brand artwork (slogans only, no claims) shown when the admin hasn't published banners.
  static const fallback = [
    AppBanner(title: 'Discover the zaika hiding in every gully', assetImage: 'assets/images/banner_1.jpg'),
    AppBanner(title: 'Find delicious street food near you', assetImage: 'assets/images/banner_2.jpg'),
    AppBanner(title: 'Find flavour on every corner', assetImage: 'assets/images/banner_3.jpg'),
  ];
}

/// Admin-managed configuration. Empty strings mean "not set": the app hides that link or number.
class AppSettings {
  const AppSettings({
    this.maintenanceMode = false,
    this.maintenanceMessage = '',
    this.minAppVersion = '1.0.0',
    this.latestAppVersion = '1.0.0',
    this.forceUpdateMessage = '',
    this.announcement = '',
    this.supportEmail = '',
    this.supportPhone = '',
    this.playStoreUrl = '',
    this.appStoreUrl = '',
    this.websiteUrl = '',
    this.instagramUrl = '',
    this.facebookUrl = '',
    this.xUrl = '',
    this.youtubeUrl = '',
    this.allowGuestReviews = true,
    this.defaultCity = 'jaipur',
    this.pushAvailable = false,
    this.premium = const PremiumConfig(),
  });

  final bool maintenanceMode;
  final String maintenanceMessage;
  final String minAppVersion;
  final String latestAppVersion;
  final String forceUpdateMessage;
  final String announcement;
  final String supportEmail;
  final String supportPhone;
  final String playStoreUrl;
  final String appStoreUrl;
  final String websiteUrl;
  final String instagramUrl;
  final String facebookUrl;
  final String xUrl;
  final String youtubeUrl;
  final bool allowGuestReviews;
  final String defaultCity;

  /// Whether the server can send push notifications at all (no Firebase project yet → false).
  final bool pushAvailable;
  final PremiumConfig premium;

  /// (label, url) for every social profile the admin has set.
  List<(String, String)> get socialLinks => [
        if (instagramUrl.isNotEmpty) ('Instagram', instagramUrl),
        if (facebookUrl.isNotEmpty) ('Facebook', facebookUrl),
        if (xUrl.isNotEmpty) ('X (Twitter)', xUrl),
        if (youtubeUrl.isNotEmpty) ('YouTube', youtubeUrl),
      ];

  /// Reads `/api/app/config`'s `settings` map. New keys may sit there or at the top level of
  /// the response; the caller merges both into [json].
  factory AppSettings.fromJson(Map<String, dynamic> json) {
    const d = AppSettings();
    final premium = json['premium'];
    return AppSettings(
      maintenanceMode: asBool(json['maintenance_mode']),
      maintenanceMessage: asString(json['maintenance_message']) ?? d.maintenanceMessage,
      minAppVersion: asString(json['min_app_version']) ?? d.minAppVersion,
      latestAppVersion: asString(json['latest_app_version']) ?? d.latestAppVersion,
      forceUpdateMessage: asString(json['force_update_message']) ?? d.forceUpdateMessage,
      announcement: asString(json['announcement']) ?? '',
      supportEmail: asString(json['support_email']) ?? '',
      supportPhone: asString(json['support_phone']) ?? '',
      playStoreUrl: asString(json['play_store_url']) ?? '',
      appStoreUrl: asString(json['app_store_url']) ?? '',
      websiteUrl: asString(json['website_url']) ?? '',
      instagramUrl: asString(json['instagram_url']) ?? '',
      facebookUrl: asString(json['facebook_url']) ?? '',
      xUrl: asString(json['x_url']) ?? '',
      youtubeUrl: asString(json['youtube_url']) ?? '',
      allowGuestReviews: json['allow_guest_reviews'] == null ? true : asBool(json['allow_guest_reviews']),
      defaultCity: asString(json['default_city']) ?? d.defaultCity,
      pushAvailable: asBool(json['push_available']),
      premium: premium is Map
          ? PremiumConfig.fromJson(Map<String, dynamic>.from(premium))
          // Flat admin keys, in case the block isn't nested.
          : PremiumConfig.fromJson({
              'enabled': json['premium_enabled'],
              'payments_available': json['payments_available'],
              'payment_methods': json['payment_methods'],
              'plans': json['premium_plans'],
              'benefits': json['premium_benefits'],
            }),
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.linkType = LinkType.none,
    this.linkValue,
    this.createdAt,
  });

  final int id;
  final String title;
  final String body;
  final LinkType linkType;
  final String? linkValue;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: asInt(json['id']),
        title: asString(json['title']) ?? '',
        body: asString(json['body']) ?? '',
        linkType: parseLinkType(json['link_type']),
        linkValue: asString(json['link_value']),
        createdAt: Fmt.parseDate(json['created_at']),
      );
}
