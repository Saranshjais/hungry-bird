import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import '../auth/auth_widgets.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key, this.fromVerify = false});

  /// Opened from "Wrong email? Change it": pop `true` after an email change instead of
  /// opening another verify screen.
  final bool fromVerify;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  final _password = TextEditingController();
  late final String _originalEmail;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _originalEmail = user?.email ?? '';
    _name = TextEditingController(text: user?.name ?? '');
    _email = TextEditingController(text: _originalEmail);
    _phone = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _emailChanged => _email.text.trim().toLowerCase() != _originalEmail.toLowerCase();

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final needsVerification = await context.read<AuthProvider>().updateProfile(
            name: _name.text,
            email: _email.text,
            phone: _phone.text,
            currentPassword: _emailChanged ? _password.text : null,
          );
      if (!mounted) return;
      if (!needsVerification) {
        showSnack(context, 'Profile updated');
        context.pop();
      } else if (widget.fromVerify) {
        context.pop(true);
      } else {
        showSnack(context, 'Profile updated. Now verify your new email.');
        context.pushReplacement('/verify-email?sent=1');
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
      appBar: AppBar(title: const Text('Edit profile')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: readableInsets(context, const EdgeInsets.all(20)),
            children: [
              Center(child: Avatar(name: _name.text.isEmpty ? '?' : _name.text, size: 84)),
              const SizedBox(height: 24),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded)),
                validator: (v) => (v == null || v.trim().length < 2) ? 'Enter your name' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofocus: widget.fromVerify,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                validator: validateEmail,
              ),
              if (_emailChanged) ...[
                const SizedBox(height: 14),
                PasswordField(
                  controller: _password,
                  label: 'Current password',
                  autofillHints: const [AutofillHints.password],
                  validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password to change your email' : null,
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 8, left: 4),
                  child: Text(
                    'We\'ll send a 6-digit code to the new address to verify it.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
              const SizedBox(height: 14),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone (optional)', prefixIcon: Icon(Icons.phone_outlined)),
                validator: (v) {
                  final digits = (v ?? '').replaceAll(RegExp(r'\D'), '');
                  if (digits.isNotEmpty && (digits.length < 10 || digits.length > 13)) return 'Enter a valid phone number';
                  return null;
                },
              ),
              if (_error != null) FormErrorBanner(message: _error!),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Save changes'),
              ),
              if (!widget.fromVerify) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => context.push('/profile/password'),
                  icon: const Icon(Icons.lock_reset_rounded),
                  label: const Text('Change password'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
