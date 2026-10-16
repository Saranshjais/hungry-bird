// End-to-end flows of the launch build against the fake backend: buying Premium on Android
// (Razorpay's platform channel is stubbed), iOS never selling, email verification after
// sign-up and the forgot → reset → log in loop.
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hungry_bird_app/app.dart';
import 'package:hungry_bird_app/core/api_client.dart';
import 'package:hungry_bird_app/core/router.dart';
import 'package:hungry_bird_app/screens/auth/auth_widgets.dart';
import 'package:hungry_bird_app/screens/auth/login_screen.dart';
import 'package:hungry_bird_app/screens/home/home_widgets.dart';
import 'package:hungry_bird_app/screens/premium/paywall.dart';
import 'package:hungry_bird_app/screens/vendor/vendor_detail_screen.dart';
import 'package:hungry_bird_app/services/hungry_bird_api.dart';
import 'package:hungry_bird_app/services/local_store.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'responsive/fixtures.dart';
import 'responsive/harness.dart';

Future<LocalStore> _boot(
  WidgetTester tester, {
  Backend backend = const Backend(),
  bool loggedIn = false,
  List<String>? calls,
  Map<String, Object?>? checkoutResult,
  List<Map<dynamic, dynamic>>? opened,
}) async {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  appReady.value = false;
  SharedPreferences.setMockInitialValues({'pref_onboarding_done': true});
  FlutterSecureStorage.setMockInitialValues(loggedIn ? {'auth_token': 'test-token'} : {});
  PackageInfo.setMockInitialValues(
    appName: 'HungryBird',
    packageName: 'com.hungrybird.hungry_bird_app',
    version: '1.0.0',
    buildNumber: '1',
    buildSignature: '',
  );
  final messenger = tester.binding.defaultBinaryMessenger;
  mockRazorpay(messenger, result: checkoutResult, opened: opened);
  addTearDown(() => messenger.setMockMethodCallHandler(razorpayChannel, null));

  final store = await LocalStore.create();
  final api = HungryBirdApi(ApiClient(client: fakeBackend(FixtureMode.stress, backend, calls), baseUrl: 'https://api.test'));
  await tester.pumpWidget(HungryBirdApp(store: store, api: api));
  await settle(tester, const Duration(seconds: 2));
  return store;
}

void main() {

  testWidgets('Android: paying with UPI verifies server-side and unlocks Premium', (tester) async {
    final calls = <String>[];
    final opened = <Map<dynamic, dynamic>>[];
    await _boot(tester, backend: const Backend(premium: PremiumFixture.locked), loggedIn: true, calls: calls, opened: opened);

    await pushTo(tester, '/premium');
    await tester.tap(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'));
    await settle(tester, const Duration(seconds: 2));

    expect(find.text('Welcome to Premium!'), findsOneWidget);
    expect(calls, containsAllInOrder(['POST /api/payments/order', 'POST /api/payments/verify']));
    final options = opened.single;
    expect(options['key'], 'rzp_test_key');
    expect(options['order_id'], 'order_TEST123');
    expect(options['amount'], 4900);
    expect(options['currency'], 'INR');
    expect((options['method'] as Map)['upi'], isTrue);
    expect((options['method'] as Map)['card'], isFalse);

    await tester.tap(find.text('Start exploring'));
    await settle(tester);
    expect(find.text('Premium is active'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('Android: a cancelled checkout charges nothing and verifies nothing', (tester) async {
    final calls = <String>[];
    await _boot(
      tester,
      backend: const Backend(premium: PremiumFixture.locked),
      loggedIn: true,
      calls: calls,
      checkoutResult: {
        'type': 1,
        'data': {'code': 2, 'message': 'Payment cancelled by user'},
      },
    );

    await pushTo(tester, '/premium');
    await tester.tap(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'));
    await settle(tester);

    expect(find.text('Payment cancelled. You haven\'t been charged.'), findsOneWidget);
    expect(calls, contains('POST /api/payments/order'));
    expect(calls, isNot(contains('POST /api/payments/verify')));
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('Android: an unverified account verifies its email before paying', (tester) async {
    final calls = <String>[];
    await _boot(tester, backend: const Backend(premium: PremiumFixture.locked, emailVerified: false), loggedIn: true, calls: calls);

    await pushTo(tester, '/premium');
    await tester.tap(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'));
    await settle(tester);

    expect(find.text('Verify your email'), findsOneWidget);
    expect(calls, contains('POST /api/auth/email/send-code'));
    expect(calls, isNot(contains('POST /api/payments/order')));
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('iOS: locked content never offers a purchase', (tester) async {
    await _boot(tester, backend: const Backend(premium: PremiumFixture.locked), loggedIn: true);

    await pushTo(tester, '/vendor/120');
    expect(find.text('Premium hidden gem'), findsWidgets);
    expect(find.byType(PlanTile), findsNothing);
    expect(find.textContaining('Pay'), findsNothing);
    expect(find.textContaining('Unlock with Premium'), findsNothing);
    expect(find.text('Premium isn\'t active on this account.'), findsOneWidget);

    await pushTo(tester, '/premium');
    expect(find.byType(PlanTile), findsNothing);
    expect(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('Premium switched off: nothing is locked and no Premium UI shows', (tester) async {
    await _boot(tester, loggedIn: true);
    await goTo(tester, '/explore');
    expect(find.text('Premium hidden gem'), findsNothing);
    await goTo(tester, '/profile');
    expect(find.text('Get Premium'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('sign-up leads to "Verify your email"; the code verifies the account', (tester) async {
    final calls = <String>[];
    await _boot(tester, calls: calls);

    await pushTo(tester, '/register');
    await tester.enterText(find.widgetWithText(TextFormField, 'Full name'), 'Priya Sharma');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'priya@example.com');
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'masala123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm password'), 'masala123');
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Create account'));
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await settle(tester);

    expect(find.text('Verify your email'), findsOneWidget);
    // A code was just sent with the sign-up: the screen doesn't send another one.
    expect(calls, isNot(contains('POST /api/auth/email/send-code')));
    expect(find.textContaining('Resend code in'), findsOneWidget);

    // Pasting a whole sentence keeps just the digits.
    await tester.enterText(find.byType(OtpCodeField), 'Your HungryBird code: 482 913');
    await settle(tester);
    expect(calls, contains('POST /api/auth/email/verify'));
    expect(find.text('Verify your email'), findsNothing);
  });

  testWidgets('forgot password → code + new password → back to log in with the email filled in', (tester) async {
    final calls = <String>[];
    await _boot(tester, calls: calls);

    await pushTo(tester, '/login');
    await tester.tap(find.text('Forgot password?'));
    await settle(tester);
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'priya@example.com');
    await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
    await settle(tester);
    expect(calls, contains('POST /api/auth/password/forgot'));
    expect(find.text('Set a new password'), findsOneWidget);

    await tester.enterText(find.byType(OtpCodeField), '654321');
    await tester.enterText(find.widgetWithText(TextFormField, 'New password'), 'masala123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm new password'), 'masala123');
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Update password'));
    await tester.tap(find.widgetWithText(FilledButton, 'Update password'));
    await settle(tester);
    final reset = calls.lastIndexOf('POST /api/auth/password/reset');
    expect(reset, isNonNegative);
    expect(find.text('Password updated'), findsOneWidget);

    await tester.tap(find.text('Back to log in'));
    await settle(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
    final email = tester.widget<TextFormField>(find.widgetWithText(TextFormField, 'Email'));
    expect(email.controller!.text, 'priya@example.com');
    expect(find.text('Password updated. Log in with your new password.'), findsOneWidget);
  });

  testWidgets('reset errors are explained, not dumped', (tester) async {
    await _boot(tester, backend: const Backend(errors: {'/api/auth/password/reset': 'TOO_MANY_ATTEMPTS'}));
    await pushTo(tester, '/reset-password?email=priya@example.com');
    await tester.enterText(find.byType(OtpCodeField), '111111');
    await tester.enterText(find.widgetWithText(TextFormField, 'New password'), 'masala123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm new password'), 'masala123');
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Update password'));
    await tester.tap(find.widgetWithText(FilledButton, 'Update password'));
    await settle(tester);
    expect(find.text(authErrorMessage(ApiException('x', code: ApiErrorCode.tooManyAttempts))), findsOneWidget);
  });

  testWidgets('trail stops linked to a stall open that stall', (tester) async {
    await _boot(tester);
    // The trails sit near the end of home; `reveal` keeps them clear of the floating nav bar.
    await tapVisible(tester, find.byType(TrailCard));
    final stop = find.descendant(
      of: find.byType(BottomSheet),
      matching: find.text('Lassiwala (The Original One, Not The Copies Next Door)'),
    );
    await tester.ensureVisible(stop);
    await tester.tap(stop);
    await settle(tester);
    expect(tester.widget<VendorDetailScreen>(find.byType(VendorDetailScreen)).vendorId, 105);
  });

  testWidgets('a rejected token (401 on any authenticated call) quietly continues as a guest', (tester) async {
    final calls = <String>[];
    final store = await _boot(
      tester,
      loggedIn: true,
      calls: calls,
      // e.g. a token minted before the server upgrade, or revoked by a password reset elsewhere.
      backend: const Backend(errors: {'/api/user/reviews': 'UNAUTHORIZED'}),
    );
    await goTo(tester, '/profile');
    await settle(tester);

    expect(find.text('Join the HungryBird flock'), findsOneWidget);
    expect(await store.readToken(), isNull);
    // No retry loop on the dead token.
    expect(calls.where((c) => c == 'GET /api/user/reviews').length, 1);
  });

  testWidgets('changing the password stores the fresh token (the old one is revoked)', (tester) async {
    final store = await _boot(tester, loggedIn: true);
    await pushTo(tester, '/profile/password');
    await tester.enterText(find.widgetWithText(TextFormField, 'Current password'), 'old-password1');
    await tester.enterText(find.widgetWithText(TextFormField, 'New password'), 'masala123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm new password'), 'masala123');
    await tester.tap(find.widgetWithText(FilledButton, 'Update password'));
    await settle(tester);
    expect(await store.readToken(), 'fresh-token');
  });

  testWidgets('deleting the account needs the password: wrong → error, dialog stays; right → guest', (tester) async {
    final calls = <String>[];
    final store = await _boot(tester, loggedIn: true, calls: calls);
    await pushTo(tester, '/settings');
    await tapVisible(tester, find.text('Delete account'));

    final dialog = find.byType(AlertDialog);
    final fields = find.descendant(of: dialog, matching: find.byType(TextField));
    final delete = find.descendant(of: dialog, matching: find.widgetWithText(FilledButton, 'Delete'));
    await tester.enterText(fields.first, 'DELETE');
    await tester.pump();
    expect(tester.widget<FilledButton>(delete).onPressed, isNull, reason: 'disabled until the password is filled');

    await tester.enterText(fields.last, 'wrong');
    await tester.pump();
    await tester.tap(delete);
    await settle(tester);
    expect(find.text('That password isn\'t right. Your account was not deleted.'), findsOneWidget);
    expect(dialog, findsOneWidget);
    expect(await store.readToken(), 'test-token');

    await tester.enterText(fields.last, 'right-password1');
    await tester.pump();
    expect(find.text('That password isn\'t right. Your account was not deleted.'), findsNothing);
    await tester.tap(delete);
    await settle(tester);
    expect(calls.where((c) => c == 'DELETE /api/auth/account').length, 2);
    expect(dialog, findsNothing);
    expect(await store.readToken(), isNull);
    await goTo(tester, '/profile');
    expect(find.text('Join the HungryBird flock'), findsOneWidget);
  });

  testWidgets('the delete dialog links to "Forgot password?"', (tester) async {
    await _boot(tester, loggedIn: true);
    await pushTo(tester, '/settings');
    await tapVisible(tester, find.text('Delete account'));
    await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Forgot password?')));
    await settle(tester);
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Forgot your password?'), findsOneWidget);
    final email = tester.widget<TextFormField>(find.widgetWithText(TextFormField, 'Email'));
    expect(email.controller!.text, longUserEmail);
  });

  test('DELETE carries the password in its JSON body', () async {
    late http.Request sent;
    final api = HungryBirdApi(ApiClient(
      client: MockClient((request) async {
        sent = request;
        return http.Response(jsonEncode({'message': 'Account deleted successfully'}), 200);
      }),
      baseUrl: 'https://api.test',
    ));
    await api.deleteAccount(currentPassword: 'masala123');
    expect(sent.method, 'DELETE');
    expect(sent.headers['Content-Type'], startsWith('application/json'));
    expect(jsonDecode(sent.body), {'current_password': 'masala123'});
  });

  group('API shapes from the final backend', () {
    HungryBirdApi api([Backend backend = const Backend(premium: PremiumFixture.locked)]) =>
        HungryBirdApi(ApiClient(client: fakeBackend(FixtureMode.stress, backend), baseUrl: 'https://api.test'));

    test('config: flattened settings + top-level premium and push flag', () async {
      final config = await api().getAppConfig();
      expect(config.settings.premium.enabled, isTrue);
      expect(config.settings.premium.plans, hasLength(3));
      expect(config.settings.supportPhone, '+91 98290 12345');
      expect(config.settings.pushAvailable, isFalse);
      expect(config.settings.defaultCity, longCitySlug);
    });

    test('trail detail (top level and under `trail`), bare plans list, wrapped locked detail', () async {
      final trail = await api().getTrail(1);
      expect(trail.locked, isTrue);
      expect(trail.stopCount, 12);
      expect(await api().getPremiumPlans(), hasLength(3));
      final locked = await api().getVendor(120);
      expect(locked.locked, isTrue);
      expect(locked.vendor.name, isNull);
      expect(locked.vendor.lockedReason, 'premium');
    });

    test('my reviews of locked gems carry no name', () async {
      final client = api();
      client.token = 'test-token';
      final reviews = await client.myReviews();
      expect(reviews.where((r) => r.vendorLocked).single.vendorName, 'Premium hidden gem');
    });
  });

  test('fixtures stay valid JSON', () {
    expect(() => jsonEncode(appConfig(FixtureMode.stress, const Backend(premium: PremiumFixture.locked))), returnsNormally);
  });
}
