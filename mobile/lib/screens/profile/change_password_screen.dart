import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import '../auth/auth_widgets.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthProvider>().changePassword(_current.text, _next.text);
      if (!mounted) return;
      showSnack(context, 'Password changed. Your other devices have been logged out.');
      context.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Resetting by email signs the account out everywhere, so it ends at the login screen.
  Future<void> _forgot() async {
    final email = context.read<AuthProvider>().user?.email ?? '';
    final reset = await context.push<String>(
      Uri(path: '/forgot-password', queryParameters: {if (email.isNotEmpty) 'email': email}).toString(),
    );
    if (reset == null || !mounted) return;
    context.pushReplacement(Uri(path: '/login', queryParameters: {'email': reset}).toString());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: readableInsets(context, const EdgeInsets.all(20)),
            children: [
              PasswordField(
                controller: _current,
                label: 'Current password',
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
              ),
              const SizedBox(height: 14),
              PasswordField(controller: _next, label: 'New password', validator: validateNewPassword),
              PasswordRulesHint(controller: _next),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: 'Confirm new password',
                validator: (v) => v != _next.text ? 'Passwords don\'t match' : null,
                onSubmitted: (_) => _save(),
              ),
              if (_error != null) FormErrorBanner(message: _error!),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Update password'),
              ),
              const SizedBox(height: 8),
              TextButton(onPressed: _busy ? null : _forgot, child: const Text('Forgot your current password?')),
            ],
          ),
        ),
      ),
    );
  }
}
