import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/auth_provider.dart';
import '../state/favorites_provider.dart';
import '../widgets/common.dart';
import '../widgets/vendor_cards.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final favorites = context.watch<FavoritesProvider>();
    final loggedIn = context.watch<AuthProvider>().isLoggedIn;
    final items = favorites.items;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: favorites.refresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Saved', style: theme.textTheme.headlineMedium),
                      const SizedBox(height: 2),
                      Text(
                        items.isEmpty ? 'Your shortlist of stalls to try' : '${items.length} ${items.length == 1 ? 'stall' : 'stalls'} on your list',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ),
              if (!loggedIn && items.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
                      decoration: BoxDecoration(color: AppColors.brandSoft, borderRadius: BorderRadius.circular(16)),
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_sync_outlined, color: AppColors.brand),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text('Saved on this phone only. Log in to keep them safe across devices.',
                                style: TextStyle(color: AppColors.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
                          ),
                          TextButton(onPressed: () => context.push('/login?reason=saved'), child: const Text('Log in')),
                        ],
                      ),
                    ),
                  ),
                ),
              if (favorites.loading && items.isEmpty)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverVendorTiles(
                    itemCount: 4,
                    itemBuilder: (_, __) => const VendorTileSkeleton(),
                  ),
                )
              else if (favorites.error != null && items.isEmpty)
                SliverToBoxAdapter(child: ErrorState(message: favorites.error!, onRetry: favorites.refresh))
              else if (items.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(
                    icon: Icons.favorite_border_rounded,
                    title: 'Nothing saved yet',
                    message: 'Tap the heart on any stall to build your list of places to try.',
                    actionLabel: 'Explore stalls',
                    onAction: () => context.go('/explore'),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverVendorTiles(
                    itemCount: items.length,
                    // Locked (Premium) stalls keep a heart so they can still be removed.
                    itemBuilder: (_, i) => VendorTile(
                      vendor: items[i],
                      trailing: items[i].locked ? FavoriteButton(vendor: items[i], onImage: false, size: 20) : null,
                    ),
                  ),
                ),
              SliverToBoxAdapter(child: SizedBox(height: navBarSpace(context))),
            ],
          ),
        ),
      ),
    );
  }
}
