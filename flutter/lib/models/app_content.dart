import '../core/formatters.dart';

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

  /// Used until the server's list loads (and if the server has none).
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

  /// Bundled brand artwork shown when the admin hasn't published banners yet.
  static const fallback = [
    AppBanner(title: 'Discover the zaika hiding in every gully', assetImage: 'assets/images/banner_1.jpg'),
    AppBanner(title: 'Find delicious street food near you', assetImage: 'assets/images/banner_2.jpg'),
    AppBanner(title: 'Find flavour on every corner', assetImage: 'assets/images/banner_3.jpg'),
  ];
}

class AppSettings {
  const AppSettings({
    this.maintenanceMode = false,
    this.maintenanceMessage = '',
    this.minAppVersion = '1.0.0',
    this.latestAppVersion = '1.0.0',
    this.forceUpdateMessage = '',
    this.announcement = '',
    this.supportEmail = 'support@hungrybird.in',
    this.playStoreUrl = '',
    this.appStoreUrl = '',
    this.websiteUrl = '',
    this.allowGuestReviews = true,
    this.defaultCity = 'jaipur',
  });

  final bool maintenanceMode;
  final String maintenanceMessage;
  final String minAppVersion;
  final String latestAppVersion;
  final String forceUpdateMessage;
  final String announcement;
  final String supportEmail;
  final String playStoreUrl;
  final String appStoreUrl;
  final String websiteUrl;
  final bool allowGuestReviews;
  final String defaultCity;

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    const d = AppSettings();
    return AppSettings(
      maintenanceMode: asBool(json['maintenance_mode']),
      maintenanceMessage: asString(json['maintenance_message']) ?? d.maintenanceMessage,
      minAppVersion: asString(json['min_app_version']) ?? d.minAppVersion,
      latestAppVersion: asString(json['latest_app_version']) ?? d.latestAppVersion,
      forceUpdateMessage: asString(json['force_update_message']) ?? d.forceUpdateMessage,
      announcement: asString(json['announcement']) ?? '',
      supportEmail: asString(json['support_email']) ?? d.supportEmail,
      playStoreUrl: asString(json['play_store_url']) ?? '',
      appStoreUrl: asString(json['app_store_url']) ?? '',
      websiteUrl: asString(json['website_url']) ?? '',
      allowGuestReviews: json['allow_guest_reviews'] == null ? true : asBool(json['allow_guest_reviews']),
      defaultCity: asString(json['default_city']) ?? d.defaultCity,
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

class FoodTrail {
  const FoodTrail({
    required this.id,
    required this.title,
    this.description,
    this.duration,
    this.budget,
    this.stops = const [],
    this.imageUrl,
  });

  final int id;
  final String title;
  final String? description;
  final String? duration;
  final String? budget;
  final List<String> stops;
  final String? imageUrl;

  factory FoodTrail.fromJson(Map<String, dynamic> json) => FoodTrail(
        id: asInt(json['id']),
        title: asString(json['title']) ?? '',
        description: asString(json['description']),
        duration: asString(json['duration']),
        budget: asString(json['budget']),
        stops: ((json['stops'] as List?) ?? const []).map((s) => s.toString()).toList(),
        imageUrl: asString(json['image_url']),
      );
}

class CityGuide {
  const CityGuide({required this.id, required this.title, this.summary, this.category, this.vendorCount = 0, this.imageUrl});

  final int id;
  final String title;
  final String? summary;
  final String? category;
  final int vendorCount;
  final String? imageUrl;

  factory CityGuide.fromJson(Map<String, dynamic> json) => CityGuide(
        id: asInt(json['id']),
        title: asString(json['title']) ?? '',
        summary: asString(json['summary']),
        category: asString(json['category']),
        vendorCount: asInt(json['vendor_count']),
        imageUrl: asString(json['image_url']),
      );
}
