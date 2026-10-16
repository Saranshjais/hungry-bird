import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatters.dart';
import '../../models/review.dart';
import '../../services/hungry_bird_api.dart';
import '../../widgets/common.dart';

class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key});

  @override
  State<MyReviewsScreen> createState() => _MyReviewsScreenState();
}

class _MyReviewsScreenState extends State<MyReviewsScreen> {
  List<MyReview>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await context.read<HungryBirdApi>().myReviews();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = _items;
    return Scaffold(
      appBar: AppBar(title: const Text('My reviews')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null && items == null
            ? ListView(children: [ErrorState(message: _error!, onRetry: _load)])
            : items == null
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? ListView(children: [
                        EmptyState(
                          icon: Icons.rate_review_outlined,
                          title: 'No reviews yet',
                          message: 'Tried a stall recently? Rate it to help fellow foodies.',
                          actionLabel: 'Find a stall',
                          onAction: () => context.go('/explore'),
                        ),
                      ])
                    : ListView.separated(
                        padding: readableInsets(context, EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.paddingOf(context).bottom)),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final r = items[i];
                          return SurfaceCard(
                            onTap: r.vendorId == null ? null : () => context.push('/vendor/${r.vendorId}'),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                r.vendorLocked
                                    ? LockedImage(url: r.vendorImageUrl, width: 60, height: 60, radius: 12, lockSize: 16)
                                    : AppNetworkImage(url: r.vendorImageUrl, width: 60, height: 60, radius: 12),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(r.vendorName, style: theme.textTheme.titleSmall),
                                      const SizedBox(height: 2),
                                      Row(children: [
                                        StarRow(rating: r.rating, size: 14),
                                        const SizedBox(width: 6),
                                        Flexible(
                                          child: Text(Fmt.timeAgo(r.createdAt),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                                        ),
                                      ]),
                                      if (r.text != null) ...[
                                        const SizedBox(height: 6),
                                        Text(r.text!, maxLines: 3, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodyMedium),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
