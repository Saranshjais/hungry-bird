import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../state/auth_provider.dart';
import '../state/preferences_provider.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final prefs = context.watch<PreferencesProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

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
          if (user != null) ...[
            heading('Notifications'),
            SwitchListTile(
              secondary: const Icon(Icons.notifications_active_outlined, color: AppColors.brand),
              title: const Text('Announcements & offers'),
              subtitle: const Text('News about new stalls and food trails'),
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
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          // Scrolls when the keyboard leaves little room (short phones, large text).
          scrollable: true,
          title: const Text('Delete your account?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('This permanently deletes your account and saved stalls. Your reviews stay up anonymously. This can\'t be undone.'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(hintText: 'Type DELETE to confirm'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
              onPressed: controller.text.trim().toUpperCase() == 'DELETE' ? () => Navigator.pop(ctx, true) : null,
              child: const Text('Delete'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (confirmed != true || !context.mounted) return;
    try {
      await context.read<AuthProvider>().deleteAccount();
      if (!context.mounted) return;
      showSnack(context, 'Your account has been deleted');
      context.go('/home');
    } on ApiException catch (e) {
      if (context.mounted) showSnack(context, e.message, error: true);
    }
  }
}
