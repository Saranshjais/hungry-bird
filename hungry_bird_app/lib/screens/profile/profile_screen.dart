import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/formatters.dart';
import '../../core/links.dart';
import '../../core/theme.dart';
import '../../services/hungry_bird_api.dart';
import '../../state/app_config_provider.dart';
import '../../state/auth_provider.dart';
import '../../state/city_provider.dart';
import '../../state/favorites_provider.dart';
import '../../state/preferences_provider.dart';
import '../../widgets/city_picker.dart';
import '../../widgets/common.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final settings = context.watch<AppConfigProvider>().settings;
    final storeUrl = defaultTargetPlatform == TargetPlatform.iOS ? settings.appStoreUrl : settings.playStoreUrl;
    final websiteUrl = settings.websiteUrl.isNotEmpty ? settings.websiteUrl : AppConfig.websiteUrl;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, kNavBarSpace),
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 16),
              child: Text('Profile', style: theme.textTheme.headlineMedium),
            ),
            auth.isLoggedIn ? const _UserCard() : const _GuestCard(),
            const SizedBox(height: 20),
            _Section(
              title: 'Your activity',
              children: [
                _Tile(
                  icon: Icons.add_location_alt_outlined,
                  title: 'Suggest a stall',
                  subtitle: 'Add a hidden gem to the map',
                  onTap: () => context.push('/submit'),
                ),
                if (auth.isLoggedIn) ...[
                  _Tile(icon: Icons.storefront_outlined, title: 'My suggestions', onTap: () => context.push('/profile/submissions')),
                  _Tile(icon: Icons.rate_review_outlined, title: 'My reviews', onTap: () => context.push('/profile/reviews')),
                ],
                _Tile(icon: Icons.favorite_border_rounded, title: 'Saved stalls', onTap: () => context.go('/saved')),
              ],
            ),
            _Section(
              title: 'Preferences',
              children: [
                _Tile(
                  icon: Icons.location_city_outlined,
                  title: 'City',
                  trailingText: context.select<CityProvider, String?>((c) => c.selected?.name),
                  onTap: () => showCityPicker(context),
                ),
                _Tile(
                  icon: Icons.dark_mode_outlined,
                  title: 'Appearance',
                  trailingText: switch (context.select<PreferencesProvider, ThemeMode>((p) => p.themeMode)) {
                    ThemeMode.light => 'Light',
                    ThemeMode.dark => 'Dark',
                    ThemeMode.system => 'System',
                  },
                  onTap: () => context.push('/settings'),
                ),
                _Tile(icon: Icons.settings_outlined, title: 'Settings', onTap: () => context.push('/settings')),
              ],
            ),
            _Section(
              title: 'Support',
              children: [
                _Tile(icon: Icons.support_agent_rounded, title: 'Help & support', onTap: () => context.push('/help')),
                _Tile(
                  icon: Icons.share_outlined,
                  title: 'Share HungryBird',
                  onTap: () => SharePlus.instance.share(ShareParams(
                    text: 'Find the best street food & hidden gems near you on HungryBird 🍢 ${storeUrl.isNotEmpty ? storeUrl : websiteUrl}',
                  )),
                ),
                if (storeUrl.isNotEmpty)
                  _Tile(icon: Icons.star_outline_rounded, title: 'Rate the app', onTap: () => Links.open(context, storeUrl)),
                _Tile(icon: Icons.info_outline_rounded, title: 'About HungryBird', onTap: () => context.push('/about')),
                _Tile(icon: Icons.privacy_tip_outlined, title: 'Privacy policy', onTap: () => Links.open(context, '$websiteUrl/privacy', inApp: true)),
                _Tile(icon: Icons.description_outlined, title: 'Terms of use', onTap: () => Links.open(context, '$websiteUrl/terms', inApp: true)),
              ],
            ),
            if (auth.isLoggedIn)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.dangerSoft)),
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Log out?'),
                        content: const Text('Your saved stalls stay in your account.'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
                        ],
                      ),
                    );
                    if (ok == true && context.mounted) {
                      await context.read<AuthProvider>().logout();
                      if (context.mounted) showSnack(context, 'You\'re logged out');
                    }
                  },
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Log out'),
                ),
              ),
            const SizedBox(height: 16),
            const _VersionLabel(),
          ],
        ),
      ),
    );
  }
}

class _UserCard extends StatefulWidget {
  const _UserCard();

  @override
  State<_UserCard> createState() => _UserCardState();
}

class _UserCardState extends State<_UserCard> {
  int? _reviews;
  int? _suggestions;

  @override
  void initState() {
    super.initState();
    _loadCounts();
  }

  Future<void> _loadCounts() async {
    final api = context.read<HungryBirdApi>();
    try {
      final results = await Future.wait([api.myReviews(), api.mySubmissions()]);
      if (!mounted) return;
      setState(() {
        _reviews = results[0].length;
        _suggestions = results[1].length;
      });
    } on ApiException {
      // Counts are decorative; leave them blank when offline.
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = context.watch<AuthProvider>().user!;
    final saved = context.select<FavoritesProvider, int>((f) => f.count);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFFB923C), AppColors.brandDark]),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 62,
                height: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.22), shape: BoxShape.circle),
                child: Text(Fmt.initials(user.name), style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleLarge?.copyWith(color: Colors.white)),
                    Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                    if (user.createdAt != null)
                      Text('Member since ${Fmt.date(user.createdAt)}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
              IconButton.filled(
                tooltip: 'Edit profile',
                style: IconButton.styleFrom(backgroundColor: Colors.white),
                onPressed: () => context.push('/profile/edit'),
                icon: const Icon(Icons.edit_rounded, color: AppColors.brandDark, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                _Stat(value: '$saved', label: 'Saved', onTap: () => context.go('/saved')),
                _Stat(value: _reviews?.toString() ?? '–', label: 'Reviews', onTap: () => context.push('/profile/reviews')),
                _Stat(value: _suggestions?.toString() ?? '–', label: 'Suggestions', onTap: () => context.push('/profile/submissions')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, required this.onTap});

  final String value;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Column(
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _GuestCard extends StatelessWidget {
  const _GuestCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(color: AppColors.brand, shape: BoxShape.circle),
                child: Image.asset('assets/images/logo_mark_white.png'),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text('Join the HungryBird flock', style: theme.textTheme.titleLarge?.copyWith(color: Colors.white)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Sync your saved stalls, post reviews under your name and follow the gems you suggest.',
            style: TextStyle(color: Colors.white70, height: 1.45),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton(onPressed: () => context.push('/register'), child: const Text('Sign up')),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white38)),
                  onPressed: () => context.push('/login'),
                  child: const Text('Log in'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 6, bottom: 8),
            child: Text(title.toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1.1, fontWeight: FontWeight.w800, color: theme.colorScheme.onSurfaceVariant)),
          ),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  children[i],
                  if (i < children.length - 1) const Divider(indent: 56),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.title, this.subtitle, this.trailingText, required this.onTap});

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? trailingText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: AppColors.brand),
      title: Text(title),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingText != null)
            Text(trailingText!, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.w600)),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _VersionLabel extends StatelessWidget {
  const _VersionLabel();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PackageInfo>(
      future: PackageInfo.fromPlatform(),
      builder: (context, snap) => Center(
        child: Text(
          snap.hasData ? 'HungryBird v${snap.data!.version} (${snap.data!.buildNumber})' : 'HungryBird',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      ),
    );
  }
}
