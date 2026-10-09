import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../services/hungry_bird_api.dart';
import '../../widgets/common.dart';

class MySubmissionsScreen extends StatefulWidget {
  const MySubmissionsScreen({super.key});

  @override
  State<MySubmissionsScreen> createState() => _MySubmissionsScreenState();
}

class _MySubmissionsScreenState extends State<MySubmissionsScreen> {
  List<Submission>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await context.read<HungryBirdApi>().mySubmissions();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    return Scaffold(
      appBar: AppBar(title: const Text('My suggestions')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        onPressed: () => context.push('/submit'),
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Suggest a stall'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null && items == null
            ? ListView(children: [ErrorState(message: _error!, onRetry: _load)])
            : items == null
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? ListView(children: const [
                        EmptyState(
                          icon: Icons.add_location_alt_outlined,
                          title: 'No suggestions yet',
                          message: 'Know a stall that deserves to be on the map? Suggest it and we\'ll verify it.',
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _SubmissionCard(item: items[i]),
                      ),
      ),
    );
  }
}

class _SubmissionCard extends StatelessWidget {
  const _SubmissionCard({required this.item});

  final Submission item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (label, fg, bg, icon) = switch (item.status) {
      'approved' => ('Live on the map', AppColors.success, AppColors.successSoft, Icons.check_circle_rounded),
      'rejected' => ('Not approved', AppColors.danger, AppColors.dangerSoft, Icons.cancel_rounded),
      _ => ('Under review', const Color(0xFFB45309), const Color(0xFFFEF3C7), Icons.hourglass_top_rounded),
    };
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.stallName, style: theme.textTheme.titleMedium)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 14, color: fg),
                    const SizedBox(width: 4),
                    Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [item.cuisineType, item.cityName, item.address].whereType<String>().join(' • '),
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 6),
          Text('Suggested ${Fmt.timeAgo(item.createdAt)}',
              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          if (item.reviewNotes != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
              child: Text('Note from our team: ${item.reviewNotes}', style: theme.textTheme.bodySmall),
            ),
          ],
        ],
      ),
    );
  }
}
