import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../services/hungry_bird_api.dart';
import '../../widgets/common.dart';
import 'auth_widgets.dart';

/// Step 1 of "Forgot password?": ask for the email and send a 6-digit code.
///
/// Pops the email once the password was reset, so the login screen can pre-fill it.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.email});

  final String? email;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _form = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.email ?? '');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send({bool alreadyHaveCode = false}) async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    final email = _email.text.trim();
    if (!alreadyHaveCode) {
      setState(() {
        _busy = true;
        _error = null;
      });
      try {
        await context.read<HungryBirdApi>().forgotPassword(email);
      } on ApiException catch (e) {
        if (mounted) setState(() => _error = authErrorMessage(e, sending: true));
        return;
      } finally {
        if (mounted) setState(() => _busy = false);
      }
      if (!mounted) return;
    }
    final query = {'email': email, if (!alreadyHaveCode) 'sent': '1'};
    final done = await context.push<bool>(Uri(path: '/reset-password', queryParameters: query).toString());
    if (done == true && mounted) context.pop(email);
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const AuthIconBadge(icon: Icons.lock_reset_rounded),
                const SizedBox(height: 20),
                Text('Forgot your password?', style: theme.textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  'Enter the email on your account and we\'ll send you a 6-digit code to set a new password.',
                  style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 28),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _send(),
                  decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                  validator: validateEmail,
                ),
                if (_error != null) FormErrorBanner(message: _error!),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : _send,
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Send code'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _busy ? null : () => _send(alreadyHaveCode: true),
                  child: const Text('I already have a code'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
