// Forms: auth, profile edits, help/contact, suggest-a-stall and the location picker.
// The *_keyboard scenarios simulate an open software keyboard.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/screens/auth/auth_widgets.dart';

import 'harness.dart';

Future<void> _loginWithWrongPassword(WidgetTester tester) async {
  await pushTo(tester, '/login?reason=saved');
  await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'priya@example.com');
  await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'nope');
  await tapVisible(tester, find.widgetWithText(FilledButton, 'Log in'));
  await settle(tester);
  expect(find.byType(FormErrorBanner), findsOneWidget);
}

Future<void> _registerWithErrors(WidgetTester tester) async {
  await pushTo(tester, '/register');
  await tapVisible(tester, find.widgetWithText(FilledButton, 'Create account'));
  await settle(tester);
  expect(find.text('Enter your name'), findsOneWidget);
}

Future<void> _helpWithErrors(WidgetTester tester) async {
  await pushTo(tester, '/help');
  await tester.tap(find.text('How do you find these stalls?'));
  await settle(tester);
  await tapVisible(tester, find.text('Send message'));
}

Future<void> _submitWithErrors(WidgetTester tester) async {
  await pushTo(tester, '/submit');
  await tapVisible(tester, find.text('Submit suggestion'));
}

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(Scenario('login', open: (tester) => pushTo(tester, '/login?reason=saved')));
  responsiveScenario(const Scenario('login_error_keyboard', keyboard: true, open: _loginWithWrongPassword));
  responsiveScenario(Scenario('register', open: (tester) => pushTo(tester, '/register')));
  responsiveScenario(const Scenario('register_errors_keyboard', keyboard: true, open: _registerWithErrors));
  responsiveScenario(
      Scenario('edit_profile_keyboard', loggedIn: true, keyboard: true, open: (tester) => pushTo(tester, '/profile/edit')));
  responsiveScenario(Scenario(
    'change_password_errors',
    loggedIn: true,
    open: (tester) async {
      await pushTo(tester, '/profile/password');
      await tester.tap(find.widgetWithText(FilledButton, 'Update password'));
      await settle(tester);
    },
  ));
  responsiveScenario(Scenario('help', open: (tester) => pushTo(tester, '/help')));
  responsiveScenario(const Scenario('help_errors_keyboard', keyboard: true, open: _helpWithErrors));
  responsiveScenario(Scenario('submit', open: (tester) => pushTo(tester, '/submit')));
  responsiveScenario(const Scenario('submit_errors_keyboard', keyboard: true, open: _submitWithErrors));
  responsiveScenario(Scenario(
    'submit_success',
    open: (tester) async {
      await pushTo(tester, '/submit');
      await enterVisible(tester, find.widgetWithText(TextFormField, 'e.g. Rawat Mishtan Bhandar'), 'Baba Ka Dhaba');
      await enterVisible(tester, find.widgetWithText(TextFormField, 'e.g. Near Hawa Mahal gate, Johari Bazaar'), 'Railway Colony');
      await tapVisible(tester, find.text('Submit suggestion'));
    },
  ));
  responsiveScenario(Scenario('location_picker', open: (tester) => pushTo(tester, '/pick-location')));
}
