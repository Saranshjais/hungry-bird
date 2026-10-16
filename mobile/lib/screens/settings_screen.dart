import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../state/app_config_provider.dart';
import '../state/auth_provider.dart';
import '../state/preferences_provider.dart';
import '../widgets/common.dart';
import 'auth/auth_widgets.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final prefs = context.watch<PreferencesProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final pushAvailable = context.select<AppConfigProvider, bool>((c) => c.settings.pushAvailable);

    Widget heading(String text) => Padding(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 8),
          child: Text(text.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1.1, fontWeight: FontWeight.w800, color: theme.colorScheme.onSurfaceVariant)),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: readableInsets(context, EdgeInsets.only(bottom: 32 + MediaQuery.paddingOf(context).bottom)),
        children: [
          heading('Appearance'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: LayoutBuilder(builder: (context, constraints) {
              // Drop the segment icons when a third of the width can't hold icon + label, and
              // stack the segments when it can't even hold the label (cover screens, large text).
              final labelStyle = theme.textTheme.labelLarge ?? const TextStyle();
              final widest = ['System', 'Light', 'Dark'].map((l) => textWidth(context, l, labelStyle)).reduce(math.max);
              final vertical = widest + 34 > constraints.maxWidth / 3;
              final icons = vertical || widest + 18 + 8 + 34 <= constraints.maxWidth / 3;
              return SegmentedButton<ThemeMode>(
                direction: vertical ? Axis.vertical : Axis.horizontal,
                segments: [
                  ButtonSegment(value: ThemeMode.system, icon: icons ? const Icon(Icons.brightness_auto_rounded) : null, label: const Text('System')),
                  ButtonSegment(value: ThemeMode.light, icon: icons ? const Icon(Icons.light_mode_rounded) : null, label: const Text('Light')),
                  ButtonSegment(value: ThemeMode.dark, icon: icons ? const Icon(Icons.dark_mode_rounded) : null, label: const Text('Dark')),
                ],
                selected: {prefs.themeMode},
                showSelectedIcon: false,
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: AppColors.brand,
                  selectedForegroundColor: Colors.white,
                ),
                onSelectionChanged: (s) => prefs.setThemeMode(s.first),
              );
            }),
          ),
          // Push isn't wired up yet (no Firebase project): a switch that does nothing would mislead,
          // so it only appears once the server can actually send push notifications.
          if (user != null && pushAvailable) ...[
            heading('Notifications'),
            SwitchListTile(
              secondary: const Icon(Icons.notifications_active_outlined, color: AppColors.brand),
              title: const Text('Push notifications'),
              subtitle: const Text('Announcements about new stalls and food trails. The in-app inbox always shows them.'),
              value: user.notificationsEnabled,
              onChanged: (v) async {
                try {
                  await context.read<AuthProvider>().setNotificationsEnabled(v);
                } on ApiException catch (e) {
                  if (context.mounted) showSnack(context, e.message, error: true);
                }
              },
            ),
          ],
          heading('Search'),
          ListTile(
            leading: const Icon(Icons.history_rounded, color: AppColors.brand),
            title: const Text('Clear recent searches'),
            enabled: prefs.recentSearches.isNotEmpty,
            onTap: () async {
              await prefs.clearRecentSearches();
              if (context.mounted) showSnack(context, 'Recent searches cleared');
            },
          ),
          if (user != null) ...[
            heading('Account'),
            ListTile(
              leading: const Icon(Icons.person_outline_rounded, color: AppColors.brand),
              title: const Text('Edit profile'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/profile/edit'),
            ),
            ListTile(
              leading: const Icon(Icons.lock_reset_rounded, color: AppColors.brand),
              title: const Text('Change password'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/profile/password'),
            ),
            ListTile(
              leading: const Icon(Icons.delete_forever_outlined, color: AppColors.danger),
              title: const Text('Delete account', style: TextStyle(color: AppColors.danger)),
              subtitle: const Text('Permanently remove your account and saved stalls'),
              onTap: () => _confirmDelete(context),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final deleted = await showDialog<bool>(context: context, builder: (_) => const _DeleteAccountDialog());
    if (deleted != true || !context.mounted) return;
    showSnack(context, 'Your account has been deleted');
    context.go('/home');
  }
}

/// Confirms account deletion. Deleting is permanent, so the server re-checks the password; a
/// wrong one (or a rate limit) is shown under the field and the dialog stays open.
class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _confirm = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _confirm.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _ready => _confirm.text.trim().toUpperCase() == 'DELETE' && _password.text.isNotEmpty;

  Future<void> _delete() async {
    if (!_ready || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthProvider>().deleteAccount(currentPassword: _password.text);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = switch (e.code) {
            ApiErrorCode.invalidPassword => 'That password isn\'t right. Your account was not deleted.',
            _ => authErrorMessage(e),
          });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _forgotPassword() {
    final email = context.read<AuthProvider>().user?.email ?? '';
    final router = GoRouter.of(context);
    Navigator.pop(context, false);
    router.push(Uri(path: '/forgot-password', queryParameters: {if (email.isNotEmpty) 'email': email}).toString());
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      // Scrolls when the keyboard leaves little room (short phones, large text).
      scrollable: true,
      title: const Text('Delete your account?'),
      // Phone-sized on tablets: the warning's single-line width would otherwise widen the dialog.
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('This permanently deletes your account and saved stalls. Your reviews stay up anonymously. This can\'t be undone.'),
            const SizedBox(height: 16),
            TextField(
              controller: _confirm,
              enabled: !_busy,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(hintText: 'Type DELETE to confirm'),
            ),
            const SizedBox(height: 12),
            PasswordField(
              controller: _password,
              label: 'Your password',
              enabled: !_busy,
              autofillHints: const [AutofillHints.password],
              textInputAction: TextInputAction.done,
              errorText: _error,
              onChanged: (_) => setState(() => _error = null),
              onSubmitted: (_) => _delete(),
            ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(onPressed: _busy ? null : _forgotPassword, child: const Text('Forgot password?')),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          onPressed: _ready && !_busy ? _delete : null,
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
              : const Text('Delete'),
        ),
      ],
    );
  }
}
