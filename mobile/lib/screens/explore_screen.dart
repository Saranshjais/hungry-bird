import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/city_provider.dart';
import '../widgets/vendor_browser.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key, this.initialQuery});

  final String? initialQuery;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final city = context.select<CityProvider, String>((c) => c.selected?.name ?? 'your city');
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: VendorBrowser(
          initial: BrowseFilters(query: initialQuery ?? ''),
          header: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Explore', style: theme.textTheme.headlineMedium),
                const SizedBox(height: 2),
                Text(
                  'Every stall we\'ve mapped in $city',
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
