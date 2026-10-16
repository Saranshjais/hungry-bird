import '../core/formatters.dart';
import 'review.dart';

/// A street-food stall / eatery.
///
/// The backend serves slightly different shapes from `/vendors`, `/vendors/<id>`,
/// `/favorites` and nearby lists, so parsing is defensive.
class Vendor {
  const Vendor({
    required this.id,
    required this.name,
    this.cuisineType,
    this.foodCategory,
    this.specialtyDish,
    this.description,
    this.area,
    this.address,
    this.landmark,
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
    this.phone,
    this.website,
    this.instagram,
    this.distanceKm,
  });

  final int id;
  final String name;
  final String? cuisineType;
  final String? foodCategory;
  final String? specialtyDish;
  final String? description;
  final String? area;
  final String? address;
  final String? landmark;
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
  final bool isVerified;
  final String? phone;
  final String? website;
  final String? instagram;
  final double? distanceKm;

  bool get hasLocation => lat != null && lng != null;
  bool get hasRating => rating != null && totalRatings > 0;

  /// "Kachori & Samosa • Chandpole"
  String get subtitle {
    final parts = <String>[
      if (cuisineType != null) cuisineType!,
      if (area != null && area != cityName) area!,
    ];
    return parts.join(' • ');
  }

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
    // `/vendors` serves an unpadded `rating`; older endpoints only send `avg_rating`.
    final rating = hasRealRating ? asDouble(json['rating']) : (total > 0 ? asDouble(json['avg_rating']) : null);

    return Vendor(
      id: asInt(json['id']),
      name: asString(json['name']) ?? 'Unnamed stall',
      cuisineType: asString(json['cuisine_type']),
      foodCategory: asString(json['food_category']),
      specialtyDish: _meaningful(asString(json['specialty_dish'])),
      description: asString(json['description']),
      area: asString(json['area']),
      address: asString(json['address_text']) ?? asString(json['address']),
      landmark: asString(json['landmark']),
      cityName: asString(json['city_name']) ?? (city is Map ? asString(city['name']) : null),
      citySlug: city is Map ? asString(city['slug']) : asString(json['city_slug']),
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
      isVerified: json.containsKey('is_verified')
          ? asBool(json['is_verified'])
          : (asString(json['verified_status']) ?? 'verified') == 'verified',
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

  factory VendorDetail.fromJson(Map<String, dynamic> json) {
    final vendorJson = Map<String, dynamic>.from(json['vendor'] as Map);
    // The detail payload's `rating` is the stored average; only trust it when rated.
    vendorJson['rating'] = asInt(vendorJson['total_ratings']) > 0 ? vendorJson['rating'] : null;
    return VendorDetail(
      vendor: Vendor.fromJson(vendorJson),
      reviews: ((json['reviews'] as List?) ?? const [])
          .map((r) => Review.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList(),
      nearby: ((json['nearby'] as List?) ?? const [])
          .map((v) => Vendor.fromJson(Map<String, dynamic>.from(v as Map)))
          .toList(),
      isFavorite: asBool(json['is_favorite']),
    );
  }
}
