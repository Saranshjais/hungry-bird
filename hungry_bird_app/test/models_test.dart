import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/core/formatters.dart';
import 'package:hungry_bird_app/models/app_content.dart';
import 'package:hungry_bird_app/models/user.dart';
import 'package:hungry_bird_app/models/vendor.dart';

void main() {
  group('Vendor.fromJson', () {
    test('list payload keeps an unrated vendor unrated', () {
      final v = Vendor.fromJson({
        'id': 7,
        'name': 'Sahu Ki Chai',
        'cuisine_type': 'Tea',
        'area': 'Chaura Rasta',
        'city_name': 'Jaipur',
        'avg_rating': 4.5, // padded display value from the API
        'rating': null,
        'total_ratings': 0,
        'specialty_dish': 'Local Specialty',
        'is_hidden_gem': true,
        'lat': '26.92',
        'lng': 75.82,
      });
      expect(v.hasRating, isFalse);
      expect(v.specialtyDish, isNull, reason: 'generic placeholder dish is hidden');
      expect(v.isHiddenGem, isTrue);
      expect(v.lat, 26.92);
      expect(v.subtitle, 'Tea • Chaura Rasta');
    });

    test('legacy payload falls back to avg_rating when rated', () {
      final v = Vendor.fromJson({'id': 1, 'name': 'LMB', 'avg_rating': 4.2, 'total_ratings': 12});
      expect(v.hasRating, isTrue);
      expect(v.rating, 4.2);
    });

    test('price label prefers the numeric range', () {
      final v = Vendor.fromJson({'id': 1, 'name': 'X', 'price_min': 20, 'price_max': 80, 'price_level': '₹'});
      expect(v.priceLabel, '₹20 – ₹80');
    });

    test('full address avoids "Near Next to…"', () {
      final a = Vendor.fromJson({'id': 1, 'name': 'X', 'address_text': 'Shop 312, MI Road', 'landmark': 'Next to Niros', 'city_name': 'Jaipur'});
      expect(a.fullAddress, 'Shop 312, MI Road, Next to Niros, Jaipur');
      final b = Vendor.fromJson({'id': 2, 'name': 'Y', 'address_text': 'Chandpole', 'landmark': 'Hawa Mahal'});
      expect(b.fullAddress, 'Chandpole, Near Hawa Mahal');
    });

    test('round-trips through the guest snapshot', () {
      final v = Vendor.fromJson({'id': 3, 'name': 'Pandit Kulfi', 'rating': 4.8, 'total_ratings': 5, 'is_famous': 1});
      final copy = Vendor.fromJson(v.toJson());
      expect(copy.id, 3);
      expect(copy.rating, 4.8);
      expect(copy.isFamous, isTrue);
    });
  });

  test('VendorDetail ignores the stored average for unrated vendors', () {
    final d = VendorDetail.fromJson({
      'is_favorite': true,
      'vendor': {'id': 9, 'name': 'New Stall', 'rating': 4.5, 'total_ratings': 0, 'city': {'name': 'Jaipur', 'slug': 'jaipur'}},
      'reviews': [
        {'id': 1, 'rating_value': 5, 'review_text': 'Great', 'author_name': 'Asha', 'created_at': '2026-10-01T10:00:00', 'is_mine': true},
      ],
      'nearby': [],
    });
    expect(d.vendor.hasRating, isFalse);
    expect(d.vendor.citySlug, 'jaipur');
    expect(d.isFavorite, isTrue);
    expect(d.reviews.single.isMine, isTrue);
    expect(d.reviews.single.createdAt!.isUtc, isTrue);
  });

  group('Fmt', () {
    test('compareVersions', () {
      expect(Fmt.compareVersions('1.0.0', '1.0.1'), lessThan(0));
      expect(Fmt.compareVersions('1.2.10', '1.2.9'), greaterThan(0));
      expect(Fmt.compareVersions('2.0', '2.0.0'), 0);
      expect(Fmt.compareVersions('1.0.0+5', '1.0.0'), 0);
    });

    test('distance', () {
      expect(Fmt.distance(0.42), '420 m');
      expect(Fmt.distance(3.456), '3.5 km');
      expect(Fmt.distance(12.4), '12 km');
      expect(Fmt.distance(null), '');
    });

    test('timeAgo', () {
      final now = DateTime.utc(2026, 10, 9, 12);
      expect(Fmt.timeAgo(now.subtract(const Duration(minutes: 5)), now: now), '5 min ago');
      expect(Fmt.timeAgo(now.subtract(const Duration(hours: 3)), now: now), '3 h ago');
      expect(Fmt.timeAgo(now.subtract(const Duration(days: 2)), now: now), '2 d ago');
    });

    test('initials', () {
      expect(Fmt.initials('Ravi Kumar Sharma'), 'RS');
      expect(Fmt.initials('asha'), 'A');
      expect(Fmt.initials('  '), '?');
    });
  });

  test('StallSubmission drops empty optional fields', () {
    const s = StallSubmission(cityId: 1, stallName: 'Raju Chaat', description: '  ', lat: 26.9, lng: 75.8);
    final json = s.toJson();
    expect(json.keys, containsAll(['city_id', 'stall_name', 'lat', 'lng']));
    expect(json.containsKey('description'), isFalse);
    expect(json.containsKey('rating'), isFalse);
  });

  test('AppSettings parses booleans and keeps defaults', () {
    final s = AppSettings.fromJson({'maintenance_mode': 'true', 'min_app_version': '1.2.0'});
    expect(s.maintenanceMode, isTrue);
    expect(s.minAppVersion, '1.2.0');
    expect(s.allowGuestReviews, isTrue);
    expect(s.defaultCity, 'jaipur');
  });

  test('banner link types', () {
    expect(parseLinkType('vendor'), LinkType.vendor);
    expect(parseLinkType('nope'), LinkType.none);
    expect(AppBanner.fromJson({'title': 'x', 'image_url': 'https://a/b.jpg', 'link_type': 'category'}).linkType, LinkType.category);
  });
}
