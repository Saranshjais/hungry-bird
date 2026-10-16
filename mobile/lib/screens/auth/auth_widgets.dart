import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';

final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

String? validateEmail(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'Enter your email';
  if (!_emailPattern.hasMatch(v)) return 'Enter a valid email address';
  return null;
}

/// The server's password rule (register, reset, change): 8+ characters with a letter and a digit.
const passwordRules = [
  ('At least 8 characters', _longEnough),
  ('At least one letter', _hasLetter),
  ('At least one digit', _hasDigit),
];

bool _longEnough(String v) => v.length >= 8;
bool _hasLetter(String v) => RegExp(r'[A-Za-z]').hasMatch(v);
bool _hasDigit(String v) => RegExp(r'\d').hasMatch(v);

String? validateNewPassword(String? value) {
  final v = value ?? '';
  if (!_longEnough(v)) return 'Use at least 8 characters';
  if (!_hasLetter(v) || !_hasDigit(v)) return 'Use at least one letter and one digit';
  return null;
}

String _seconds(int? s) => s == null || s <= 0 ? 'a minute' : (s < 90 ? '$s seconds' : '${(s / 60).ceil()} minutes');

/// A clear message for the auth/email-code error codes; falls back to the server's text.
String authErrorMessage(ApiException e, {bool sending = false}) => switch (e.code) {
      ApiErrorCode.rateLimited => sending
          ? 'We just sent a code. Please wait ${_seconds(e.retryAfter)} before asking for another one.'
          : 'Too many tries. Please wait ${_seconds(e.retryAfter)} and try again.',
      ApiErrorCode.invalidCode => switch (e.attemptsLeft) {
          null => 'That code isn\'t right. Check the latest email from HungryBird and try again.',
          1 => 'That code isn\'t right. You have 1 try left before you need a new code.',
          final n => 'That code isn\'t right. You have $n tries left.',
        },
      ApiErrorCode.codeExpired => 'That code has expired. Tap "Resend code" to get a new one.',
      ApiErrorCode.tooManyAttempts => 'Too many wrong tries for this code. Tap "Resend code" to get a new one.',
      ApiErrorCode.weakPassword => 'Choose a stronger password: at least 8 characters with a letter and a digit.',
      ApiErrorCode.emailNotConfigured =>
        'We can\'t send emails right now. Please try again later, or write to us from Help & support.',
      ApiErrorCode.emailSendFailed => 'We couldn\'t send the email just now. Please try again in a moment.',
      ApiErrorCode.emailNotVerified => 'Please verify your email address first.',
      ApiErrorCode.emailInUse => 'An account already uses this email. Log in instead, or reset its password.',
      ApiErrorCode.invalidCredentials => 'That email and password don\'t match. Check for typos or reset your password.',
      ApiErrorCode.invalidPassword => 'Your current password isn\'t right.',
      ApiErrorCode.accountSuspended => 'This account has been suspended. Please contact HungryBird support.',
      ApiErrorCode.alreadyVerified => 'Your email is already verified.',
      _ => e.message,
    };

class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.label,
    this.validator,
    this.autofillHints,
    this.textInputAction,
    this.onSubmitted,
    this.onChanged,
    this.errorText,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final FormFieldValidator<String>? validator;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;

  /// A server-side error shown under the field (e.g. "Your current password isn't right.").
  final String? errorText;
  final bool enabled;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: _obscure,
      autofillHints: widget.autofillHints,
      textInputAction: widget.textInputAction,
      onFieldSubmitted: widget.onSubmitted,
      onChanged: widget.onChanged,
      validator: widget.validator,
      enabled: widget.enabled,
      decoration: InputDecoration(
        labelText: widget.label,
        errorText: widget.errorText,
        errorMaxLines: 3,
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        suffixIcon: IconButton(
          tooltip: _obscure ? 'Show password' : 'Hide password',
          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
    );
  }
}

/// Live checklist of [passwordRules] under a new-password field.
class PasswordRulesHint extends StatelessWidget {
  const PasswordRulesHint({super.key, required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final value = controller.text;
        return Padding(
          padding: const EdgeInsets.only(top: 8, left: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (label, rule) in passwordRules)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Icon(
                        rule(value) ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                        size: 16,
                        color: rule(value) ? AppColors.success : theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: rule(value) ? AppColors.success : theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Keeps digits only (so a pasted "Your code: 123 456" becomes 123456), at most six.
class _OtpFormatter extends TextInputFormatter {
  const _OtpFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final text = digits.length > 6 ? digits.substring(0, 6) : digits;
    if (text == newValue.text) return newValue;
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

/// One field for the 6-digit email code: SMS/email autofill, paste (system menu or the
/// paste button) and auto-submit once six digits are in.
class OtpCodeField extends StatelessWidget {
  const OtpCodeField({super.key, required this.controller, this.onCompleted, this.enabled = true});

  final TextEditingController controller;
  final ValueChanged<String>? onCompleted;
  final bool enabled;

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final digits = (data?.text ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.length < 6) return;
    final code = digits.substring(0, 6);
    controller.value = TextEditingValue(text: code, selection: TextSelection.collapsed(offset: code.length));
    onCompleted?.call(code);
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.done,
      autofillHints: const [AutofillHints.oneTimeCode],
      inputFormatters: const [_OtpFormatter()],
      textAlign: TextAlign.center,
      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 8),
      onChanged: (value) {
        if (value.length == 6) onCompleted?.call(value);
      },
      onSubmitted: onCompleted,
      decoration: InputDecoration(
        labelText: '6-digit code',
        prefixIcon: const Icon(Icons.pin_outlined),
        suffixIcon: IconButton(
          tooltip: 'Paste code',
          icon: const Icon(Icons.content_paste_rounded),
          onPressed: enabled ? _paste : null,
        ),
      ),
    );
  }
}

/// Counts down the wait before another code may be requested.
class ResendCooldown extends ChangeNotifier {
  static const defaultSeconds = 60;

  Timer? _timer;
  int _seconds = 0;

  int get seconds => _seconds;

  void start(int seconds) {
    _timer?.cancel();
    _seconds = seconds;
    notifyListeners();
    if (seconds <= 0) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _seconds--;
      if (_seconds <= 0) {
        _seconds = 0;
        timer.cancel();
      }
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

class ResendCodeButton extends StatelessWidget {
  const ResendCodeButton({super.key, required this.cooldown, required this.sending, required this.onPressed});

  final ResendCooldown cooldown;
  final bool sending;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: cooldown,
      builder: (context, _) {
        final wait = cooldown.seconds;
        final label = sending
            ? 'Sending…'
            : wait > 0
                ? 'Resend code in ${wait ~/ 60}:${(wait % 60).toString().padLeft(2, '0')}'
                : 'Resend code';
        return TextButton.icon(
          onPressed: sending || wait > 0 ? null : onPressed,
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: Text(label),
        );
      },
    );
  }
}

/// Round brand-tinted icon at the top of the auth flows.
class AuthIconBadge extends StatelessWidget {
  const AuthIconBadge({super.key, required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: 64,
        height: 64,
        decoration: const BoxDecoration(color: AppColors.brandSoft, shape: BoxShape.circle),
        child: Icon(icon, size: 30, color: AppColors.brand),
      ),
    );
  }
}

class FormErrorBanner extends StatelessWidget {
  const FormErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.dangerSoft, borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: const TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.w600))),
          ],
        ),
      ),
    );
  }
}

/// Neutral counterpart of [FormErrorBanner] ("We sent a new code…").
class FormInfoBanner extends StatelessWidget {
  const FormInfoBanner({super.key, required this.message, this.icon = Icons.mark_email_read_outlined});

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.successSoft, borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            Icon(icon, color: AppColors.success, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: const TextStyle(color: Color(0xFF166534), fontWeight: FontWeight.w600))),
          ],
        ),
      ),
    );
  }
}
