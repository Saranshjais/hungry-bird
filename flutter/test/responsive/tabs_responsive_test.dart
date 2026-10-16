// Tab screens inside the floating-nav shell (home, explore, map, saved, profile).
//
// Run: flutter test test/responsive
// See harness.dart for the optional results/screenshot outputs.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/screens/home/home_screen.dart';
import 'package:hungry_bird_app/screens/home/home_widgets.dart';
import 'package:hungry_bird_app/widgets/city_picker.dart';

import 'fixtures.dart';
import 'harness.dart';

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(const Scenario('home'));
  responsiveScenario(const Scenario('home_located', located: true));
  responsiveScenario(const Scenario('home_empty', mode: FixtureMode.empty));
  responsiveScenario(const Scenario('home_vendors_down', mode: FixtureMode.vendorsDown));
  responsiveScenario(Scenario(
    'city_picker_sheet',
    modal: true,
    open: (tester) async {
      showCityPicker(tester.element(find.byType(HomeScreen)));
      await settle(tester);
    },
  ));
  responsiveScenario(Scenario(
    'trail_sheet',
    modal: true,
    open: (tester) => tapVisible(tester, find.byType(TrailCard)),
  ));
  responsiveScenario(Scenario('explore', open: (tester) => goTo(tester, '/explore')));
  responsiveScenario(Scenario(
    'explore_search_keyboard',
    keyboard: true,
    open: (tester) async {
      await goTo(tester, '/explore');
      await tester.tap(find.byType(TextField).first);
      await settle(tester);
    },
  ));
  responsiveScenario(Scenario('explore_empty', mode: FixtureMode.empty, open: (tester) => goTo(tester, '/explore')));
  responsiveScenario(Scenario(
    'map',
    open: (tester) async {
      await goTo(tester, '/map');
      await tester.tap(find.byWidgetPredicate((w) => w.runtimeType.toString() == '_Pin').first, warnIfMissed: false);
      await settle(tester);
    },
  ));
  responsiveScenario(Scenario('map_vendors_down', mode: FixtureMode.vendorsDown, open: (tester) => goTo(tester, '/map')));
  responsiveScenario(Scenario('saved', open: (tester) => goTo(tester, '/saved')));
  responsiveScenario(Scenario('saved_empty', mode: FixtureMode.empty, open: (tester) => goTo(tester, '/saved')));
  responsiveScenario(Scenario('profile_guest', open: (tester) => goTo(tester, '/profile')));
  responsiveScenario(Scenario('profile_signed_in', loggedIn: true, open: (tester) => goTo(tester, '/profile')));
  responsiveScenario(Scenario(
    'logout_dialog',
    loggedIn: true,
    modal: true,
    open: (tester) async {
      await goTo(tester, '/profile');
      await tapVisible(tester, find.text('Log out'));
    },
  ));
}
