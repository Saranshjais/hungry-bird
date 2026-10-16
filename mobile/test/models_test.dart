import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hungry_bird_app/core/api_client.dart';
import 'package:hungry_bird_app/core/formatters.dart';
import 'package:hungry_bird_app/models/app_content.dart';
import 'package:hungry_bird_app/models/city.dart';
import 'package:hungry_bird_app/models/premium.dart';
import 'package:hungry_bird_app/models/review.dart';
import 'package:hungry_bird_app/models/trail.dart';
import 'package:hungry_bird_app/models/user.dart';
import 'package:hungry_bird_app/models/vendor.dart';
import 'package:hungry_bird_app/screens/auth/auth_widgets.dart';

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

  group('launch build: nullable vendor fields, no invented defaults', () {
    test('a sparse vendor stays sparse', () {
      final v = Vendor.fromJson({'id': 4, 'name': null, 'area': null, 'price_level': null, 'image_url': null, 'opening_hours': null});
      expect(v.name, isNull);
      expect(v.displayName, 'Unnamed stall');
      expect(v.area, isNull);
      expect(v.priceLevel, isNull);
      expect(v.priceLabel, '');
      expect(v.imageUrl, isNull);
      expect(v.openingHours, isNull);
      expect(v.fullAddress, '', reason: 'no "Jaipur" fallback address');
      expect(v.isVerified, isFalse, reason: 'Verified only when the server says is_verified');
      expect(v.hasRating, isFalse);
    });

    test('is_verified is the only source of the Verified badge', () {
      expect(Vendor.fromJson({'id': 1, 'verified_status': 'verified'}).isVerified, isFalse);
      expect(Vendor.fromJson({'id': 1, 'is_verified': true}).isVerified, isTrue);
    });

    test('locked vendor (contract §4 shape)', () {
      final v = Vendor.fromJson({
        'id': 42, 'locked': true, 'is_premium': true, 'is_hidden_gem': true, 'name': null,
        'city_id': 1, 'city_name': 'Jaipur', 'city_slug': 'jaipur', 'area': 'C-Scheme',
        'food_category': 'Chaat', 'cuisine_type': 'Chaat', 'avg_rating': 4.6, 'total_ratings': 12,
        'price_level': '₹', 'image_url': 'https://cdn.example/x.jpg',
      });
      expect(v.locked, isTrue);
      expect(v.isPremium, isTrue);
      expect(v.displayName, 'Premium hidden gem');
      expect(v.lockedSubtitle, 'C-Scheme · Chaat');
      expect(v.rating, 4.6);
      expect(v.hasRating, isTrue);
      expect(v.hasLocation, isFalse);
      expect(v.cityId, 1);
      expect(v.citySlug, 'jaipur');
      expect(Vendor.fromJson(v.toJson()).locked, isTrue, reason: 'guest snapshot keeps the lock');
    });

    test('locked detail parses flat or wrapped', () {
      final flat = VendorDetail.fromJson({'id': 42, 'locked': true, 'locked_reason': 'premium', 'area': 'C-Scheme', 'avg_rating': 4.6, 'total_ratings': 12});
      expect(flat.locked, isTrue);
      expect(flat.vendor.lockedReason, 'premium');
      expect(flat.vendor.rating, 4.6);
      expect(flat.reviews, isEmpty);

      final wrapped = VendorDetail.fromJson({
        'vendor': {'id': 42, 'area': 'C-Scheme'},
        'locked_reason': 'premium',
        'reviews': [
          {'id': 1, 'rating_value': 5, 'author_name': 'A'},
        ],
      });
      expect(wrapped.locked, isTrue, reason: 'a locked_reason implies locked');
      expect(wrapped.reviews, isEmpty, reason: 'nothing of a locked vendor is shown');
    });
  });

  group('AppUser launch fields', () {
    test('parses email_verified / is_premium / premium_until', () {
      final u = AppUser.fromJson({'id': 1, 'email_verified': false, 'is_premium': true, 'premium_until': '2099-01-01T00:00:00Z'});
      expect(u.emailVerified, isFalse);
      expect(u.isPremium, isTrue);
      expect(u.premiumUntil, DateTime.utc(2099));
      expect(u.hasActivePremium, isTrue);
      final copy = AppUser.fromJson(u.toJson());
      expect(copy.emailVerified, isFalse);
      expect(copy.premiumUntil, DateTime.utc(2099));
    });

    test('an expired pass in a cached profile is not Premium', () {
      final u = AppUser.fromJson({'id': 1, 'is_premium': true, 'premium_until': '2020-01-01T00:00:00Z'});
      expect(u.hasActivePremium, isFalse);
    });

    test('servers without verification never nag', () {
      expect(AppUser.fromJson({'id': 1}).emailVerified, isTrue);
    });
  });

  group('trails', () {
    test('locked trail has a stop count but no stops', () {
      final t = FoodTrail.fromJson({
        'id': 3, 'city_id': 1, 'title': 'Night walk', 'is_premium': true, 'locked': true, 'stop_count': 6, 'stops': [],
        'duration_text': '2 h', 'price_text': '₹300',
      });
      expect(t.locked, isTrue);
      expect(t.stops, isEmpty);
      expect(t.stopsLabel, '6 stops');
      expect(t.duration, '2 h');
      expect(t.price, '₹300');
    });

    test('unlocked stops link to vendors; legacy string stops still parse', () {
      final t = FoodTrail.fromJson({
        'id': 1,
        'title': 'Breakfast',
        'stops': [
          {'name': 'Rawat', 'vendor_id': 101, 'note': 'Pyaz kachori'},
          {'name': 'LMB', 'vendor_id': null},
        ],
      });
      expect(t.stops.first.vendorId, 101);
      expect(t.stops.first.note, 'Pyaz kachori');
      expect(t.stops.last.vendorId, isNull);
      expect(t.stopCount, 2);
      final legacy = FoodTrail.fromJson({'id': 2, 'title': 'Old', 'stops': ['Sahu Chai'], 'duration': '1 h', 'budget': '₹100'});
      expect(legacy.stops.single.name, 'Sahu Chai');
      expect(legacy.duration, '1 h');
      expect(legacy.price, '₹100');
    });
  });

  group('config', () {
    test('premium block, socials and push flag', () {
      final s = AppSettings.fromJson({
        'premium': {
          'enabled': true,
          'payments_available': false,
          'plans': [
            {'id': 1, 'name': 'Monthly pass', 'price_paise': 4900, 'price_display': '₹49', 'duration_days': 30},
            {'id': 0, 'name': 'broken'},
          ],
          'benefits': ['All trails', ''],
        },
        'support_phone': '',
        'instagram_url': 'https://instagram.com/hb',
        'push_available': false,
      });
      expect(s.premium.enabled, isTrue);
      expect(s.premium.paymentsAvailable, isFalse);
      expect(s.premium.upiOnly, isTrue);
      expect(s.premium.plans.single.price, '₹49');
      expect(s.premium.benefits, ['All trails']);
      expect(s.supportPhone, '', reason: 'empty = not set → hidden');
      expect(s.socialLinks.single.$1, 'Instagram');
      expect(s.pushAvailable, isFalse);
    });

    test('premium is off when the server says nothing', () {
      const s = AppSettings();
      expect(s.premium.enabled, isFalse);
      expect(AppSettings.fromJson({}).premium.enabled, isFalse);
    });

    test('cities: admin image, bundled art only for the launch cities', () {
      expect(City.fromJson({'id': 1, 'name': 'Jaipur', 'slug': 'jaipur'}).imageAsset, 'assets/images/city_jaipur.jpg');
      final pune = City.fromJson({'id': 9, 'name': 'Pune', 'slug': 'pune', 'image_url': 'https://cdn/pune.jpg', 'description': 'Misal'});
      expect(pune.imageAsset, isNull, reason: 'neutral placeholder, not another city\'s photo');
      expect(pune.imageUrl, 'https://cdn/pune.jpg');
      expect(pune.description, 'Misal');
    });
  });

  group('premium extension display', () {
    const plan = PremiumPlan(id: 1, name: 'Monthly pass', pricePaise: 4900, durationDays: 30);
    final now = DateTime.utc(2026, 10, 16, 12);

    test('no pass yet: starts today', () {
      expect(plan.extendsUntil(null, now: now), DateTime.utc(2026, 11, 15, 12));
      expect(plan.extensionLabel(null, now: now), 'Premium until ${Fmt.date(DateTime.utc(2026, 11, 15, 12))}');
    });

    test('active pass: days are added to its end', () {
      final until = DateTime.utc(2026, 11, 1);
      expect(plan.extendsUntil(until, now: now), DateTime.utc(2026, 12, 1));
      expect(plan.extensionLabel(until, now: now), startsWith('Extends Premium to '));
    });

    test('expired pass: starts again today', () {
      expect(plan.extendsUntil(DateTime.utc(2026, 1, 1), now: now), DateTime.utc(2026, 11, 15, 12));
    });

    test('price and duration labels', () {
      expect(plan.price, '₹49');
      expect(plan.durationLabel, '30 days');
      expect(const PremiumPlan(id: 2, name: 'x', pricePaise: 129900, durationDays: 1).price, '₹1,299');
      expect(Fmt.rupees(4950), '₹49.50');
      expect(Fmt.days(1), '1 day');
    });
  });

  test('payment order → Razorpay options (UPI only by default)', () {
    final order = PaymentOrder.fromJson({
      'order_id': 'order_1', 'amount_paise': 4900, 'currency': 'INR', 'key_id': 'rzp_test', 'name': 'HungryBird',
      'description': 'Monthly pass', 'prefill': {'email': 'a@b.in', 'contact': ''},
    });
    final options = order.checkoutOptions();
    expect(options['key'], 'rzp_test');
    expect(options['order_id'], 'order_1');
    expect(options['amount'], 4900);
    expect(options['prefill'], {'email': 'a@b.in'});
    expect((options['method'] as Map)['upi'], isTrue);
    expect((options['method'] as Map)['card'], isFalse);
  });

  test('premium status + history', () {
    final s = PremiumStatus.fromJson({
      'is_premium': true,
      'premium_until': '2026-11-15T00:00:00Z',
      'history': [
        {'kind': 'purchase', 'days': 30, 'ends_at': '2026-11-15T00:00:00Z', 'created_at': '2026-10-16T00:00:00Z', 'amount_paise': 4900},
        {'kind': 'grant', 'days': 7},
      ],
    });
    expect(s.premiumUntil, DateTime.utc(2026, 11, 15));
    expect(s.history.first.title, 'Pass purchased');
    expect(s.history.first.amountPaise, 4900);
    expect(s.history.last.amountPaise, isNull);
  });

  group('API error codes', () {
    Future<ApiException> fail(int status, Map<String, Object?> body, {Map<String, String> headers = const {}}) async {
      final client = ApiClient(
        client: MockClient((_) async => http.Response(jsonEncode(body), status, headers: headers)),
        baseUrl: 'https://api.test',
      );
      try {
        await client.post('/api/auth/email/verify', body: {'code': '000000'});
      } on ApiException catch (e) {
        return e;
      }
      throw StateError('no error');
    }

    test('maps every contract code', () async {
      const codes = {
        'EMAIL_NOT_VERIFIED': ApiErrorCode.emailNotVerified,
        'PAYMENTS_NOT_CONFIGURED': ApiErrorCode.paymentsNotConfigured,
        'PREMIUM_DISABLED': ApiErrorCode.premiumDisabled,
        'EMAIL_NOT_CONFIGURED': ApiErrorCode.emailNotConfigured,
        'RATE_LIMITED': ApiErrorCode.rateLimited,
        'INVALID_CODE': ApiErrorCode.invalidCode,
        'CODE_EXPIRED': ApiErrorCode.codeExpired,
        'TOO_MANY_ATTEMPTS': ApiErrorCode.tooManyAttempts,
        'WEAK_PASSWORD': ApiErrorCode.weakPassword,
        'PAYMENT_VERIFICATION_FAILED': ApiErrorCode.paymentVerificationFailed,
        'PAYMENT_PROVIDER_ERROR': ApiErrorCode.paymentProviderError,
        'VALIDATION': ApiErrorCode.validation,
        'EMAIL_IN_USE': ApiErrorCode.emailInUse,
        'ALREADY_VERIFIED': ApiErrorCode.alreadyVerified,
        'EMAIL_SEND_FAILED': ApiErrorCode.emailSendFailed,
        'ACCOUNT_SUSPENDED': ApiErrorCode.accountSuspended,
        'INVALID_CREDENTIALS': ApiErrorCode.invalidCredentials,
        'INVALID_PASSWORD': ApiErrorCode.invalidPassword,
        'PREMIUM_REQUIRED': ApiErrorCode.premiumRequired,
        'UNAUTHORIZED': ApiErrorCode.unauthorized,
        'NOT_FOUND': ApiErrorCode.notFound,
        'SOMETHING_NEW': ApiErrorCode.unknown,
      };
      for (final MapEntry(:key, :value) in codes.entries) {
        final e = await fail(400, {'error': 'nope', 'code': key});
        expect(e.code, value, reason: key);
        expect(e.message, 'nope');
      }
    });

    test('rate limits carry the wait', () async {
      final e = await fail(429, {'error': 'slow down', 'code': 'RATE_LIMITED', 'retry_after': 42});
      expect(e.code, ApiErrorCode.rateLimited);
      expect(e.retryAfter, 42);
      final bare = await fail(429, {'error': 'slow down'}, headers: {'retry-after': '30'});
      expect(bare.code, ApiErrorCode.rateLimited);
      expect(bare.retryAfter, 30);
    });

    test('no code stays null', () async {
      expect((await fail(400, {'error': 'bad'})).code, isNull);
    });

    test('INVALID_CODE carries attempts_left into the message', () async {
      final e = await fail(400, {'error': 'nope', 'code': 'INVALID_CODE', 'attempts_left': 3});
      expect(e.attemptsLeft, 3);
      expect(authErrorMessage(e), contains('3 tries left'));
      final rate = await fail(429, {'error': 'wait', 'code': 'RATE_LIMITED', 'resend_after': 42});
      expect(authErrorMessage(rate, sending: true), contains('42 seconds'));
    });

    test('a 401 on a request that sent the token ends the session once', () async {
      var expired = 0;
      var requests = 0;
      final client = ApiClient(
        client: MockClient((request) async {
          requests++;
          expect(request.headers['Authorization'], requests == 1 ? 'Bearer old' : isNull);
          return http.Response(jsonEncode({'error': 'Your session has expired.', 'code': 'UNAUTHORIZED'}), 401);
        }),
        baseUrl: 'https://api.test',
      )
        ..token = 'old'
        ..onSessionExpired = () => expired++;
      await expectLater(client.get('/api/favorites'), throwsA(isA<ApiException>()));
      expect(client.token, isNull);
      // The next call goes out as a guest: no loop of 401s / callbacks.
      await expectLater(client.get('/api/favorites'), throwsA(isA<ApiException>()));
      expect(expired, 1);
    });
  });

  group('my reviews', () {
    test('a review of a locked gem shows no name', () {
      final r = MyReview.fromJson({
        'id': 4,
        'vendor_id': 120,
        'vendor_name': null,
        'vendor_locked': true,
        'vendor': {'id': 120, 'locked': true, 'name': null, 'image_url': 'https://cdn/x.jpg'},
        'rating_value': 5,
      });
      expect(r.vendorLocked, isTrue);
      expect(r.vendorName, 'Premium hidden gem');
      expect(r.vendorImageUrl, 'https://cdn/x.jpg');
    });

    test('a stall that is no longer public is labelled as such', () {
      final r = MyReview.fromJson({'id': 3, 'vendor_id': 9, 'vendor_name': null, 'vendor': null, 'rating_value': 3});
      expect(r.vendorLocked, isFalse);
      expect(r.vendorName, 'A stall that\'s no longer listed');
    });
  });

  test('new-password rule matches the server (8+, a letter, a digit)', () {
    expect(validateNewPassword('short1'), isNotNull);
    expect(validateNewPassword('longenough'), isNotNull);
    expect(validateNewPassword('12345678'), isNotNull);
    expect(validateNewPassword('masala123'), isNull);
  });
}
