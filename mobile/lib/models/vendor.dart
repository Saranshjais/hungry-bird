import '../core/formatters.dart';
import 'review.dart';

/// A street-food stall / eatery.
///
/// The backend serves slightly different shapes from `/vendors`, `/vendors/<id>`,
/// `/favorites` and nearby lists, so parsing is defensive. Nothing is invented: a missing
/// area, price, photo or rating stays null and the UI shows nothing (or a neutral placeholder).
///
/// A [locked] vendor is a Premium hidden gem seen by someone without Premium. It arrives
/// with only area, category, rating, price level and photo — no name, address or location.
class Vendor {
  const Vendor({
    required this.id,
    this.name,
    this.cuisineType,
    this.foodCategory,
    this.specialtyDish,
    this.description,
    this.area,
    this.address,
    this.landmark,
    this.cityId,
    this.cityName,
    this.citySlug,
    this.lat,
    this.lng,
    this.rating,
    this.totalRatings = 0,
    this.priceLevel,
    this.priceMin,
    this.priceMax,
    this.openingHours,
    this.closedDays,
    this.imageUrl,
    this.isHiddenGem = false,
    this.isFamous = false,
    this.isVerified = false,
    this.isPremium = false,
    this.locked = false,
    this.lockedReason,
    this.phone,
    this.website,
    this.instagram,
    this.distanceKm,
  });

  final int id;
  final String? name;
  final String? cuisineType;
  final String? foodCategory;
  final String? specialtyDish;
  final String? description;
  final String? area;
  final String? address;
  final String? landmark;
  final int? cityId;
  final String? cityName;
  final String? citySlug;
  final double? lat;
  final double? lng;
  final double? rating;
  final int totalRatings;
  final String? priceLevel;
  final double? priceMin;
  final double? priceMax;
  final String? openingHours;
  final String? closedDays;
  final String? imageUrl;
  final bool isHiddenGem;
  final bool isFamous;

  /// Checked by the HungryBird team (admin-controlled) — the only reason to show "Verified".
  final bool isVerified;
  final bool isPremium;
  final bool locked;
  final String? lockedReason;
  final String? phone;
  final String? website;
  final String? instagram;
  final double? distanceKm;

  bool get hasLocation => lat != null && lng != null;
  bool get hasRating => rating != null && totalRatings > 0;

  /// What to call the stall on screen. Locked vendors have no name by design.
  String get displayName => locked ? 'Premium hidden gem' : (name ?? 'Unnamed stall');

  /// The category shown on cards (locked vendors carry `food_category` / `cuisine_type`).
  String? get category => cuisineType ?? foodCategory;

  /// "Kachori & Samosa • Chandpole"
  String get subtitle {
    final parts = <String>[
      if (cuisineType != null) cuisineType!,
      if (area != null && area != cityName) area!,
    ];
    return parts.join(' • ');
  }

  /// "C-Scheme · Chaat" for locked cards.
  String get lockedSubtitle => [area, category].whereType<String>().toSet().join(' · ');

  String get priceLabel {
    final range = Fmt.priceRange(priceMin, priceMax);
    if (range.isNotEmpty) return range;
    return priceLevel ?? '';
  }

  String get fullAddress {
    final parts = <String>[
      if (address != null) address!,
      if (landmark != null && !(address ?? '').contains(landmark!))
        RegExp(r'^(near|next|opp|opposite|behind|beside|inside|outside|in front|at)\b', caseSensitive: false).hasMatch(landmark!)
            ? landmark!
            : 'Near $landmark',
      if (cityName != null && !(address ?? '').contains(cityName!)) cityName!,
    ];
    return parts.isEmpty ? (area ?? '') : parts.join(', ');
  }

  factory Vendor.fromJson(Map<String, dynamic> json) {
    final city = json['city'];
    final hasRealRating = json.containsKey('rating');
    final total = asInt(json['total_ratings']);
    // `/vendors` serves an unpadded `rating`; older endpoints (and locked vendors) only send `avg_rating`.
    final rating = hasRealRating ? asDouble(json['rating']) : (total > 0 ? asDouble(json['avg_rating']) : null);
    final cityId = json['city_id'] ?? (city is Map ? city['id'] : null);

    return Vendor(
      id: asInt(json['id']),
      name: asString(json['name']),
      cuisineType: asString(json['cuisine_type']),
      foodCategory: asString(json['food_category']),
      specialtyDish: _meaningful(asString(json['specialty_dish'])),
      description: asString(json['description']),
      area: asString(json['area']),
      address: asString(json['address_text']) ?? asString(json['address']),
      landmark: asString(json['landmark']),
      cityId: cityId == null ? null : asInt(cityId),
      cityName: asString(json['city_name']) ?? (city is Map ? asString(city['name']) : null),
      citySlug: (city is Map ? asString(city['slug']) : null) ?? asString(json['city_slug']),
      lat: asDouble(json['lat']),
      lng: asDouble(json['lng']),
      rating: rating,
      totalRatings: total,
      priceLevel: asString(json['price_level']),
      priceMin: asDouble(json['price_min']),
      priceMax: asDouble(json['price_max']),
      openingHours: asString(json['opening_hours']),
      closedDays: asString(json['closed_days']),
      imageUrl: asString(json['image_url']),
      isHiddenGem: asBool(json['is_hidden_gem']),
      isFamous: asBool(json['is_famous']),
      isVerified: asBool(json['is_verified']),
      isPremium: asBool(json['is_premium']),
      locked: asBool(json['locked']),
      lockedReason: asString(json['locked_reason']),
      phone: asString(json['phone']),
      website: asString(json['website']),
      instagram: asString(json['instagram']),
      distanceKm: asDouble(json['distance_km']),
    );
  }

  /// Minimal snapshot kept locally for guests' saved list.
  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'cuisine_type': cuisineType,
        'food_category': foodCategory,
        'specialty_dish': specialtyDish,
        'area': area,
        'address_text': address,
        'city_name': cityName,
        'lat': lat,
        'lng': lng,
        'rating': rating,
        'total_ratings': totalRatings,
        'price_level': priceLevel,
        'image_url': imageUrl,
        'is_hidden_gem': isHiddenGem,
        'is_famous': isFamous,
        'is_verified': isVerified,
        'is_premium': isPremium,
        'locked': locked,
      };

  Vendor copyWith({double? rating, int? totalRatings}) => Vendor(
        id: id,
        name: name,
        cuisineType: cuisineType,
        foodCategory: foodCategory,
        specialtyDish: specialtyDish,
        description: description,
        area: area,
        address: address,
        landmark: landmark,
        cityId: cityId,
        cityName: cityName,
        citySlug: citySlug,
        lat: lat,
        lng: lng,
        rating: rating ?? this.rating,
        totalRatings: totalRatings ?? this.totalRatings,
        priceLevel: priceLevel,
        priceMin: priceMin,
        priceMax: priceMax,
        openingHours: openingHours,
        closedDays: closedDays,
        imageUrl: imageUrl,
        isHiddenGem: isHiddenGem,
        isFamous: isFamous,
        isVerified: isVerified,
        isPremium: isPremium,
        locked: locked,
        lockedReason: lockedReason,
        phone: phone,
        website: website,
        instagram: instagram,
        distanceKm: distanceKm,
      );

  static String? _meaningful(String? dish) {
    if (dish == null) return null;
    const generic = {'local specialty', 'street food specialty'};
    return generic.contains(dish.toLowerCase()) ? null : dish;
  }
}

class VendorPage {
  const VendorPage({required this.vendors, required this.total});

  final List<Vendor> vendors;
  final int total;
}

class VendorDetail {
  const VendorDetail({
    required this.vendor,
    required this.reviews,
    required this.nearby,
    required this.isFavorite,
  });

  final Vendor vendor;
  final List<Review> reviews;
  final List<Vendor> nearby;
  final bool isFavorite;

  /// A Premium vendor the viewer can't open: show the paywall instead of details.
  bool get locked => vendor.locked;

  factory VendorDetail.fromJson(Map<String, dynamic> json) {
    // Normally `{vendor: {...}, reviews, nearby}`; a locked vendor may instead come back flat
    // (`{id, locked: true, …, locked_reason: "premium"}`).
    final wrapped = json['vendor'] is Map;
    final vendorJson = Map<String, dynamic>.from(wrapped ? json['vendor'] as Map : json);
    if (wrapped) {
      vendorJson['locked'] ??= json['locked'];
      vendorJson['locked_reason'] ??= json['locked_reason'];
    }
    if (vendorJson['locked'] == null && vendorJson['locked_reason'] != null) vendorJson['locked'] = true;
    // The detail payload's `rating` is the stored average; only trust it when rated.
    if (vendorJson.containsKey('rating')) {
      vendorJson['rating'] = asInt(vendorJson['total_ratings']) > 0 ? vendorJson['rating'] : null;
    }
    final vendor = Vendor.fromJson(vendorJson);
    List<Map<String, dynamic>> list(Object? value) =>
        !wrapped || vendor.locked ? const [] : ((value as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return VendorDetail(
      vendor: vendor,
      reviews: list(json['reviews']).map(Review.fromJson).toList(),
      nearby: list(json['nearby']).map(Vendor.fromJson).toList(),
      isFavorite: asBool(json['is_favorite']),
    );
  }
}
