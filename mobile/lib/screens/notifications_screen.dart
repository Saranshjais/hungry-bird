import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/formatters.dart';
import '../core/links.dart';
import '../core/theme.dart';
import '../models/app_content.dart';
import '../state/city_provider.dart';
import '../state/notifications_provider.dart';
import '../widgets/common.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final NotificationsProvider _provider = context.read<NotificationsProvider>();
  final Set<int> _unreadAtOpen = {};

  @override
  void initState() {
    super.initState();
    _unreadAtOpen.addAll(_provider.items.where(_provider.isUnread).map((n) => n.id));
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    await _provider.load(city: context.read<CityProvider>().selectedSlug);
    if (!mounted) return;
    setState(() => _unreadAtOpen.addAll(_provider.items.where(_provider.isUnread).map((n) => n.id)));
    await _provider.markAllRead();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();
    final items = provider.items;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: provider.loading && items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : provider.error != null && items.isEmpty
                ? ListView(children: [ErrorState(message: provider.error!, onRetry: _refresh)])
                : items.isEmpty
                    ? ListView(
                        children: const [
                          EmptyState(
                            icon: Icons.notifications_none_rounded,
                            title: 'You\'re all caught up',
                            message: 'News about new stalls, food trails and offers will show up here.',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: readableInsets(context, EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.paddingOf(context).bottom)),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _NotificationTile(item: items[i], fresh: _unreadAtOpen.contains(items[i].id)),
                      ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.fresh});

  final AppNotification item;
  final bool fresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasLink = item.linkType != LinkType.none && item.linkValue != null;
    return SurfaceCard(
      onTap: hasLink ? () => Links.follow(context, item.linkType, item.linkValue) : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: AppColors.brandSoft, borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.campaign_rounded, color: AppColors.brand),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(item.title, style: theme.textTheme.titleSmall)),
                    if (fresh)
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.brand, shape: BoxShape.circle)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(item.body, style: theme.textTheme.bodyMedium?.copyWith(height: 1.45)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(Fmt.timeAgo(item.createdAt), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                    if (hasLink) ...[
                      const Spacer(),
                      const Text('Open', style: TextStyle(color: AppColors.brand, fontWeight: FontWeight.w800, fontSize: 12.5)),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.brand),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
