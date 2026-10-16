// Bootstrap/status screens, onboarding, settings, about and profile lists.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fixtures.dart';
import 'harness.dart';

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(const Scenario('splash_error', mode: FixtureMode.offline));
  responsiveScenario(const Scenario('onboarding_first', onboarded: false));
  responsiveScenario(Scenario(
    'onboarding_last',
    onboarded: false,
    open: (tester) async {
      for (var i = 0; i < 2; i++) {
        await tester.tap(find.widgetWithText(FilledButton, 'Next'));
        await settle(tester);
      }
    },
  ));
  responsiveScenario(const Scenario('maintenance', mode: FixtureMode.maintenance));
  responsiveScenario(const Scenario('update_required', mode: FixtureMode.update));
  responsiveScenario(Scenario('settings', loggedIn: true, open: (tester) => pushTo(tester, '/settings')));
  responsiveScenario(Scenario(
    'delete_account_dialog_keyboard',
    loggedIn: true,
    modal: true,
    keyboard: true,
    open: (tester) async {
      await pushTo(tester, '/settings');
      await tapVisible(tester, find.text('Delete account'));
    },
  ));
  responsiveScenario(Scenario(
    'delete_account_wrong_password_keyboard',
    loggedIn: true,
    modal: true,
    keyboard: true,
    open: (tester) async {
      await pushTo(tester, '/settings');
      await tapVisible(tester, find.text('Delete account'));
      final dialog = find.byType(AlertDialog);
      await tester.enterText(find.descendant(of: dialog, matching: find.byType(TextField)).first, 'DELETE');
      await tester.enterText(find.descendant(of: dialog, matching: find.byType(TextField)).last, 'wrong');
      await tester.pump();
      await tester.tap(find.descendant(of: dialog, matching: find.widgetWithText(FilledButton, 'Delete')));
      await settle(tester);
      // INVALID_PASSWORD keeps the dialog open with the error under the field.
      expect(find.text('That password isn\'t right. Your account was not deleted.'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario('about', open: (tester) => pushTo(tester, '/about')));
  responsiveScenario(Scenario('my_reviews', loggedIn: true, open: (tester) => pushTo(tester, '/profile/reviews')));
  responsiveScenario(Scenario('my_submissions', loggedIn: true, open: (tester) => pushTo(tester, '/profile/submissions')));
  responsiveScenario(Scenario('not_found', open: (tester) => goTo(tester, '/this-page-does-not-exist')));
}
