import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.reason, this.email});

  final String? reason;

  /// Pre-filled email (e.g. right after a password reset).
  final String? email;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.email ?? '');
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _info;

  String get _subtitle => switch (widget.reason) {
        'review' => 'Log in to post and manage your reviews.',
        'saved' => 'Log in to keep your saved stalls on every device.',
        'submit' => 'Log in to track the stalls you suggest.',
        'premium' => 'Log in to use HungryBird Premium on this device.',
        _ => 'Welcome back! Log in to continue your food trail.',
      };

  Future<void> _forgotPassword() async {
    final typed = _email.text.trim();
    final email = await context.push<String>(
      Uri(path: '/forgot-password', queryParameters: {if (validateEmail(typed) == null) 'email': typed}).toString(),
    );
    if (email == null || !mounted) return;
    _email.text = email;
    _password.clear();
    setState(() {
      _error = null;
      _info = 'Password updated. Log in with your new password.';
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      await auth.login(_email.text, _password.text);
      if (!mounted) return;
      showSnack(context, 'Welcome back, ${auth.user?.name.split(' ').first ?? 'foodie'}!');
      if (context.canPop()) {
        context.pop(true);
      } else {
        context.go('/profile');
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: readableInsets(context, const EdgeInsets.fromLTRB(24, 0, 24, 24), maxWidth: 480),
          child: Form(
            key: _form,
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Image.asset('assets/images/logo.png', height: 64, alignment: Alignment.centerLeft),
                  const SizedBox(height: 20),
                  Text('Log in', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 6),
                  Text(_subtitle, style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 28),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                    validator: validateEmail,
                  ),
                  const SizedBox(height: 14),
                  PasswordField(
                    controller: _password,
                    label: 'Password',
                    autofillHints: const [AutofillHints.password],
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(onPressed: _busy ? null : _forgotPassword, child: const Text('Forgot password?')),
                  ),
                  if (_error != null) FormErrorBanner(message: _error!),
                  if (_info != null && _error == null) FormInfoBanner(message: _info!, icon: Icons.lock_reset_rounded),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Log in'),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('New to HungryBird?', style: theme.textTheme.bodyMedium),
                      TextButton(
                        onPressed: () => context.pushReplacement('/register'),
                        child: const Text('Create account'),
                      ),
                    ],
                  ),
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: AppColors.muted),
                    onPressed: () => context.push('/help'),
                    child: const Text('Help & support'),
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
