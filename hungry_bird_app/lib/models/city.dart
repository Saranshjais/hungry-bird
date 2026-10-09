import '../core/formatters.dart';

class City {
  const City({
    required this.id,
    required this.name,
    required this.slug,
    this.state,
    this.lat,
    this.lng,
    this.vendorCount = 0,
    this.description,
  });

  final int id;
  final String name;
  final String slug;
  final String? state;
  final double? lat;
  final double? lng;
  final int vendorCount;
  final String? description;

  /// Bundled artwork for launch cities; others fall back to a generic image.
  String get imageAsset {
    const known = {'jaipur', 'delhi', 'mumbai'};
    return known.contains(slug) ? 'assets/images/city_$slug.jpg' : 'assets/images/placeholder.jpg';
  }

  factory City.fromJson(Map<String, dynamic> json) => City(
        id: asInt(json['id']),
        name: asString(json['name']) ?? 'City',
        slug: asString(json['slug']) ?? '',
        state: asString(json['state']),
        lat: asDouble(json['lat']),
        lng: asDouble(json['lng']),
        vendorCount: asInt(json['vendor_count']),
        description: asString(json['desc']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'state': state,
        'lat': lat,
        'lng': lng,
        'vendor_count': vendorCount,
        'desc': description,
      };
}
