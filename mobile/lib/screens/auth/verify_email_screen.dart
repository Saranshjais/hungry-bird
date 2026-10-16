import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

/// "Verify your email": the 6-digit code sent after sign-up or an email change.
///
/// Verifying is optional for browsing (people can skip and come back from the profile
/// banner) but required before buying Premium. Pops `true` once the email is verified.
class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, this.codeSent = false});

  /// A code was just sent (sign-up, email change), so don't send another one on open.
  final bool codeSent;

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _code = TextEditingController();
  final _cooldown = ResendCooldown();
  bool _busy = false;
  bool _sending = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    _code.dispose();
    _cooldown.dispose();
    super.dispose();
  }

  void _start() {
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    if (!auth.isLoggedIn || user == null || user.emailVerified) return;
    final wait = auth.verificationResendIn;
    if (widget.codeSent || wait > 0) {
      _cooldown.start(wait > 0 ? wait : ResendCooldown.defaultSeconds);
    } else {
      _send();
    }
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _error = null;
      _info = null;
    });
    final auth = context.read<AuthProvider>();
    try {
      final wait = await auth.sendVerificationCode();
      if (!mounted) return;
      _cooldown.start(wait);
      setState(() => _info = 'We sent a new code to ${auth.user?.email ?? 'your email'}.');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == ApiErrorCode.alreadyVerified || e.statusCode == 409) {
        // Already verified (e.g. on another device).
        await auth.refreshUser();
        if (mounted) setState(() {});
        return;
      }
      if (e.code == ApiErrorCode.rateLimited) _cooldown.start(e.retryAfter ?? ResendCooldown.defaultSeconds);
      setState(() => _error = authErrorMessage(e, sending: true));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code from the email.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      await context.read<AuthProvider>().verifyEmail(code);
      if (!mounted) return;
      showSnack(context, 'Email verified. Thanks!');
      _finish(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _finish(bool verified) {
    if (context.canPop()) {
      context.pop(verified);
    } else {
      context.go('/profile');
    }
  }

  Future<void> _changeEmail() async {
    final changed = await context.push<bool>('/profile/edit?from=verify');
    if (changed != true || !mounted) return;
    _code.clear();
    _cooldown.start(ResendCooldown.defaultSeconds);
    setState(() {
      _error = null;
      _info = 'We sent a code to your new address.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final muted = theme.colorScheme.onSurfaceVariant;

    Widget body;
    if (!auth.isLoggedIn || user == null) {
      body = EmptyState(
        icon: Icons.lock_outline_rounded,
        title: 'Log in to verify your email',
        message: 'Verification codes are linked to your HungryBird account.',
        actionLabel: 'Log in',
        onAction: () => context.pushReplacement('/login'),
      );
    } else if (user.emailVerified) {
      body = EmptyState(
        icon: Icons.mark_email_read_outlined,
        title: 'Your email is verified',
        message: user.email,
        actionLabel: 'Done',
        onAction: () => _finish(true),
      );
    } else {
      body = SingleChildScrollView(
        padding: readableInsets(context, const EdgeInsets.fromLTRB(24, 0, 24, 24), maxWidth: 480),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthIconBadge(icon: Icons.mark_email_unread_outlined),
            const SizedBox(height: 20),
            Text('Verify your email', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Enter the 6-digit code we sent to '),
                TextSpan(text: user.email, style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                const TextSpan(text: '.'),
              ]),
              style: theme.textTheme.bodyLarge?.copyWith(color: muted),
            ),
            const SizedBox(height: 24),
            OtpCodeField(controller: _code, onCompleted: (_) => _verify(), enabled: !_busy),
            if (_error != null) FormErrorBanner(message: _error!),
            if (_info != null && _error == null) FormInfoBanner(message: _info!),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _verify,
              child: _busy
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Text('Verify email'),
            ),
            const SizedBox(height: 8),
            ResendCodeButton(cooldown: _cooldown, sending: _sending, onPressed: _send),
            TextButton(onPressed: _changeEmail, child: const Text('Wrong email? Change it')),
            const SizedBox(height: 4),
            Text(
              'Codes work for 10 minutes. Can\'t find the email? Check your spam folder.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: muted),
            ),
            const SizedBox(height: 4),
            TextButton(
              style: TextButton.styleFrom(foregroundColor: AppColors.muted),
              onPressed: () => _finish(false),
              child: const Text('I\'ll do this later'),
            ),
          ],
        ),
      );
    }

    return Scaffold(appBar: AppBar(), body: SafeArea(child: body));
  }
}
