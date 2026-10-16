import '../core/formatters.dart';

class Review {
  const Review({
    required this.id,
    required this.rating,
    this.text,
    required this.authorName,
    this.createdAt,
    this.isMine = false,
  });

  final int id;
  final double rating;
  final String? text;
  final String authorName;
  final DateTime? createdAt;
  final bool isMine;

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: asInt(json['id']),
        rating: asDouble(json['rating_value']) ?? 0,
        text: asString(json['review_text']),
        authorName: asString(json['author_name']) ?? 'Anonymous',
        createdAt: Fmt.parseDate(json['created_at']),
        isMine: asBool(json['is_mine']),
      );
}

/// A review shown in the "Fresh from the community" feed.
class CommunityReview {
  const CommunityReview({
    required this.id,
    this.vendorId,
    required this.vendorName,
    this.vendorImageUrl,
    this.cityName,
    required this.rating,
    this.text,
    required this.authorName,
    this.createdAt,
  });

  final int id;
  final int? vendorId;
  final String vendorName;
  final String? vendorImageUrl;
  final String? cityName;
  final double rating;
  final String? text;
  final String authorName;
  final DateTime? createdAt;

  factory CommunityReview.fromJson(Map<String, dynamic> json) => CommunityReview(
        id: asInt(json['id']),
        vendorId: json['vendor_id'] == null ? null : asInt(json['vendor_id']),
        vendorName: asString(json['vendor_name']) ?? 'A local stall',
        vendorImageUrl: asString(json['vendor_image_url']),
        cityName: asString(json['city_name']),
        rating: asDouble(json['rating_value']) ?? 0,
        text: asString(json['review_text']),
        authorName: asString(json['author_name']) ?? 'Anonymous',
        createdAt: Fmt.parseDate(json['created_at']),
      );
}

/// One of the signed-in user's own reviews (profile → My reviews).
class MyReview {
  const MyReview({
    required this.id,
    this.vendorId,
    required this.vendorName,
    this.vendorImageUrl,
    this.cityName,
    required this.rating,
    this.text,
    this.createdAt,
    this.vendorLocked = false,
  });

  final int id;
  final int? vendorId;
  final String vendorName;
  final String? vendorImageUrl;
  final String? cityName;
  final double rating;
  final String? text;
  final DateTime? createdAt;

  /// The stall is a Premium hidden gem this account can't open right now (no name is sent).
  final bool vendorLocked;

  factory MyReview.fromJson(Map<String, dynamic> json) {
    final card = json['vendor'];
    final locked = asBool(json['vendor_locked']) || (card is Map && asBool(card['locked']));
    final name = asString(json['vendor_name']) ?? (card is Map ? asString(card['name']) : null);
    return MyReview(
      id: asInt(json['id']),
      vendorId: json['vendor_id'] == null ? null : asInt(json['vendor_id']),
      // `vendor` is null when the stall is no longer public.
      vendorName: locked ? 'Premium hidden gem' : (name ?? 'A stall that\'s no longer listed'),
      vendorImageUrl: asString(json['vendor_image_url']) ?? (card is Map ? asString(card['image_url']) : null),
      cityName: asString(json['city_name']),
      rating: asDouble(json['rating_value']) ?? 0,
      text: asString(json['review_text']),
      createdAt: Fmt.parseDate(json['created_at']),
      vendorLocked: locked,
    );
  }
}

class RateResult {
  const RateResult({required this.review, required this.avgRating, required this.totalRatings, required this.updated});

  final Review review;
  final double? avgRating;
  final int totalRatings;
  final bool updated;

  factory RateResult.fromJson(Map<String, dynamic> json) => RateResult(
        review: Review.fromJson(Map<String, dynamic>.from(json['review'] as Map)),
        avgRating: asDouble(json['avg_rating']),
        totalRatings: asInt(json['total_ratings']),
        updated: asBool(json['updated']),
      );
}
