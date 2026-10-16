import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';

import '../core/links.dart';
import '../core/theme.dart';
import '../state/app_config_provider.dart';
import '../widgets/common.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final socials = context.select<AppConfigProvider, List<(String, String)>>((c) => c.settings.socialLinks);
    return Scaffold(
      appBar: AppBar(title: const Text('About')),
      body: ListView(
        padding: readableInsets(context, EdgeInsets.fromLTRB(24, 24, 24, 24 + MediaQuery.paddingOf(context).bottom)),
        children: [
          Image.asset('assets/images/logo.png', height: 80),
          const SizedBox(height: 8),
          FutureBuilder<PackageInfo>(
            future: PackageInfo.fromPlatform(),
            builder: (context, snap) => Text(
              snap.hasData ? 'Version ${snap.data!.version} (${snap.data!.buildNumber})' : '',
              textAlign: TextAlign.center,
              style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'HungryBird is a street-food compass for India. We map the carts, tapris and decades-old shops that '
            'locals swear by — and give the community a way to share the hidden gems that never make it onto big '
            'delivery apps.',
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
          ),
          const SizedBox(height: 12),
          Text(
            'Listings come from our own research and from community suggestions, which a moderator reviews before '
            'they go live. Stalls marked Verified have been checked by the HungryBird team, and every rating and '
            'review comes from food lovers like you.',
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.6, color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.language_rounded, color: AppColors.brand),
                  title: const Text('Visit our website'),
                  trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                  onTap: () => Links.open(context, Links.websiteUrl(context)),
                ),
                for (final (label, url) in socials) ...[
                  const Divider(indent: 56),
                  ListTile(
                    leading: const Icon(Icons.public_rounded, color: AppColors.brand),
                    title: Text('HungryBird on $label'),
                    trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                    onTap: () => Links.open(context, url),
                  ),
                ],
                const Divider(indent: 56),
                ListTile(
                  leading: const Icon(Icons.map_outlined, color: AppColors.brand),
                  title: const Text('Map data © OpenStreetMap contributors'),
                  trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                  onTap: () => Links.open(context, 'https://www.openstreetmap.org/copyright'),
                ),
                const Divider(indent: 56),
                ListTile(
                  leading: const Icon(Icons.code_rounded, color: AppColors.brand),
                  title: const Text('Open-source licences'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => showLicensePage(
                    context: context,
                    applicationName: 'HungryBird',
                    applicationIcon: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Image.asset('assets/images/logo_mark.png', height: 48),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Made with ❤️ and a lot of chai in Jaipur',
              textAlign: TextAlign.center, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}
