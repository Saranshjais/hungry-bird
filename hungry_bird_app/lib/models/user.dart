import '../core/formatters.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.notificationsEnabled = true,
    this.createdAt,
  });

  final int id;
  final String name;
  final String email;
  final String? phone;
  final bool notificationsEnabled;
  final DateTime? createdAt;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: asInt(json['id']),
        name: asString(json['name']) ?? 'Foodie',
        email: asString(json['email']) ?? '',
        phone: asString(json['phone']),
        notificationsEnabled: json['notifications_enabled'] == null ? true : asBool(json['notifications_enabled']),
        createdAt: Fmt.parseDate(json['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'notifications_enabled': notificationsEnabled,
        'created_at': createdAt?.toUtc().toIso8601String(),
      };

  AppUser copyWith({String? name, String? email, String? phone, bool? notificationsEnabled}) => AppUser(
        id: id,
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
        createdAt: createdAt,
      );
}

class Submission {
  const Submission({
    required this.id,
    required this.stallName,
    this.cuisineType,
    this.cityName,
    required this.status,
    this.address,
    this.reviewNotes,
    this.createdAt,
  });

  final int id;
  final String stallName;
  final String? cuisineType;
  final String? cityName;
  final String status;
  final String? address;
  final String? reviewNotes;
  final DateTime? createdAt;

  factory Submission.fromJson(Map<String, dynamic> json) => Submission(
        id: asInt(json['id']),
        stallName: asString(json['stall_name']) ?? 'Stall',
        cuisineType: asString(json['cuisine_type']),
        cityName: asString(json['city_name']),
        status: asString(json['status']) ?? 'pending',
        address: asString(json['approx_address']),
        reviewNotes: asString(json['review_notes']),
        createdAt: Fmt.parseDate(json['created_at']),
      );
}

/// Payload for "Suggest a stall".
class StallSubmission {
  const StallSubmission({
    required this.cityId,
    required this.stallName,
    this.cuisineType,
    this.description,
    this.address,
    this.estimatedPrice,
    this.googleMapsUrl,
    this.lat,
    this.lng,
    this.rating,
    this.submitterName,
    this.submitterEmail,
  });

  final int cityId;
  final String stallName;
  final String? cuisineType;
  final String? description;
  final String? address;
  final String? estimatedPrice;
  final String? googleMapsUrl;
  final double? lat;
  final double? lng;
  final double? rating;
  final String? submitterName;
  final String? submitterEmail;

  Map<String, dynamic> toJson() => {
        'city_id': cityId,
        'stall_name': stallName,
        'cuisine_type': cuisineType,
        'description': description,
        'approx_address': address,
        'estimated_price': estimatedPrice,
        'google_maps_url': googleMapsUrl,
        'lat': lat,
        'lng': lng,
        'rating': rating,
        'submitted_by_name': submitterName,
        'submitted_by_email': submitterEmail,
      }..removeWhere((_, v) => v == null || (v is String && v.trim().isEmpty));
}
