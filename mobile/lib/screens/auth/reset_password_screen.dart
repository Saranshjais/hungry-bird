import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../services/hungry_bird_api.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

/// Step 2 of "Forgot password?": the emailed code plus a new password.
///
/// On success the server signs the account out everywhere; this screen says so and pops
/// `true` so the forgot-password step can return to the login screen.
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, required this.email, this.codeSent = false});

  final String email;

  /// A code was just sent, so "Resend" starts on its cooldown.
  final bool codeSent;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _cooldown = ResendCooldown();
  bool _busy = false;
  bool _sending = false;
  bool _done = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    if (widget.codeSent) _cooldown.start(ResendCooldown.defaultSeconds);
  }

  @override
  void dispose() {
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    _cooldown.dispose();
    super.dispose();
  }

  Future<void> _resend() async {
    setState(() {
      _sending = true;
      _error = null;
      _info = null;
    });
    try {
      await context.read<HungryBirdApi>().forgotPassword(widget.email);
      if (!mounted) return;
      _cooldown.start(ResendCooldown.defaultSeconds);
      setState(() => _info = 'If ${widget.email} has a HungryBird account, a new code is on its way.');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == ApiErrorCode.rateLimited) _cooldown.start(e.retryAfter ?? ResendCooldown.defaultSeconds);
      setState(() => _error = authErrorMessage(e, sending: true));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _submit() async {
    final codeOk = _code.text.trim().length == 6;
    final formOk = _form.currentState!.validate();
    if (!codeOk) setState(() => _error = 'Enter the 6-digit code from the email.');
    if (!codeOk || !formOk) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      await context.read<HungryBirdApi>().resetPassword(
            email: widget.email,
            code: _code.text.trim(),
            newPassword: _password.text,
          );
      if (!mounted) return;
      // Every session of the account was revoked, this device's included.
      final auth = context.read<AuthProvider>();
      if (auth.isLoggedIn && auth.user?.email.toLowerCase() == widget.email.toLowerCase()) await auth.logout();
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _backToLogin() {
    if (context.canPop()) {
      context.pop(true);
    } else {
      context.go('/home');
      context.push(Uri(path: '/login', queryParameters: {'email': widget.email}).toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final padding = readableInsets(context, const EdgeInsets.fromLTRB(24, 0, 24, 24), maxWidth: 480);

    if (_done) {
      return Scaffold(
        appBar: AppBar(automaticallyImplyLeading: false),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: padding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(color: AppColors.successSoft, shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, size: 34, color: AppColors.success),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Password updated', style: theme.textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  'For your security we\'ve logged your account out on every device. Log in again with your new password.',
                  style: theme.textTheme.bodyLarge?.copyWith(color: muted),
                ),
                const SizedBox(height: 28),
                FilledButton(onPressed: _backToLogin, child: const Text('Back to log in')),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: padding,
          child: Form(
            key: _form,
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AuthIconBadge(icon: Icons.password_rounded),
                  const SizedBox(height: 20),
                  Text('Set a new password', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 6),
                  Text.rich(
                    TextSpan(children: [
                      const TextSpan(text: 'Enter the 6-digit code we sent to '),
                      TextSpan(text: widget.email, style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                      const TextSpan(text: ' and choose a new password.'),
                    ]),
                    style: theme.textTheme.bodyLarge?.copyWith(color: muted),
                  ),
                  const SizedBox(height: 24),
                  OtpCodeField(controller: _code, enabled: !_busy),
                  const SizedBox(height: 14),
                  PasswordField(
                    controller: _password,
                    label: 'New password',
                    autofillHints: const [AutofillHints.newPassword],
                    textInputAction: TextInputAction.next,
                    validator: validateNewPassword,
                  ),
                  PasswordRulesHint(controller: _password),
                  const SizedBox(height: 14),
                  PasswordField(
                    controller: _confirm,
                    label: 'Confirm new password',
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    validator: (v) => v != _password.text ? 'Passwords don\'t match' : null,
                  ),
                  if (_error != null) FormErrorBanner(message: _error!),
                  if (_info != null && _error == null) FormInfoBanner(message: _info!),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Update password'),
                  ),
                  const SizedBox(height: 8),
                  ResendCodeButton(cooldown: _cooldown, sending: _sending, onPressed: _resend),
                  Text(
                    'Codes work for 10 minutes. Can\'t find the email? Check your spam folder.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(color: muted),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
