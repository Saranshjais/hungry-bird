// Premium: the Premium screen (Android sells, iOS only reports), locked cards and detail,
// the paywall and trail sheets, a completed purchase and the optional update prompt.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/screens/home/home_widgets.dart';
import 'package:hungry_bird_app/screens/premium/paywall.dart';
import 'package:hungry_bird_app/screens/premium/premium_screen.dart';

import 'fixtures.dart';
import 'harness.dart';

const _locked = Backend(premium: PremiumFixture.locked);

Future<void> _openPaywall(WidgetTester tester) async {
  await goTo(tester, '/explore');
  await tapVisible(tester, find.text('Premium hidden gem'));
  expect(find.byType(PaywallPanel), findsOneWidget);
}

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(Scenario(
    'premium_android',
    loggedIn: true,
    backend: _locked,
    platform: TargetPlatform.android,
    open: (tester) async {
      await pushTo(tester, '/premium');
      expect(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'premium_ios',
    loggedIn: true,
    backend: _locked,
    platform: TargetPlatform.iOS,
    open: (tester) async {
      await pushTo(tester, '/premium');
      // App Store rule 3.1.1: no plans, prices or buy button anywhere on the iOS Premium screen.
      final screen = find.byType(PremiumScreen, skipOffstage: false);
      expect(find.descendant(of: screen, matching: find.byType(PlanTile, skipOffstage: false)), findsNothing);
      expect(find.descendant(of: screen, matching: find.textContaining('₹', skipOffstage: false)), findsNothing);
      expect(find.descendant(of: screen, matching: find.textContaining('Pay', skipOffstage: false)), findsNothing);
    },
  ));
  responsiveScenario(Scenario(
    'premium_active',
    loggedIn: true,
    backend: const Backend(premium: PremiumFixture.active),
    open: (tester) async {
      await pushTo(tester, '/premium');
      expect(find.text('Premium is active'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario('premium_guest', backend: _locked, open: (tester) => pushTo(tester, '/premium')));
  responsiveScenario(Scenario(
    'premium_no_payments',
    loggedIn: true,
    platform: TargetPlatform.android,
    backend: const Backend(premium: PremiumFixture.noPayments),
    open: (tester) => pushTo(tester, '/premium'),
  ));
  responsiveScenario(Scenario('premium_disabled', loggedIn: true, open: (tester) => pushTo(tester, '/premium')));
  responsiveScenario(const Scenario('home_locked', backend: _locked));
  responsiveScenario(Scenario('explore_locked', backend: _locked, open: (tester) => goTo(tester, '/explore')));
  responsiveScenario(Scenario('saved_locked', loggedIn: true, backend: _locked, open: (tester) => goTo(tester, '/saved')));
  responsiveScenario(Scenario('my_reviews_locked', loggedIn: true, backend: _locked, open: (tester) => pushTo(tester, '/profile/reviews')));
  responsiveScenario(Scenario('profile_premium_active', loggedIn: true, backend: const Backend(premium: PremiumFixture.active), open: (tester) => goTo(tester, '/profile')));
  responsiveScenario(Scenario('vendor_detail_locked', backend: _locked, open: (tester) => pushTo(tester, '/vendor/120')));
  responsiveScenario(Scenario('vendor_detail_locked_minimal', backend: _locked, open: (tester) => pushTo(tester, '/vendor/122')));
  responsiveScenario(Scenario(
    'vendor_detail_locked_android',
    loggedIn: true,
    backend: _locked,
    platform: TargetPlatform.android,
    open: (tester) => pushTo(tester, '/vendor/121'),
  ));
  responsiveScenario(const Scenario(
    'paywall_sheet_android',
    modal: true,
    backend: _locked,
    platform: TargetPlatform.android,
    open: _openPaywall,
  ));
  responsiveScenario(const Scenario(
    'paywall_sheet_ios',
    modal: true,
    backend: _locked,
    platform: TargetPlatform.iOS,
    open: _openPaywall,
  ));
  responsiveScenario(Scenario(
    'trail_sheet_locked',
    modal: true,
    backend: _locked,
    open: (tester) async {
      await tapVisible(tester, find.byType(TrailCard));
      expect(find.byType(PaywallPanel), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'purchase_success_dialog',
    modal: true,
    loggedIn: true,
    backend: _locked,
    platform: TargetPlatform.android,
    open: (tester) async {
      await pushTo(tester, '/premium');
      await tester.tap(find.widgetWithText(FilledButton, 'Pay ₹49 with UPI'));
      await settle(tester, const Duration(seconds: 2));
      expect(find.text('Welcome to Premium!'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'update_prompt',
    modal: true,
    backend: const Backend(latestVersion: '1.4.0'),
    open: (tester) async {
      await settle(tester);
      expect(find.text('A new version is available'), findsOneWidget);
    },
  ));
}
