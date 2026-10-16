// Fake backend + JSON fixtures for the responsive matrix.
//
// `stress` packs every layout hazard we could think of into realistic payloads:
// very long English and Devanagari names, long addresses, 5-digit review counts,
// lots of categories/cities/chips, missing images. `empty` returns empty lists
// everywhere; `offline` fails everything but the config (splash error), `vendorsDown`
// fails only the vendor endpoints so in-screen error states render.
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

enum FixtureMode { stress, empty, offline, vendorsDown, maintenance, update }

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
}) =>
    {
      'id': id,
      'name': name,
      'cuisine_type': cuisine,
      'area': area,
      'city_name': city,
      'city': {'id': 1, 'name': city, 'slug': longCitySlug},
      'rating': rating,
      'avg_rating': rating ?? 4.5,
      'total_ratings': total,
      'is_hidden_gem': gem,
      'is_famous': famous,
      'is_verified': true,
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

Map<String, dynamic> appConfig(FixtureMode mode) => {
      'settings': {
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
      },
      'banners': mode == FixtureMode.stress || mode == FixtureMode.vendorsDown
          ? [
              {
                'title': 'Discover the zaika hiding in every gully of the old walled city this festive season',
                'subtitle': 'Handpicked hidden gems, trusted by locals and food walkers for decades',
                // Non-http URL: AppNetworkImage falls back to the bundled placeholder.
                'image_url': 'banner-1.jpg',
                'link_type': 'url',
                'link_value': 'https://example.com',
              },
              {'title': 'घेवर उत्सव', 'subtitle': 'जयपुर की सबसे अच्छी मिठाइयाँ', 'image_url': 'banner-2.jpg'},
            ]
          : [],
      'categories': mode == FixtureMode.empty ? [] : stressCategories(),
    };

List<Map<String, dynamic>> stressTrails() => [
      {
        'id': 1,
        'title': 'The Great Walled City Breakfast Crawl: Kachori, Lassi, Jalebi and Chai Before the Shops Open',
        'description': 'A two-hour walk through the pink city\'s oldest breakfast institutions, ending with a kulhad '
            'chai at the stall that has been pouring since 1968. Wear comfortable shoes and come hungry. '
            '$_hindiLong.',
        'duration': '2.5 hours (morning)',
        'budget': '₹350 – ₹600 per person',
        'stops': [
          'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale',
          'Lassiwala (The Original One, Not The Copies Next Door)',
          _hindiLong,
          'Pandit Kulfi',
          'Sahu Chai',
          'Gopal Kachori',
          'Masala Chowk Pani Puri & Chaat Corner',
          'Samrat Gol Gappe',
          'Shri Ganesh Ji Ki Kachori Aur Samose Ki Dukaan',
          'Laxmi Misthan Bhandar (LMB)',
          'Kanha Sweets',
          'Rawat Kachori (second branch)',
        ],
      },
      {'id': 2, 'title': 'Chai trail', 'stops': ['Sahu Chai'], 'duration': '1 h'},
    ];

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

Map<String, dynamic> stressUser() => {
      'id': 5,
      'name': longUserName,
      'email': longUserEmail,
      'phone': '+91 98290 12345',
      'notifications_enabled': true,
      'created_at': '2024-02-29T10:00:00',
    };

List<Map<String, dynamic>> stressMyReviews() => [
      {
        'id': 1,
        'vendor_id': 101,
        'vendor_name': 'Shree Rawat Mishthan Bhandar & Famous Pyaz Kachori Wale (Since 1952) — Original Shop',
        'rating_value': 5,
        'review_text': 'Best pyaz kachori in the city, hands down. Crispy shell, spicy onion filling, and the tamarind '
            'chutney is perfectly balanced.',
        'created_at': '2026-10-01T10:00:00',
      },
      {'id': 2, 'vendor_id': 102, 'vendor_name': _hindiLong, 'rating_value': 4, 'review_text': 'बहुत स्वादिष्ट!', 'created_at': '2026-09-01T10:00:00'},
      {'id': 3, 'vendor_id': null, 'vendor_name': 'Chai', 'rating_value': 3, 'created_at': null},
    ];

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

/// MockClient answering every endpoint the app calls.
http.Client fakeBackend(FixtureMode mode) {
  final stress = mode == FixtureMode.stress || mode == FixtureMode.vendorsDown;
  return MockClient((request) async {
    final path = request.url.path;
    Object? body;
    var status = 200;

    final down = (mode == FixtureMode.offline && path != '/api/app/config') ||
        (mode == FixtureMode.vendorsDown && path.startsWith('/api/vendors'));
    if (down) {
      return http.Response(
        jsonEncode({'error': 'The server is taking too long to respond. Please check your connection and try again.'}),
        503,
      );
    }

    if (path == '/api/app/config') {
      body = appConfig(mode);
    } else if (path == '/api/cities') {
      body = {'cities': stress || mode != FixtureMode.empty ? stressCities() : stressCities().take(1).toList()};
    } else if (path == '/api/vendors' || path == '/api/vendors/nearby') {
      final vendors = stress ? stressVendors() : <Map<String, dynamic>>[];
      body = {'vendors': vendors, 'count': vendors.length, 'total': stress ? 12873 : 0};
    } else if (path == '/api/vendors/103') {
      body = minimalVendorDetail();
    } else if (path.startsWith('/api/vendors/')) {
      body = stressVendorDetail();
    } else if (path == '/api/trails') {
      body = {'trails': stress ? stressTrails() : []};
    } else if (path == '/api/vendor-reviews') {
      body = {'reviews': stress ? stressCommunity() : []};
    } else if (path == '/api/notifications') {
      body = {'notifications': stress ? stressNotifications() : []};
    } else if (path == '/api/auth/me') {
      body = {'user': stressUser()};
    } else if (path == '/api/favorites') {
      body = {'favorites': stress ? stressVendors().take(3).toList() : []};
    } else if (path == '/api/favorites/sync') {
      body = {'vendor_ids': []};
    } else if (path == '/api/user/reviews') {
      body = {'reviews': stress ? stressMyReviews() : []};
    } else if (path == '/api/user/submissions') {
      body = {'submissions': stress ? stressSubmissions() : []};
    } else if (path == '/api/auth/login') {
      status = 401;
      body = {'error': "That email and password don't match any HungryBird account. Check for typos or reset it from Help."};
    } else if (path == '/api/submit-vendor') {
      body = {'message': 'Thanks! Our team will verify it shortly.'};
    } else {
      status = 404;
      body = {'error': 'not found'};
    }
    return http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});
  });
}
