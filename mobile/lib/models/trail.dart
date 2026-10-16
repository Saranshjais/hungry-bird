import '../core/formatters.dart';

/// One stop on a food trail; [vendorId] links it to a listed stall.
class TrailStop {
  const TrailStop({required this.name, this.vendorId, this.note});

  final String name;
  final int? vendorId;
  final String? note;

  factory TrailStop.fromJson(Object? json) {
    // Older servers sent plain stall names.
    if (json is! Map) return TrailStop(name: asString(json) ?? '');
    final id = json['vendor_id'];
    return TrailStop(
      name: asString(json['name']) ?? '',
      vendorId: id == null ? null : (asInt(id) == 0 ? null : asInt(id)),
      note: asString(json['note']),
    );
  }
}

/// An admin-curated walk through a city's best bites (`/api/trails?city=<slug>`).
///
/// A [locked] trail (Premium, viewer without Premium) arrives without its stops; only
/// [stopCount] says how many there are.
class FoodTrail {
  const FoodTrail({
    required this.id,
    this.cityId,
    required this.title,
    this.description,
    this.imageUrl,
    this.duration,
    this.price,
    this.stops = const [],
    this.stopCount = 0,
    this.isPremium = false,
    this.locked = false,
  });

  final int id;
  final int? cityId;
  final String title;
  final String? description;
  final String? imageUrl;
  final String? duration;
  final String? price;
  final List<TrailStop> stops;
  final int stopCount;
  final bool isPremium;
  final bool locked;

  /// "12 stops" (empty when the server doesn't say).
  String get stopsLabel => stopCount <= 0 ? '' : '$stopCount ${stopCount == 1 ? 'stop' : 'stops'}';

  factory FoodTrail.fromJson(Map<String, dynamic> json) {
    final stops = ((json['stops'] as List?) ?? const [])
        .map(TrailStop.fromJson)
        .where((s) => s.name.isNotEmpty)
        .toList();
    return FoodTrail(
      id: asInt(json['id']),
      cityId: json['city_id'] == null ? null : asInt(json['city_id']),
      title: asString(json['title']) ?? '',
      description: asString(json['description']),
      imageUrl: asString(json['image_url']),
      duration: asString(json['duration_text']) ?? asString(json['duration']),
      price: asString(json['price_text']) ?? asString(json['budget']),
      stops: stops,
      stopCount: json['stop_count'] == null ? stops.length : asInt(json['stop_count']),
      isPremium: asBool(json['is_premium']),
      locked: asBool(json['locked']),
    );
  }
}
