import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.reason});

  final String? reason;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  String get _subtitle => switch (widget.reason) {
        'review' => 'Log in to post and manage your reviews.',
        'saved' => 'Log in to keep your saved stalls on every device.',
        'submit' => 'Log in to track the stalls you suggest.',
        _ => 'Welcome back! Log in to continue your food trail.',
      };

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
    });
    try {
      final auth = context.read<AuthProvider>();
      await auth.login(_email.text, _password.text);
      if (!mounted) return;
      showSnack(context, 'Welcome back, ${auth.user?.name.split(' ').first ?? 'foodie'}!');
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/profile');
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
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
                  if (_error != null) FormErrorBanner(message: _error!),
                  const SizedBox(height: 24),
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
                  const SizedBox(height: 8),
                  Text(
                    'Forgot your password? Write to us from Help & support and we\'ll sort it out.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
