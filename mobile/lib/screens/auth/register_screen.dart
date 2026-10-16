import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/links.dart';
import '../../core/theme.dart';
import '../../state/app_config_provider.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()
    ..onTap = () => Links.open(context, '${context.read<AppConfigProvider>().websiteUrl}/terms', inApp: true);
  late final TapGestureRecognizer _privacyTap = TapGestureRecognizer()
    ..onTap = () => Links.open(context, '${context.read<AppConfigProvider>().websiteUrl}/privacy', inApp: true);
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _termsTap.dispose();
    _privacyTap.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final sent = await context.read<AuthProvider>().register(_name.text, _email.text, _password.text);
      if (!mounted) return;
      showSnack(context, 'Welcome to HungryBird, ${_name.text.trim().split(' ').first}!');
      // Verifying is optional for browsing; the screen offers "I'll do this later".
      context.pushReplacement(Uri(path: '/verify-email', queryParameters: {if (sent) 'sent': '1'}).toString());
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
                  Text('Create your account', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 6),
                  Text(
                    'Save stalls, write reviews and track the gems you suggest.',
                    style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 28),
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.name],
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded)),
                    validator: (v) => (v == null || v.trim().length < 2) ? 'Enter your name' : null,
                  ),
                  const SizedBox(height: 14),
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
                    autofillHints: const [AutofillHints.newPassword],
                    textInputAction: TextInputAction.next,
                    validator: validateNewPassword,
                  ),
                  PasswordRulesHint(controller: _password),
                  const SizedBox(height: 14),
                  PasswordField(
                    controller: _confirm,
                    label: 'Confirm password',
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    validator: (v) => v != _password.text ? 'Passwords don\'t match' : null,
                  ),
                  if (_error != null) FormErrorBanner(message: _error!),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Create account'),
                  ),
                  const SizedBox(height: 14),
                  Text.rich(
                    TextSpan(
                      text: 'By continuing you agree to our ',
                      children: [
                        TextSpan(text: 'Terms', style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700), recognizer: _termsTap),
                        const TextSpan(text: ' and '),
                        TextSpan(text: 'Privacy Policy', style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700), recognizer: _privacyTap),
                        const TextSpan(text: '.'),
                      ],
                    ),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('Already have an account?', style: theme.textTheme.bodyMedium),
                      TextButton(onPressed: () => context.pushReplacement('/login'), child: const Text('Log in')),
                    ],
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
