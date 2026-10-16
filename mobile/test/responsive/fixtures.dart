// Fake backend + JSON fixtures for the responsive matrix.
//
// `stress` packs every layout hazard we could think of into realistic payloads:
// very long English and Devanagari names, long addresses, 5-digit review counts,
// lots of categories/cities/chips, missing images. `empty` returns empty lists
// everywhere; `offline` fails everything but the config (splash error), `vendorsDown`
// fails only the vendor endpoints so in-screen error states render.
//
// [Backend] layers the launch-build switches on top: Premium off / locked / without payments /
// active for the viewer (locked vendors + trails, plans with long names), verified or
// unverified users, an optional newer app version and endpoints forced to fail with an error code.
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

enum FixtureMode { stress, empty, offline, vendorsDown, maintenance, update }

enum PremiumFixture {
  /// Admin switch off (the launch default): nothing locked, no purchase UI.
  disabled,

  /// On, viewer without Premium: Premium vendors and trails come back locked.
  locked,

  /// On, but Razorpay keys missing (`payments_available: false`).
  noPayments,

  /// On, and the viewer's account has an active pass.
  active,
}

/// Launch-build fixture switches (see the file comment).
class Backend {
  const Backend({
    this.premium = PremiumFixture.disabled,
    this.emailVerified = true,
    this.latestVersion,
    this.errors = const {},
  });

  final PremiumFixture premium;
  final bool emailVerified;

  /// `latest_app_version` (the installed test app is 1.0.0).
  final String? latestVersion;

  /// Path → error code the endpoint answers with (e.g. `'/api/auth/email/verify': 'INVALID_CODE'`).
  final Map<String, String> errors;

  bool get premiumEnabled => premium != PremiumFixture.disabled;
}

/// HTTP status and a long, realistic server message per error code (as the backend sends them).
const errorResponses = <String, (int, String)>{
  'INVALID_CODE': (400, 'That code is not right. Please check it and try again.'),
  'CODE_EXPIRED': (400, 'That code has expired. Please request a new one.'),
  'TOO_MANY_ATTEMPTS': (429, 'Too many wrong attempts. Please request a new code.'),
  'WEAK_PASSWORD': (400, 'Password must be at least 8 characters long and contain at least one letter and one digit.'),
  'RATE_LIMITED': (429, 'Please wait 42 seconds before asking for another code.'),
  'EMAIL_NOT_CONFIGURED': (503, 'Email is not available right now. Please try again later.'),
  'EMAIL_SEND_FAILED': (503, 'We couldn\'t send the email. Please try again in a moment.'),
  'EMAIL_NOT_VERIFIED': (403, 'Please verify your email before buying Premium.'),
  'EMAIL_IN_USE': (400, 'An account with this email already exists. Log in or reset your password.'),
  'ALREADY_VERIFIED': (409, 'Your email is already verified.'),
  'ACCOUNT_SUSPENDED': (403, 'Your account has been suspended. Please contact support.'),
  'INVALID_CREDENTIALS': (401, 'Invalid email or password'),
  'INVALID_PASSWORD': (400, 'Enter your current password to change your email'),
  'UNAUTHORIZED': (401, 'Your session has expired. Please log in again.'),
  'PREMIUM_REQUIRED': (403, 'This hidden gem is part of Premium.'),
  'PAYMENTS_NOT_CONFIGURED': (503, 'Payments are not available right now.'),
  'PAYMENT_PROVIDER_ERROR': (502, 'We couldn\'t start the payment. Please try again.'),
  'PREMIUM_DISABLED': (409, 'Premium is not available yet.'),
  'PAYMENT_VERIFICATION_FAILED': (400, 'We couldn\'t confirm this payment.'),
};

/// Extra fields the backend adds to some errors.
const _errorExtras = <String, Map<String, Object>>{
  'INVALID_CODE': {'attempts_left': 3},
  'RATE_LIMITED': {'resend_after': 42},
};

http.Response _error(String code, [String? message]) {
  final (status, text) = errorResponses[code] ?? (400, 'Something about that request was not right.');
  return http.Response.bytes(
    utf8.encode(jsonEncode({'error': message ?? text, 'code': code, ...?_errorExtras[code]})),
    status,
    headers: {'content-type': 'application/json'},
  );
}

const longCityName = 'Chhatrapati Sambhajinagar (Aurangabad)';
const longCitySlug = 'chhatrapati-sambhajinagar';

const longUserName = 'Venkatanarasimharajuvaripeta Subrahmanyam Lakshminarayana';
const longUserEmail = 'venkatanarasimharajuvaripeta.subrahmanyam@verylongdomainname-example.co.in';

const _hindiLong = 'लक्ष्मी मिष्ठान भंडार — जौहरी बाज़ार का प्रसिद्ध घेवर, रबड़ी और मावा कचौरी';

Map<String, dynamic> vendorJson(
  int id,
  String name, {
  String? cuisine = 'Street Food',
  String? area = 'Johari Bazaar',
  String? city = longCityName,
  double? rating,
  int total = 0,
  bool gem = false,
  bool famous = false,
  String? price = '₹₹',
  String? dish,
  double? distance,
  double? lat,
  double? lng,
  bool verified = false,
}) =>
    {
      'id': id,
      'name': name,
      'cuisine_type': cuisine,
      'area': area,
      'city_name': city,
      'city': {'id': 1, 'name': city, 'slug': longCitySlug},
      'rating': rating,
      'avg_rating': rating,
      'total_ratings': total,
      'is_hidden_gem': gem,
      'is_famous': famous,
      'is_verified': verified,
      'is_premium': false,
      'locked': false,
      'price_level': price,
      'specialty_dish': dish,
      'distance_km': distance,
      'lat': lat,
      'lng': lng,
      'image_url': null,
    };

/// Stress list: the worst offenders first so they are built even in lazy lists.
List<Map<String, dynamic>> stressVendors() => [
      vendorJson(
        101,
        'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale (Since 1952) — Original Shop Near Polo Victory Cinema',
        cuisine: 'Kachori & Samosa, Mirchi Vada, Mawa Kachori and Traditional Rajasthani Sweets',
        area: 'Station Road, Sindhi Camp Bus Stand, Opposite Lane No. 4',
        rating: 4.6,
        total: 12873,
        gem: true,
        famous: true,
        dish: 'Pyaz Kachori with tamarind chutney, Mawa Kachori and Mirchi Bada (ask for the extra-spicy green chutney)',
        distance: 12.4,
        lat: 26.9150,
        lng: 75.7900,
        price: '₹₹₹',
        verified: true,
      ),
      vendorJson(
        102,
        _hindiLong,
        cuisine: 'मिठाई और नमकीन',
        area: 'जौहरी बाज़ार, बड़ी चौपड़ के पास',
        rating: 4.9,
        total: 98765,
        gem: true,
        dish: 'घेवर और रबड़ी',
        distance: 0.35,
        lat: 26.9200,
        lng: 75.8000,
      ),
      vendorJson(103, 'Chai', cuisine: null, area: null, price: null, lat: 26.9100, lng: 75.7850),
      vendorJson(104, 'Gopal Kachori', rating: 4.2, total: 87, famous: true, distance: 3.2, lat: 26.9050, lng: 75.7800),
      vendorJson(105, 'Lassiwala (The Original One, Not The Copies Next Door)', cuisine: 'Lassi & Dairy', area: 'MI Road',
          rating: 4.4, total: 45210, gem: true, famous: true, distance: 1.1, lat: 26.9180, lng: 75.7950),
      vendorJson(106, 'Pandit Kulfi', cuisine: 'Kulfi & Ice Cream', area: 'Hawa Mahal Bazaar', rating: 4.8, total: 3020,
          lat: 26.9230, lng: 75.8270),
      vendorJson(107, 'Masala Chowk Pani Puri & Chaat Corner', cuisine: 'Chaat', area: 'Ram Niwas Garden', rating: 3.9,
          total: 15, price: '₹', lat: 26.9000, lng: 75.8150),
      vendorJson(108, 'Samrat Gol Gappe', rating: 4.1, total: 640, gem: true, lat: 26.9300, lng: 75.8050),
      vendorJson(109, 'Sahu Chai', cuisine: 'Chai & Tea', area: 'Chaura Rasta', rating: 4.5, total: 1999,
          lat: 26.9210, lng: 75.8180),
      vendorJson(110, 'Shri Ganesh Ji Ki Kachori Aur Samose Ki Dukaan', rating: 4.0, total: 10000, lat: 26.9120, lng: 75.7700),
    ];

Map<String, dynamic> stressVendorDetail() => {
      'is_favorite': false,
      'vendor': {
        ...stressVendors().first,
        'description': 'Since 1952 this family-run shop has been frying pyaz kachoris at dawn for office-goers, students and '
            'tourists alike. $_hindiLong. The mawa kachori soaked in sugar syrup is the dessert the regulars swear by — '
            'arrive before 9 AM to beat the queue that snakes around the block on weekends and festival days.',
        'opening_hours': '6:00 AM – 11:30 PM (lunch break 2:30 PM – 4:00 PM on weekdays)',
        'closed_days': 'Every alternate Tuesday, Diwali and Holi',
        'price_min': 20,
        'price_max': 1450,
        'address_text': 'Shop No. 312-B, Ground Floor, Opposite Polo Victory Cinema, Station Road, Sindhi Camp',
        'landmark': 'Behind the old Rajasthan Roadways Central Bus Stand parking gate number 2',
        'phone': '+91 98290 12345',
        'website': 'https://www.rawatmishthanbhandar-jaipur-official-website.com/menu/kachori-and-sweets',
        'instagram': '@rawat_mishthan_bhandar_official_jaipur',
        'total_ratings': 12873,
        'rating': 4.6,
      },
      'reviews': [
        {
          'id': 1,
          'rating_value': 5,
          'review_text': 'Best pyaz kachori in the city, hands down. Crispy shell, spicy onion filling, and the tamarind '
              'chutney is perfectly balanced. Came back three days in a row during our trip!',
          'author_name': 'Aishwarya Ramakrishnan-Venkataraman',
          'created_at': '2026-10-01T10:00:00',
          'is_mine': true,
        },
        {
          'id': 2,
          'rating_value': 4,
          'review_text': 'बहुत स्वादिष्ट कचौरी, लेकिन सुबह बहुत भीड़ होती है। जल्दी पहुँचें।',
          'author_name': 'राजेंद्र प्रसाद शर्मा',
          'created_at': '2026-09-20T10:00:00',
        },
        {
          'id': 3,
          'rating_value': 3,
          'review_text': 'Okay.',
          'author_name': 'Al',
          'created_at': '2025-01-20T10:00:00',
        },
        {'id': 4, 'rating_value': 5, 'review_text': null, 'author_name': 'Meera', 'created_at': '2026-10-10T10:00:00'},
        {
          'id': 5,
          'rating_value': 2,
          'review_text': 'Pricey for what it is.',
          'author_name': 'Supercalifragilisticexpialidocious_foodie_1987',
          'created_at': '2026-08-01T10:00:00',
        },
      ],
      'nearby': stressVendors().skip(1).take(4).toList(),
    };

Map<String, dynamic> minimalVendorDetail() => {
      'is_favorite': false,
      'vendor': {
        'id': 103,
        'name': 'Chai',
        'total_ratings': 0,
        'rating': null,
        'image_url': null,
      },
      'reviews': [],
      'nearby': [],
    };

/// The contract's locked shape: no name, address, coordinates or contact details.
Map<String, dynamic> lockedVendorJson(int id, {String? area, String? category, double? rating, int total = 0, String? price}) => {
      'id': id,
      'locked': true,
      'is_premium': true,
      'is_hidden_gem': true,
      'name': null,
      'city_id': 1,
      'city_name': longCityName,
      'city_slug': longCitySlug,
      'area': area,
      'food_category': category,
      'cuisine_type': category,
      'avg_rating': rating,
      'total_ratings': total,
      'price_level': price,
      'image_url': null,
    };

/// Locked Premium gems, worst first: long English area/category, Devanagari, every field null.
List<Map<String, dynamic>> lockedVendors() => [
      lockedVendorJson(
        120,
        area: 'Station Road, Sindhi Camp Bus Stand, Opposite Lane No. 4',
        category: 'Kachori & Samosa, Mirchi Vada, Mawa Kachori and Traditional Rajasthani Sweets',
        rating: 4.6,
        total: 12873,
        price: '₹₹₹',
      ),
      lockedVendorJson(121, area: 'जौहरी बाज़ार, बड़ी चौपड़ के पास', category: 'मिठाई और नमकीन', rating: 4.9, total: 98765, price: '₹'),
      lockedVendorJson(122),
    ];

/// `GET /api/vendors/<id>` for a locked vendor: 200, the locked shape + `locked_reason` under
/// `vendor`, and no reviews or nearby stalls (they would reveal it).
Map<String, dynamic> lockedVendorDetail(int id) => {
      'is_favorite': false,
      'vendor': {...lockedVendors().firstWhere((v) => v['id'] == id), 'locked_reason': 'premium'},
      'reviews': [],
      'nearby': [],
    };

List<Map<String, dynamic>> stressTrailStops() => [
      {'name': 'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale', 'vendor_id': 101, 'note': 'Order the pyaz kachori hot, with both chutneys — and ask for the mawa kachori to share.'},
      {'name': 'Lassiwala (The Original One, Not The Copies Next Door)', 'vendor_id': 105, 'note': null},
      {'name': _hindiLong, 'vendor_id': 102, 'note': 'घेवर ज़रूर चखें'},
      {'name': 'Pandit Kulfi', 'vendor_id': 106},
      {'name': 'Sahu Chai', 'vendor_id': 109, 'note': 'Kulhad chai'},
      {'name': 'Gopal Kachori', 'vendor_id': 104},
      {'name': 'Masala Chowk Pani Puri & Chaat Corner', 'vendor_id': 107},
      {'name': 'Samrat Gol Gappe', 'vendor_id': 108},
      {'name': 'Shri Ganesh Ji Ki Kachori Aur Samose Ki Dukaan', 'vendor_id': 110},
      {'name': 'Laxmi Misthan Bhandar (LMB)', 'vendor_id': null, 'note': 'Not on HungryBird yet — it\'s the big pink building on the corner.'},
      {'name': 'Kanha Sweets', 'vendor_id': null},
      {'name': 'Rawat Kachori (second branch)', 'vendor_id': null},
    ];

/// Trails for the selected city; with Premium locking, the long one arrives locked (no stops).
List<Map<String, dynamic>> stressTrails({bool locked = false}) => [
      {
        'id': 1,
        'city_id': 1,
        'title': 'The Great Walled City Breakfast Crawl: Kachori, Lassi, Jalebi and Chai Before the Shops Open',
        'description': 'A two-hour walk through the pink city\'s oldest breakfast institutions, ending with a kulhad '
            'chai at the stall that has been pouring since 1968. Wear comfortable shoes and come hungry. '
            '$_hindiLong.',
        'image_url': null,
        'duration_text': '2.5 hours (morning)',
        'price_text': '₹350 – ₹600 per person',
        'is_premium': true,
        'locked': locked,
        'stop_count': 12,
        'stops': locked ? [] : stressTrailStops(),
      },
      {
        'id': 2,
        'city_id': 1,
        'title': 'Chai trail',
        'stops': [
          {'name': 'Sahu Chai', 'vendor_id': 109},
        ],
        'duration_text': '1 h',
        'is_premium': false,
        'locked': false,
      },
    ];

List<Map<String, dynamic>> stressPlans() => [
      {'id': 1, 'name': 'Monthly pass', 'description': '30 days of every Premium hidden gem and food trail', 'price_paise': 4900, 'price_display': '₹49', 'duration_days': 30},
      {
        'id': 2,
        'name': 'Festive season super-saver pass — Diwali, Navratri & Durga Puja food walks (limited time)',
        'description': 'A whole year of Premium across every city we map, including the late-night festive trails and '
            'every new hidden gem as it lands. त्योहारों का खास पास!',
        'price_paise': 129900,
        'price_display': '₹1,299',
        'duration_days': 365,
      },
      {'id': 3, 'name': 'Week', 'description': null, 'price_paise': 1950, 'price_display': null, 'duration_days': 7},
    ];

List<String> stressBenefits() => [
      'Every hidden gem with its name, exact address, opening hours and turn-by-turn walking directions',
      'All curated food trails in every city — including the festive-season night walks',
      'हर शहर के सभी छिपे हुए रत्न और फ़ूड ट्रेल्स',
      'Support independent street-food vendors',
    ];

String _iso(DateTime d) => '${d.toUtc().toIso8601String().split('.').first}Z';

Map<String, dynamic> premiumStatusJson({required bool active}) {
  final now = DateTime.now().toUtc();
  return {
    'is_premium': active,
    'premium_until': active ? _iso(now.add(const Duration(days: 40))) : null,
    'history': [
      if (active) ...[
        {'kind': 'purchase', 'days': 30, 'ends_at': _iso(now.add(const Duration(days: 40))), 'created_at': _iso(now.subtract(const Duration(days: 2))), 'amount_paise': 4900},
        {'kind': 'grant', 'days': 12, 'ends_at': _iso(now.add(const Duration(days: 10))), 'created_at': _iso(now.subtract(const Duration(days: 20)))},
      ],
      {'kind': 'purchase', 'days': 365, 'ends_at': _iso(now.subtract(const Duration(days: 30))), 'created_at': _iso(now.subtract(const Duration(days: 395))), 'amount_paise': 129900},
      {'kind': 'revoke', 'days': 0, 'ends_at': _iso(now.subtract(const Duration(days: 400))), 'created_at': _iso(now.subtract(const Duration(days: 400)))},
    ],
  };
}

Map<String, dynamic> paymentOrderJson(int planId) => {
      'order_id': 'order_TEST123',
      'amount_paise': 4900,
      'currency': 'INR',
      'key_id': 'rzp_test_key',
      'name': 'HungryBird',
      'description': 'Monthly pass — 30 days of Premium',
      'prefill': {'name': longUserName, 'email': longUserEmail, 'contact': '+919829012345'},
      'method': {'upi': true, 'card': false, 'netbanking': false, 'wallet': false, 'emi': false, 'paylater': false},
      'plan': stressPlans().firstWhere((p) => p['id'] == planId, orElse: () => stressPlans().first),
    };

List<Map<String, dynamic>> stressCities() => [
      {
        'id': 1,
        'name': longCityName,
        'slug': longCitySlug,
        'state': 'Maharashtra',
        'lat': 26.9124,
        'lng': 75.7873,
        'vendor_count': 12873,
      },
      {'id': 2, 'name': 'Jaipur', 'slug': 'jaipur', 'state': 'Rajasthan', 'lat': 26.9, 'lng': 75.8, 'vendor_count': 412},
      {'id': 3, 'name': 'Thiruvananthapuram', 'slug': 'thiruvananthapuram', 'state': 'Kerala', 'vendor_count': 98},
      {'id': 4, 'name': 'Visakhapatnam', 'slug': 'visakhapatnam', 'state': 'Andhra Pradesh', 'vendor_count': 7},
      {'id': 5, 'name': 'दिल्ली', 'slug': 'delhi', 'state': 'राष्ट्रीय राजधानी क्षेत्र', 'vendor_count': 2304},
      {'id': 6, 'name': 'Mumbai', 'slug': 'mumbai', 'state': 'Maharashtra', 'vendor_count': 0},
      {'id': 7, 'name': 'Sri Ganganagar', 'slug': 'sri-ganganagar', 'vendor_count': 0},
      {'id': 8, 'name': 'Lucknow', 'slug': 'lucknow', 'state': 'Uttar Pradesh', 'vendor_count': 15},
    ];

List<Map<String, dynamic>> stressCategories() => [
      {'name': 'Kachori, Samosa & Mirchi Vada', 'slug': 'kachori-samosa', 'icon': '🥟'},
      {'name': 'चाट और पानी पूरी', 'slug': 'chaat', 'icon': '🥙'},
      {'name': 'Chai & Tea', 'slug': 'tea-chai', 'icon': '☕'},
      {'name': 'Lassi, Buttermilk & Dairy Specials', 'slug': 'dairy-lassi', 'icon': '🥛'},
      {'name': 'Sweets', 'slug': 'sweets', 'icon': '🍬'},
      {'name': 'Kulfi, Falooda & Ice Cream', 'slug': 'kulfi-ice-cream', 'icon': '🍦'},
      {'name': 'Snacks & Fast Food', 'slug': 'fast-food-snacks', 'icon': '🍔'},
      {'name': 'Rajasthani Thali', 'slug': 'rajasthani-traditional', 'icon': '🍛'},
      {'name': 'South Indian', 'slug': 'south-indian', 'icon': '🥞'},
      {'name': 'Momos', 'slug': 'momos'},
      {'name': 'Paratha', 'slug': 'paratha', 'icon': '🫓'},
      {'name': 'Juices & Shakes', 'slug': 'juices', 'icon': '🧃'},
      {'name': 'Biryani & Kebabs', 'slug': 'biryani', 'icon': '🍗'},
      {'name': 'Breakfast', 'slug': 'breakfast', 'icon': '🍳'},
    ];

/// Like the backend: every setting flat at the top level AND under `settings`; `premium` and
/// `push_available` only at the top level.
Map<String, dynamic> appConfig(FixtureMode mode, [Backend backend = const Backend()]) {
  final settings = _settings(mode, backend);
  return {
    ...settings,
    'settings': settings,
    'premium': {
      'enabled': backend.premiumEnabled,
      'payments_available': backend.premium != PremiumFixture.noPayments,
      'payment_methods': ['upi'],
      'plans': stressPlans(),
      'benefits': stressBenefits(),
    },
    'push_available': false,
    'banners': mode == FixtureMode.stress || mode == FixtureMode.vendorsDown
        ? [
            {
              'title': 'Discover the zaika hiding in every gully of the old walled city this festive season',
              'subtitle': 'Handpicked hidden gems, trusted by locals and food walkers for decades',
              // Non-http URL: AppNetworkImage falls back to the neutral placeholder.
              'image_url': 'banner-1.jpg',
              'link_type': 'url',
              'link_value': 'https://example.com',
            },
            {'title': 'घेवर उत्सव', 'subtitle': 'जयपुर की सबसे अच्छी मिठाइयाँ', 'image_url': 'banner-2.jpg'},
          ]
        : [],
    'categories': mode == FixtureMode.empty ? [] : stressCategories(),
  };
}

Map<String, dynamic> _settings(FixtureMode mode, Backend backend) => {
      'premium_enabled': backend.premiumEnabled,
      'support_phone': '+91 98290 12345',
      'instagram_url': 'https://instagram.com/hungrybird.in',
      'facebook_url': '',
      'x_url': 'https://x.com/hungrybird',
      'youtube_url': '',
      'website_url': 'https://hungry-bird-gamma.vercel.app',
      'latest_app_version': backend.latestVersion ?? '1.0.0',
      'play_store_url': 'https://play.google.com/store/apps/details?id=com.hungrybird.hungry_bird_app',
      'maintenance_mode': mode == FixtureMode.maintenance,
      'maintenance_message': 'We are upgrading our kitchen to serve you faster. HungryBird will be back in about '
          'thirty minutes — thanks for your patience while we tidy up the masala dabba. हम जल्द लौटेंगे!',
      'min_app_version': mode == FixtureMode.update ? '99.0.0' : '0.0.1',
      'force_update_message': 'This version of HungryBird is too old to talk to our new servers. Please update '
          'from the store to keep finding the best street food near you.',
      'announcement': mode == FixtureMode.stress || mode == FixtureMode.vendorsDown
          ? 'Monsoon menus are here! Hot pakoras, bhutta and masala chai at 140+ stalls across the city this week only. '
              'बारिश में गरम पकौड़े!'
          : '',
      'default_city': longCitySlug,
      'support_email': 'support-team-for-street-food-lovers@hungrybird-app.example.in',
      'allow_guest_reviews': true,
    };

List<Map<String, dynamic>> stressCommunity() => [
      {
        'id': 1,
        'vendor_id': 101,
        'vendor_name': 'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale (Since 1952)',
        'rating_value': 4.5,
        'review_text': 'Crispy, spicy, and worth the queue. The mawa kachori is a must — do not leave without trying it, '
            'and grab a lassi on the way out.',
        'author_name': 'Aishwarya Ramakrishnan-Venkataraman',
        'created_at': '2026-10-12T10:00:00',
      },
      {
        'id': 2,
        'vendor_id': 102,
        'vendor_name': _hindiLong,
        'rating_value': 5,
        'review_text': 'बहुत स्वादिष्ट घेवर! हर बार यहाँ आना पड़ता है।',
        'author_name': 'राजेंद्र प्रसाद शर्मा',
        'created_at': '2026-10-01T10:00:00',
      },
      {'id': 3, 'vendor_id': 103, 'vendor_name': 'Chai', 'rating_value': 3, 'author_name': 'A', 'created_at': null},
    ];

List<Map<String, dynamic>> stressNotifications() => [
      {
        'id': 9,
        'title': 'Twelve new hidden gems just landed in Chhatrapati Sambhajinagar (Aurangabad) — go find them first!',
        'body': 'Our moderators verified 12 community suggestions this week, including a 70-year-old kulfi cart and a '
            'chai tapri that only opens after midnight. Tap to explore them before everyone else does.',
        'link_type': 'category',
        'link_value': 'sweets',
        'created_at': '2026-10-14T09:00:00',
      },
      {
        'id': 8,
        'title': 'घेवर उत्सव शुरू!',
        'body': 'जयपुर की सबसे अच्छी मिठाई की दुकानें अब ऐप में। अभी देखें और अपने पसंदीदा स्टॉल को सेव करें।',
        'link_type': 'vendor',
        'link_value': '102',
        'created_at': '2026-10-01T09:00:00',
      },
      {'id': 7, 'title': 'Hi', 'body': 'Short.', 'created_at': '2024-01-01T09:00:00'},
    ];

Map<String, dynamic> stressUser({bool verified = true, bool premium = false}) => {
      'id': 5,
      'name': longUserName,
      'email': longUserEmail,
      'phone': '+91 98290 12345',
      'notifications_enabled': true,
      'email_verified': verified,
      'is_premium': premium,
      'premium_until': premium ? _iso(DateTime.now().add(const Duration(days: 40))) : null,
    };

/// `/api/user/reviews`: each item carries the serialized `vendor` card (locked → no name) and
/// `vendor_locked`; `vendor` is null for a stall that is no longer public.
List<Map<String, dynamic>> stressMyReviews({bool locks = false}) {
  Map<String, dynamic> card(int id) => stressVendors().firstWhere((v) => v['id'] == id);
  return [
    {
      'id': 1,
      'vendor_id': 101,
      'vendor_name': 'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale (Since 1952) — Original Shop',
      'vendor_locked': false,
      'vendor': card(101),
      'rating_value': 5,
      'review_text': 'Best pyaz kachori in the city, hands down. Crispy shell, spicy onion filling, and the tamarind '
          'chutney is perfectly balanced.',
      'created_at': '2026-10-01T10:00:00',
    },
    if (locks)
      {
        'id': 4,
        'vendor_id': 120,
        'vendor_name': null,
        'vendor_image_url': null,
        'vendor_locked': true,
        'vendor': lockedVendors().first,
        'rating_value': 5,
        'review_text': 'Worth every rupee of the pass — the best mawa kachori I have had in years.',
        'created_at': '2026-09-15T10:00:00',
      },
    {'id': 2, 'vendor_id': 102, 'vendor_name': _hindiLong, 'vendor_locked': false, 'vendor': card(102), 'rating_value': 4, 'review_text': 'बहुत स्वादिष्ट!', 'created_at': '2026-09-01T10:00:00'},
    {'id': 3, 'vendor_id': 103, 'vendor_name': null, 'vendor_locked': false, 'vendor': null, 'rating_value': 3, 'created_at': null},
  ];
}

List<Map<String, dynamic>> stressSubmissions() => [
      {
        'id': 1,
        'stall_name': 'Baba Ka Dhaba Next To The Big Banyan Tree Behind The Railway Colony Post Office',
        'cuisine_type': 'Kachori, Samosa & Mirchi Vada',
        'city_name': longCityName,
        'status': 'pending',
        'approx_address': 'Railway Colony, Gate No. 3, behind the post office, near the old water tank',
        'created_at': '2026-10-10T10:00:00',
      },
      {
        'id': 2,
        'stall_name': _hindiLong,
        'status': 'rejected',
        'review_notes': 'We could not find this stall at the pinned location. Please re-submit with a photo of the '
            'board and an exact pin — हमें यह दुकान नहीं मिली।',
        'created_at': '2026-08-10T10:00:00',
      },
      {'id': 3, 'stall_name': 'Chai', 'status': 'approved', 'city_name': 'Jaipur', 'created_at': '2026-01-10T10:00:00'},
    ];

/// MockClient answering every endpoint the app calls, in the backend's shapes (every JSON error
/// has a `code`). [calls] (optional) records "METHOD path".
http.Client fakeBackend(FixtureMode mode, [Backend backend = const Backend(), List<String>? calls]) {
  final stress = mode == FixtureMode.stress || mode == FixtureMode.vendorsDown;
  // Mutable account state, so verifying an email or paying actually changes later answers.
  var verified = backend.emailVerified;
  var premium = backend.premium == PremiumFixture.active;
  return MockClient((request) async {
    final path = request.url.path;
    calls?.add('${request.method} $path');
    Object? body;
    var status = 200;
    final locks = backend.premiumEnabled && !premium;

    final down = (mode == FixtureMode.offline && path != '/api/app/config') ||
        (mode == FixtureMode.vendorsDown && path.startsWith('/api/vendors'));
    if (down) {
      // A gateway / cold-start failure: not one of the API's own (coded) errors.
      return http.Response(
        jsonEncode({'error': 'The server is taking too long to respond. Please check your connection and try again.'}),
        503,
      );
    }
    final failWith = backend.errors[path];
    if (failWith != null) return _error(failWith);

    final trailId = RegExp(r'^/api/trails/(\d+)$').firstMatch(path);
    if (path == '/api/app/config') {
      body = appConfig(mode, backend);
    } else if (path == '/api/cities') {
      body = {'cities': stress || mode != FixtureMode.empty ? stressCities() : stressCities().take(1).toList()};
    } else if (path == '/api/categories') {
      body = {'categories': stress ? stressCategories().take(8).toList() : []};
    } else if (path == '/api/vendors' || path == '/api/vendors/nearby') {
      // Locked Premium gems first (so lazy lists build them); never in nearby (no coordinates).
      final vendors = stress ? [if (locks && path == '/api/vendors') ...lockedVendors(), ...stressVendors()] : <Map<String, dynamic>>[];
      body = {'vendors': vendors, 'count': vendors.length, 'total': stress ? 12873 : 0};
    } else if (path == '/api/vendors/103') {
      body = minimalVendorDetail();
    } else if (locks && lockedVendors().any((v) => path == '/api/vendors/${v['id']}')) {
      body = lockedVendorDetail(int.parse(path.split('/').last));
    } else if (path.startsWith('/api/vendors/')) {
      body = stressVendorDetail();
    } else if (path == '/api/trails') {
      body = {'trails': stress ? stressTrails(locked: locks) : [], 'count': stress ? 2 : 0};
    } else if (trailId != null) {
      // The trail at the top level and again under `trail`.
      final trail = stressTrails(locked: locks).firstWhere((t) => '${t['id']}' == trailId.group(1), orElse: () => const {});
      if (trail.isEmpty) return _error('NOT_FOUND', 'Not found');
      body = {...trail, 'trail': trail};
    } else if (path == '/api/vendor-reviews') {
      body = {'reviews': stress ? stressCommunity() : []};
    } else if (path == '/api/notifications') {
      body = {'notifications': stress ? stressNotifications() : []};
    } else if (path == '/api/auth/me') {
      body = {'user': stressUser(verified: verified, premium: premium)};
    } else if (path == '/api/favorites') {
      body = {'favorites': stress ? [if (locks) lockedVendors().first, ...stressVendors().take(3)] : []};
    } else if (path == '/api/favorites/sync') {
      body = {'vendor_ids': []};
    } else if (path == '/api/user/reviews') {
      body = {'reviews': stress ? stressMyReviews(locks: locks) : []};
    } else if (path == '/api/user/submissions') {
      body = {'submissions': stress ? stressSubmissions() : []};
    } else if (path == '/api/auth/login') {
      return _error('INVALID_CREDENTIALS');
    } else if (path == '/api/auth/register') {
      verified = false;
      status = 201;
      body = {'message': 'Registered successfully', 'token': 'new-token', 'user': stressUser(verified: false), 'verification_sent': true};
    } else if (path == '/api/auth/email/send-code') {
      if (verified) return _error('ALREADY_VERIFIED');
      body = {'sent': true, 'resend_after': 60};
    } else if (path == '/api/auth/email/verify') {
      verified = true;
      body = {'user': stressUser(premium: premium)};
    } else if (path == '/api/auth/password/forgot' || path == '/api/auth/password/reset') {
      body = {'ok': true};
    } else if (path == '/api/auth/profile') {
      final sent = jsonDecode(request.body) as Map<String, dynamic>;
      final changed = sent['email'] != longUserEmail;
      // A new email needs the current password (the fixture's "wrong" one is literally `wrong`).
      final password = sent['current_password'];
      if (changed && (password is! String || password.isEmpty || password == 'wrong')) return _error('INVALID_PASSWORD');
      if (changed) verified = false;
      body = {
        'message': 'Profile updated successfully',
        'user': {...stressUser(verified: verified, premium: premium), 'name': sent['name'], 'email': sent['email']},
        if (changed) 'verification_sent': true,
      };
    } else if (path == '/api/auth/account' && request.method == 'DELETE') {
      // Permanent, so the password is re-checked (the fixture's wrong one is literally `wrong`).
      final password = request.body.isEmpty ? null : (jsonDecode(request.body) as Map)['current_password'];
      if (password is! String || password.isEmpty || password == 'wrong') return _error('INVALID_PASSWORD', 'Current password is incorrect');
      body = {'message': 'Account deleted successfully'};
    } else if (path == '/api/auth/password') {
      body = {'message': 'Password updated', 'token': 'fresh-token', 'user': stressUser(verified: verified, premium: premium)};
    } else if (path == '/api/premium/plans') {
      body = stressPlans();
    } else if (path == '/api/premium/status') {
      body = premiumStatusJson(active: premium);
    } else if (path == '/api/payments/order') {
      body = paymentOrderJson(asPlanId((jsonDecode(request.body) as Map)['plan_id']));
    } else if (path == '/api/payments/verify') {
      premium = true;
      body = {'ok': true, 'user': stressUser(verified: verified, premium: true)};
    } else if (path == '/api/submit-vendor') {
      body = {'message': 'Thanks! Our team will verify it shortly.'};
    } else {
      return _error('NOT_FOUND', 'Not found');
    }
    return http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});
  });
}

int asPlanId(Object? value) => value is int ? value : int.tryParse('$value') ?? 1;
