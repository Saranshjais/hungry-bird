import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../models/vendor.dart';
import '../state/favorites_provider.dart';
import 'common.dart';

class FavoriteButton extends StatelessWidget {
  const FavoriteButton({super.key, required this.vendor, this.onImage = true, this.size = 20});

  final Vendor vendor;
  final bool onImage;
  final double size;

  @override
  Widget build(BuildContext context) {
    final saved = context.select<FavoritesProvider, bool>((f) => f.isSaved(vendor.id));
    return Material(
      color: onImage ? Colors.white.withValues(alpha: 0.95) : Colors.transparent,
      shape: const CircleBorder(),
      elevation: onImage ? 2 : 0,
      shadowColor: Colors.black26,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () async {
          try {
            final nowSaved = await context.read<FavoritesProvider>().toggle(vendor);
            if (context.mounted) {
              showSnack(context, nowSaved ? 'Saved ${vendor.name}' : 'Removed from saved');
            }
          } on ApiException catch (e) {
            if (context.mounted) showSnack(context, e.message, error: true);
          }
        },
        child: Padding(
          padding: EdgeInsets.all(onImage ? 8 : 4),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
            child: Icon(
              saved ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              key: ValueKey(saved),
              size: size,
              color: saved ? AppColors.danger : (onImage ? AppColors.ink : Theme.of(context).colorScheme.onSurfaceVariant),
              semanticLabel: saved ? 'Remove from saved' : 'Save',
            ),
          ),
        ),
      ),
    );
  }
}

/// Image-forward card for horizontal carousels.
class VendorCard extends StatelessWidget {
  const VendorCard({super.key, required this.vendor, this.width = 230, this.imageHeight = 140});

  final Vendor vendor;
  final double width;
  final double imageHeight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: width,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/vendor/${vendor.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  AppNetworkImage(url: vendor.imageUrl, height: imageHeight, width: width),
                  Positioned(top: 10, left: 10, child: RatingPill(rating: vendor.rating, count: vendor.totalRatings, onImage: true, compact: true)),
                  Positioned(top: 6, right: 6, child: FavoriteButton(vendor: vendor, size: 18)),
                  if (vendor.isHiddenGem)
                    const Positioned(bottom: 8, left: 10, child: VendorBadge(BadgeKind.hiddenGem, small: true)),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vendor.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall?.copyWith(fontSize: 15)),
                    const SizedBox(height: 3),
                    Text(
                      vendor.specialtyDish ?? vendor.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(Icons.place_outlined, size: 14, color: theme.colorScheme.onSurfaceVariant),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            vendor.distanceKm != null ? Fmt.distance(vendor.distanceKm) : (vendor.area ?? vendor.cityName ?? ''),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (vendor.priceLevel != null)
                          Text(vendor.priceLevel!, style: theme.textTheme.labelSmall?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact row for vertical lists.
class VendorTile extends StatelessWidget {
  const VendorTile({super.key, required this.vendor, this.trailing});

  final Vendor vendor;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/vendor/${vendor.id}'),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              AppNetworkImage(url: vendor.imageUrl, width: 92, height: 92, radius: 14),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(vendor.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall?.copyWith(fontSize: 15)),
                        ),
                        trailing ?? FavoriteButton(vendor: vendor, onImage: false, size: 20),
                      ],
                    ),
                    Text(
                      vendor.subtitle.isEmpty ? (vendor.cityName ?? '') : vendor.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(color: muted),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        RatingPill(rating: vendor.rating, count: vendor.totalRatings, compact: true),
                        if (vendor.isHiddenGem) const VendorBadge(BadgeKind.hiddenGem, small: true),
                        if (vendor.isFamous) const VendorBadge(BadgeKind.famous, small: true),
                        if (vendor.distanceKm != null)
                          _MetaChip(icon: Icons.near_me_rounded, label: Fmt.distance(vendor.distanceKm)),
                        if (vendor.priceLevel != null)
                          Text(vendor.priceLevel!,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.success)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: muted),
        const SizedBox(width: 2),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: muted)),
      ],
    );
  }
}

class VendorTileSkeleton extends StatelessWidget {
  const VendorTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(10),
        child: Row(
          children: [
            SkeletonBox(width: 92, height: 92, radius: 14),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(height: 16, width: 160),
                  SizedBox(height: 8),
                  SkeletonBox(height: 12, width: 110),
                  SizedBox(height: 14),
                  SkeletonBox(height: 20, width: 140, radius: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class VendorCardSkeleton extends StatelessWidget {
  const VendorCardSkeleton({super.key, this.width = 230});

  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: const Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(height: 140, radius: 0),
            Padding(
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(height: 14, width: 150),
                  SizedBox(height: 8),
                  SkeletonBox(height: 11, width: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
