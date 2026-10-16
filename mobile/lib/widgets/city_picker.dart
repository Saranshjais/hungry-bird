import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/city_provider.dart';
import '../state/notifications_provider.dart';
import 'common.dart';

Future<void> showCityPicker(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    builder: (sheetContext) => const _CityPickerSheet(),
  );
}

class _CityPickerSheet extends StatelessWidget {
  const _CityPickerSheet();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<CityProvider>();
    final cities = provider.cities;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.75),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
              child: Text('Choose your city', style: theme.textTheme.titleLarge),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
              child: Text(
                'We\'re mapping street food city by city.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                itemCount: cities.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final city = cities[i];
                  final selected = city.slug == provider.selectedSlug;
                  return Material(
                    color: selected ? AppColors.brandSoft : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(18),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        provider.select(city);
                        context.read<NotificationsProvider>().load(city: city.slug);
                        Navigator.of(context).pop();
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              // Admin artwork, else bundled art for the launch cities, else a neutral tile.
                              child: AppNetworkImage(
                                url: city.imageUrl,
                                fallbackAsset: city.imageAsset,
                                placeholderIcon: Icons.location_city_rounded,
                                width: 56,
                                height: 56,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    city.name,
                                    style: theme.textTheme.titleMedium?.copyWith(color: selected ? AppColors.ink : null),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    city.vendorCount > 0
                                        ? '${city.vendorCount} stalls${city.state != null ? ' • ${city.state}' : ''}'
                                        : 'Coming soon',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: selected ? AppColors.muted : theme.colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (selected) const Icon(Icons.check_circle_rounded, color: AppColors.brand),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
