import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hungry_bird_app/app.dart';
import 'package:hungry_bird_app/core/api_client.dart';
import 'package:hungry_bird_app/services/hungry_bird_api.dart';
import 'package:hungry_bird_app/services/local_store.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> _vendor(int id, String name, {bool gem = false, double? rating, int total = 0}) => {
      'id': id,
      'name': name,
      'cuisine_type': 'Street Food',
      'area': 'Johari Bazaar',
      'city_name': 'Jaipur',
      'rating': rating,
      'avg_rating': rating ?? 4.5,
      'total_ratings': total,
      'is_hidden_gem': gem,
      'image_url': null,
      'specialty_dish': 'Pyaz Kachori',
    };

/// Fake backend covering every endpoint the home, explore and detail screens call.
http.Client _fakeBackend(List<String> calls) {
  return MockClient((request) async {
    final path = request.url.path;
    calls.add('${request.method} $path');
    Object body;
    switch (path) {
      case '/api/app/config':
        body = {
          'settings': {'maintenance_mode': false, 'min_app_version': '0.0.1', 'announcement': 'Monsoon menus are here!'},
          'banners': [],
          'categories': [
            {'name': 'Chai & Tea', 'slug': 'tea-chai', 'icon': '☕'},
          ],
        };
      case '/api/cities':
        body = {
          'cities': [
            {'id': 1, 'name': 'Jaipur', 'slug': 'jaipur', 'lat': 26.9, 'lng': 75.8, 'vendor_count': 3},
          ],
        };
      case '/api/vendors':
        final gems = request.url.queryParameters['is_hidden_gem'] == 'true';
        final vendors = gems
            ? [_vendor(1, 'Gopal Kachori', gem: true, rating: 4.7, total: 12)]
            : [_vendor(2, 'Sahu Chai', rating: 4.4, total: 30), _vendor(3, 'Brand New Stall')];
        body = {'vendors': vendors, 'count': vendors.length, 'total': vendors.length};
      case '/api/vendors/2':
        body = {
          'is_favorite': false,
          'vendor': {
            ..._vendor(2, 'Sahu Chai', rating: 4.4, total: 30),
            'description': 'Kulhad chai since 1968.',
            'opening_hours': '6 AM - 10 PM',
            'city': {'id': 1, 'name': 'Jaipur', 'slug': 'jaipur'},
          },
          'reviews': [
            {'id': 11, 'rating_value': 5, 'review_text': 'Best chai in town', 'author_name': 'Meera', 'created_at': '2026-10-01T10:00:00'},
          ],
          'nearby': [],
        };
      case '/api/trails':
        body = {'trails': []};
      case '/api/vendor-reviews':
        body = {'reviews': []};
      case '/api/notifications':
        body = {
          'notifications': [
            {'id': 4, 'title': 'New gems', 'body': 'Fresh stalls added', 'created_at': '2026-10-08T09:00:00'},
          ],
        };
      case '/api/auth/login':
        final creds = jsonDecode(request.body) as Map<String, dynamic>;
        if (creds['password'] != 'secret123') {
          return http.Response(jsonEncode({'error': 'Invalid email or password'}), 401);
        }
        body = {
          'token': 'test-token',
          'user': {'id': 5, 'name': 'Priya Sharma', 'email': creds['email'], 'notifications_enabled': true},
        };
      case '/api/favorites/sync':
        body = {'vendor_ids': (jsonDecode(request.body) as Map)['vendor_ids']};
      case '/api/favorites':
        body = {
          'favorites': [_vendor(2, 'Sahu Chai', rating: 4.4, total: 30)],
        };
      case '/api/user/reviews':
        body = {'reviews': []};
      case '/api/user/submissions':
        body = {'submissions': []};
      default:
        return http.Response(jsonEncode({'error': 'not found'}), 404);
    }
    return http.Response.bytes(utf8.encode(jsonEncode(body)), 200, headers: {'content-type': 'application/json'});
  });
}

Future<void> _pumpFor(WidgetTester tester, Duration total) async {
  const step = Duration(milliseconds: 100);
  for (var t = Duration.zero; t < total; t += step) {
    await tester.pump(step);
  }
}

void main() {
  testWidgets('boots to home, browses explore and opens a vendor', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 2.6;
    addTearDown(tester.view.reset);

    SharedPreferences.setMockInitialValues({'pref_onboarding_done': true});
    FlutterSecureStorage.setMockInitialValues({});
    PackageInfo.setMockInitialValues(
      appName: 'HungryBird',
      packageName: 'com.hungrybird.hungry_bird_app',
      version: '1.0.0',
      buildNumber: '1',
      buildSignature: '',
    );
    final store = await LocalStore.create();
    final calls = <String>[];
    final api = HungryBirdApi(ApiClient(client: _fakeBackend(calls), baseUrl: 'https://api.test'));

    await tester.pumpWidget(HungryBirdApp(store: store, api: api));
    await _pumpFor(tester, const Duration(seconds: 2));

    // Home
    expect(find.text('Jaipur'), findsWidgets);
    expect(find.text('Monsoon menus are here!'), findsOneWidget);
    expect(find.text('Gopal Kachori'), findsOneWidget);
    expect(find.text('Hidden gems 💎'), findsOneWidget);
    expect(find.byTooltip('Notifications'), findsOneWidget);
    expect(calls, contains('GET /api/app/config'));

    // Explore tab lists vendors from the API
    await tester.tap(find.bySemanticsLabel('Explore'));
    await _pumpFor(tester, const Duration(seconds: 1));
    expect(find.text('Explore'), findsWidgets);
    expect(find.text('Sahu Chai'), findsWidgets);
    expect(find.textContaining('2 stalls in Jaipur'), findsOneWidget);

    // Vendor detail
    await tester.tap(find.text('Sahu Chai').last);
    await _pumpFor(tester, const Duration(seconds: 1));
    expect(find.text('Kulhad chai since 1968.'), findsOneWidget);
    expect(find.text('Get directions'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Best chai in town'), 250, scrollable: find.byType(Scrollable).first);
    expect(find.text('Best chai in town'), findsOneWidget);

    // Saving as a guest works offline-first
    await tester.tap(find.bySemanticsLabel('Save').first);
    await _pumpFor(tester, const Duration(milliseconds: 600));
    expect(find.bySemanticsLabel('Remove from saved'), findsWidgets);

    // Back to tabs: Saved shows the stall
    await tester.pageBack();
    await _pumpFor(tester, const Duration(milliseconds: 600));
    await tester.tap(find.bySemanticsLabel('Saved (1)'));
    await _pumpFor(tester, const Duration(milliseconds: 600));
    expect(find.text('1 stall on your list'), findsOneWidget);
  });

  testWidgets('login merges guest favourites, then logout returns to guest', (tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 2.6;
    addTearDown(tester.view.reset);

    SharedPreferences.setMockInitialValues({
      'pref_onboarding_done': true,
      'guest_favorites': jsonEncode([_vendor(2, 'Sahu Chai', rating: 4.4, total: 30)]),
    });
    FlutterSecureStorage.setMockInitialValues({});
    PackageInfo.setMockInitialValues(
      appName: 'HungryBird',
      packageName: 'com.hungrybird.hungry_bird_app',
      version: '1.0.0',
      buildNumber: '1',
      buildSignature: '',
    );
    final store = await LocalStore.create();
    final calls = <String>[];
    final api = HungryBirdApi(ApiClient(client: _fakeBackend(calls), baseUrl: 'https://api.test'));

    await tester.pumpWidget(HungryBirdApp(store: store, api: api));
    await _pumpFor(tester, const Duration(seconds: 2));

    await tester.tap(find.bySemanticsLabel('Profile'));
    await _pumpFor(tester, const Duration(milliseconds: 600));
    expect(find.text('Join the HungryBird flock'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Log in'));
    await _pumpFor(tester, const Duration(milliseconds: 600));

    // Wrong password shows the server's message.
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'priya@example.com');
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'nope');
    await tester.tap(find.widgetWithText(FilledButton, 'Log in'));
    await _pumpFor(tester, const Duration(milliseconds: 600));
    expect(find.text('Invalid email or password'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'secret123');
    await tester.tap(find.widgetWithText(FilledButton, 'Log in'));
    await _pumpFor(tester, const Duration(seconds: 1));

    expect(find.text('Priya Sharma'), findsOneWidget);
    expect(calls, containsAllInOrder(['POST /api/auth/login', 'POST /api/favorites/sync', 'GET /api/favorites']));
    expect(find.bySemanticsLabel('Saved (1)'), findsOneWidget);
    expect(await store.readToken(), 'test-token');

    // Log out
    await tester.scrollUntilVisible(find.text('Log out'), 300, scrollable: find.byType(Scrollable).first);
    // Lift it clear of the floating nav bar before tapping.
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
    await _pumpFor(tester, const Duration(milliseconds: 300));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Log out'));
    await _pumpFor(tester, const Duration(milliseconds: 400));
    await tester.tap(find.widgetWithText(FilledButton, 'Log out'));
    await _pumpFor(tester, const Duration(milliseconds: 800));
    expect(find.text('Join the HungryBird flock'), findsOneWidget);
    expect(await store.readToken(), isNull);
  });
}
