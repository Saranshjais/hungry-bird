// Email verification, forgot/reset password and the profile states around them.
// The *_keyboard scenarios simulate an open software keyboard.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/screens/auth/auth_widgets.dart';

import 'fixtures.dart';
import 'harness.dart';

const _unverified = Backend(emailVerified: false);
const _resetPath = '/reset-password?email=$longUserEmail&sent=1';

Future<void> _openVerify(WidgetTester tester) => pushTo(tester, '/verify-email?sent=1');

Future<void> _verifyWrongCode(WidgetTester tester) async {
  await _openVerify(tester);
  await enterVisible(tester, find.byType(OtpCodeField), '123456');
  await settle(tester);
  expect(find.byType(FormErrorBanner), findsOneWidget);
}

Future<void> _forgotEmailDown(WidgetTester tester) async {
  await pushTo(tester, '/forgot-password');
  await enterVisible(tester, find.widgetWithText(TextFormField, 'Email'), 'priya@example.com');
  await tapVisible(tester, find.widgetWithText(FilledButton, 'Send code'));
  expect(find.byType(FormErrorBanner), findsOneWidget);
}

Future<void> _resetWithErrors(WidgetTester tester) async {
  await pushTo(tester, _resetPath);
  await enterVisible(tester, find.widgetWithText(TextFormField, 'New password'), 'abc');
  await tapVisible(tester, find.widgetWithText(FilledButton, 'Update password'));
  await settle(tester);
  expect(find.text('Use at least 8 characters'), findsOneWidget);
}

Future<void> _fillReset(WidgetTester tester) async {
  await pushTo(tester, _resetPath);
  await enterVisible(tester, find.byType(OtpCodeField), '654321');
  await enterVisible(tester, find.widgetWithText(TextFormField, 'New password'), 'masala123');
  await enterVisible(tester, find.widgetWithText(TextFormField, 'Confirm new password'), 'masala123');
  await tapVisible(tester, find.widgetWithText(FilledButton, 'Update password'));
  await settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(const Scenario('verify_email', loggedIn: true, backend: _unverified, open: _openVerify));
  responsiveScenario(Scenario(
    'verify_email_keyboard',
    loggedIn: true,
    keyboard: true,
    backend: _unverified,
    open: (tester) async {
      await _openVerify(tester);
      await tester.tap(find.byType(OtpCodeField));
      await settle(tester);
    },
  ));
  responsiveScenario(const Scenario(
    'verify_email_wrong_code_keyboard',
    loggedIn: true,
    keyboard: true,
    backend: Backend(emailVerified: false, errors: {'/api/auth/email/verify': 'INVALID_CODE'}),
    open: _verifyWrongCode,
  ));
  responsiveScenario(Scenario(
    'verify_email_rate_limited',
    loggedIn: true,
    backend: const Backend(emailVerified: false, errors: {'/api/auth/email/send-code': 'RATE_LIMITED'}),
    // Opened without a fresh code, so the screen asks for one and gets RATE_LIMITED.
    open: (tester) async {
      await pushTo(tester, '/verify-email');
      expect(find.byType(FormErrorBanner), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario('verify_email_guest', open: (tester) => pushTo(tester, '/verify-email')));
  responsiveScenario(Scenario('forgot_password', open: (tester) => pushTo(tester, '/forgot-password')));
  responsiveScenario(Scenario(
    'forgot_password_errors_keyboard',
    keyboard: true,
    open: (tester) async {
      await pushTo(tester, '/forgot-password');
      await tapVisible(tester, find.widgetWithText(FilledButton, 'Send code'));
      expect(find.text('Enter your email'), findsOneWidget);
    },
  ));
  responsiveScenario(const Scenario(
    'forgot_password_email_not_configured',
    backend: Backend(errors: {'/api/auth/password/forgot': 'EMAIL_NOT_CONFIGURED'}),
    open: _forgotEmailDown,
  ));
  responsiveScenario(Scenario('reset_password', open: (tester) => pushTo(tester, _resetPath)));
  responsiveScenario(const Scenario('reset_password_errors_keyboard', keyboard: true, open: _resetWithErrors));
  responsiveScenario(Scenario(
    'reset_password_code_expired_keyboard',
    keyboard: true,
    backend: const Backend(errors: {'/api/auth/password/reset': 'CODE_EXPIRED'}),
    open: (tester) async {
      await _fillReset(tester);
      expect(find.byType(FormErrorBanner), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'reset_password_success',
    open: (tester) async {
      await _fillReset(tester);
      expect(find.text('Password updated'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'profile_unverified_premium',
    loggedIn: true,
    backend: const Backend(emailVerified: false, premium: PremiumFixture.locked),
    open: (tester) async {
      await goTo(tester, '/profile');
      expect(find.text('Email not verified'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'edit_profile_email_change_keyboard',
    loggedIn: true,
    keyboard: true,
    open: (tester) async {
      await pushTo(tester, '/profile/edit');
      await enterVisible(tester, find.widgetWithText(TextFormField, 'Email'), 'new.address.for.verification@example.co.in');
      await settle(tester);
      expect(find.widgetWithText(TextFormField, 'Current password'), findsOneWidget);
    },
  ));
  responsiveScenario(Scenario(
    'edit_profile_wrong_password_keyboard',
    loggedIn: true,
    keyboard: true,
    open: (tester) async {
      await pushTo(tester, '/profile/edit');
      await enterVisible(tester, find.widgetWithText(TextFormField, 'Email'), 'new.address.for.verification@example.co.in');
      await settle(tester);
      await enterVisible(tester, find.widgetWithText(TextFormField, 'Current password'), 'wrong');
      await tapVisible(tester, find.widgetWithText(FilledButton, 'Save changes'));
      await settle(tester);
      // INVALID_PASSWORD from the server.
      expect(find.text('Your current password isn\'t right.'), findsOneWidget);
    },
  ));
}
