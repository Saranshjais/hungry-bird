import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/formatters.dart';
import '../../core/links.dart';
import '../../core/theme.dart';
import '../../models/review.dart';
import '../../models/vendor.dart';
import '../../services/hungry_bird_api.dart';
import '../../state/favorites_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/vendor_cards.dart';
import 'vendor_sheets.dart';

class VendorDetailScreen extends StatefulWidget {
  const VendorDetailScreen({super.key, required this.vendorId});

  final int vendorId;

  @override
  State<VendorDetailScreen> createState() => _VendorDetailScreenState();
}

class _VendorDetailScreenState extends State<VendorDetailScreen> {
  final _scroll = ScrollController();
  final _reviewsKey = GlobalKey();

  Vendor? _vendor;
  List<Review> _reviews = [];
  List<Vendor> _nearby = [];
  bool _loading = true;
  String? _error;
  bool _collapsed = false;
  bool _showAllReviews = false;
  bool _expandAbout = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      final collapsed = _scroll.hasClients && _scroll.offset > 230;
      if (collapsed != _collapsed) setState(() => _collapsed = collapsed);
    });
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail = await context.read<HungryBirdApi>().getVendor(widget.vendorId);
      if (!mounted) return;
      context.read<FavoritesProvider>().reconcile(detail.vendor, detail.isFavorite);
      setState(() {
        _vendor = detail.vendor;
        _reviews = detail.reviews;
        _nearby = detail.nearby;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.isNotFound ? 'This stall is no longer listed on HungryBird.' : e.message);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Review? get _myReview {
    for (final r in _reviews) {
      if (r.isMine) return r;
    }
    return null;
  }

  Future<void> _writeReview() async {
    final vendor = _vendor;
    if (vendor == null) return;
    final result = await showReviewSheet(context, vendor: vendor, existing: _myReview);
    if (result == null || !mounted) return;
    setState(() {
      _reviews = [result.review, ..._reviews.where((r) => r.id != result.review.id)];
      _vendor = vendor.copyWith(rating: result.avgRating, totalRatings: result.totalRatings);
    });
    showSnack(context, result.updated ? 'Your review was updated' : 'Thanks! Your review is live');
  }

  void _scrollToReviews() {
    final ctx = _reviewsKey.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final vendor = _vendor;
    if (vendor == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _loading
            ? const _DetailSkeleton()
            : ErrorState(message: _error ?? 'Something went wrong.', onRetry: _load),
      );
    }

    final theme = Theme.of(context);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              stretch: true,
              backgroundColor: theme.colorScheme.surface,
              leading: _CircleAction(icon: Icons.arrow_back_rounded, tooltip: 'Back', onTap: () => Navigator.of(context).maybePop(), plain: _collapsed),
              title: AnimatedOpacity(
                opacity: _collapsed ? 1 : 0,
                duration: const Duration(milliseconds: 200),
                child: Text(vendor.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              actions: [
                _CircleAction(icon: Icons.ios_share_rounded, tooltip: 'Share', onTap: () => Links.shareVendor(vendor), plain: _collapsed),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FavoriteButton(vendor: vendor, onImage: !_collapsed),
                ),
                PopupMenuButton<String>(
                  tooltip: 'More',
                  icon: _CircleIcon(icon: Icons.more_vert_rounded, plain: _collapsed),
                  onSelected: (value) {
                    if (value == 'report') {
                      showReportSheet(context, targetType: 'vendor', targetId: vendor.id, title: 'Report this listing');
                    } else if (value == 'copy') {
                      Clipboard.setData(ClipboardData(text: vendor.fullAddress));
                      showSnack(context, 'Address copied');
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'copy', child: ListTile(leading: Icon(Icons.copy_rounded), title: Text('Copy address'))),
                    PopupMenuItem(value: 'report', child: ListTile(leading: Icon(Icons.flag_outlined), title: Text('Report a problem'))),
                  ],
                ),
                const SizedBox(width: 4),
              ],
              flexibleSpace: FlexibleSpaceBar(
                stretchModes: const [StretchMode.zoomBackground],
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(url: vendor.imageUrl),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          stops: [0, 0.3, 0.7, 1],
                          colors: [Color(0x66000000), Color(0x00000000), Color(0x00000000), Color(0x99000000)],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // The photo stays full-bleed; the details keep a readable width on tablets.
            SliverPadding(
              padding: readableInsets(context, EdgeInsets.zero),
              sliver: SliverMainAxisGroup(slivers: [
                SliverToBoxAdapter(child: _header(vendor)),
                SliverToBoxAdapter(child: _quickActions(vendor)),
                SliverToBoxAdapter(child: _infoCard(vendor)),
                if (vendor.description != null) SliverToBoxAdapter(child: _about(vendor)),
                if (vendor.hasLocation) SliverToBoxAdapter(child: _miniMap(vendor)),
                SliverToBoxAdapter(child: _reviewsSection(vendor)),
                if (_nearby.isNotEmpty) ...[
                  const SliverToBoxAdapter(child: SectionHeader(title: 'More stalls nearby')),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 252,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _nearby.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (_, i) => VendorCard(vendor: _nearby[i]),
                      ),
                    ),
                  ),
                ],
                SliverToBoxAdapter(
                  child: Center(
                    child: TextButton.icon(
                      onPressed: () => showReportSheet(context, targetType: 'vendor', targetId: vendor.id, title: 'Report this listing'),
                      icon: const Icon(Icons.flag_outlined, size: 18),
                      label: const Text('Something wrong? Report this listing'),
                      style: TextButton.styleFrom(foregroundColor: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ]),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: ReadableWidth(
          child: ActionButtonRow(
            secondaryIcon: Icons.rate_review_outlined,
            secondaryLabel: _myReview == null ? 'Review' : 'Edit review',
            onSecondary: _writeReview,
            primaryIcon: Icons.directions_walk_rounded,
            primaryLabel: 'Get directions',
            primaryShortLabel: 'Directions',
            onPrimary: () => Links.directions(context, vendor),
            primaryFlex: 2,
            gap: 12,
          ),
        ),
      ),
    );
  }

  Widget _header(Vendor vendor) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if (vendor.isHiddenGem) const VendorBadge(BadgeKind.hiddenGem),
              if (vendor.isFamous) const VendorBadge(BadgeKind.famous),
              if (vendor.isVerified) const VendorBadge(BadgeKind.verified),
            ],
          ),
          const SizedBox(height: 10),
          Text(vendor.name, style: theme.textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(
            [vendor.cuisineType, vendor.area, vendor.cityName].whereType<String>().toSet().join(' • '),
            style: theme.textTheme.bodyMedium?.copyWith(color: muted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 14),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _scrollToReviews,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: vendor.hasRating
                  ? Row(
                      children: [
                        Text(Fmt.rating(vendor.rating), style: theme.textTheme.headlineSmall?.copyWith(fontSize: 26)),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            StarRow(rating: vendor.rating!, size: 18),
                            Text('${vendor.totalRatings} ${vendor.totalRatings == 1 ? 'rating' : 'ratings'}',
                                style: theme.textTheme.labelSmall?.copyWith(color: muted, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const Spacer(),
                        if (vendor.priceLevel != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(color: AppColors.successSoft, borderRadius: BorderRadius.circular(20)),
                            child: Text(vendor.priceLevel!, style: const TextStyle(color: Color(0xFF166534), fontWeight: FontWeight.w800)),
                          ),
                      ],
                    )
                  : Row(
                      children: [
                        const Icon(Icons.auto_awesome_rounded, color: AppColors.brand),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('New on HungryBird — be the first to review!',
                              style: theme.textTheme.titleSmall?.copyWith(color: AppColors.brandDark)),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickActions(Vendor vendor) {
    final actions = <(IconData, String, VoidCallback)>[
      (Icons.directions_rounded, 'Directions', () => Links.directions(context, vendor)),
      if (vendor.phone != null) (Icons.call_rounded, 'Call', () => Links.call(context, vendor.phone!)),
      (Icons.ios_share_rounded, 'Share', () => Links.shareVendor(vendor)),
      (Icons.rate_review_rounded, 'Review', _writeReview),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          for (final (icon, label, onTap) in actions)
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: onTap,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(color: AppColors.brandSoft, borderRadius: BorderRadius.circular(16)),
                        child: Icon(icon, color: AppColors.brand),
                      ),
                      const SizedBox(height: 6),
                      // Four columns get tight on cover screens; shrink "Directions" rather than break it.
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _infoCard(Vendor vendor) {
    final rows = <Widget>[
      if (vendor.specialtyDish != null)
        _InfoRow(icon: Icons.restaurant_menu_rounded, label: 'Must try', value: vendor.specialtyDish!, highlight: true),
      if (vendor.openingHours != null)
        _InfoRow(
          icon: Icons.schedule_rounded,
          label: 'Hours',
          value: vendor.closedDays != null ? '${vendor.openingHours}\nClosed: ${vendor.closedDays}' : vendor.openingHours!,
        ),
      if (vendor.priceLabel.isNotEmpty) _InfoRow(icon: Icons.payments_outlined, label: 'Price', value: vendor.priceLabel),
      if (vendor.fullAddress.isNotEmpty)
        _InfoRow(icon: Icons.place_outlined, label: 'Address', value: vendor.fullAddress, onTap: () => Links.directions(context, vendor)),
      if (vendor.phone != null) _InfoRow(icon: Icons.call_outlined, label: 'Phone', value: vendor.phone!, onTap: () => Links.call(context, vendor.phone!)),
      if (vendor.website != null) _InfoRow(icon: Icons.language_rounded, label: 'Website', value: vendor.website!, onTap: () => Links.open(context, vendor.website!)),
      if (vendor.instagram != null)
        _InfoRow(
          icon: Icons.camera_alt_outlined,
          label: 'Instagram',
          value: vendor.instagram!,
          onTap: () => Links.open(
            context,
            vendor.instagram!.startsWith('http') ? vendor.instagram! : 'https://instagram.com/${vendor.instagram!.replaceAll('@', '')}',
          ),
        ),
    ];
    if (rows.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(children: rows),
        ),
      ),
    );
  }

  Widget _about(Vendor vendor) {
    final theme = Theme.of(context);
    final text = vendor.description!;
    final long = text.length > 220;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('About', style: theme.textTheme.titleLarge?.copyWith(fontSize: 19)),
          const SizedBox(height: 8),
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            alignment: Alignment.topCenter,
            child: Text(
              text,
              maxLines: _expandAbout || !long ? null : 4,
              overflow: _expandAbout || !long ? null : TextOverflow.ellipsis,
              style: theme.textTheme.bodyLarge?.copyWith(height: 1.55, color: theme.colorScheme.onSurface.withValues(alpha: 0.85)),
            ),
          ),
          if (long)
            TextButton(
              style: TextButton.styleFrom(padding: EdgeInsets.zero),
              onPressed: () => setState(() => _expandAbout = !_expandAbout),
              child: Text(_expandAbout ? 'Show less' : 'Read more'),
            ),
        ],
      ),
    );
  }

  Widget _miniMap(Vendor vendor) {
    final point = LatLng(vendor.lat!, vendor.lng!);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 10),
            child: Text('Location', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 19)),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: SizedBox(
              height: 180,
              child: Stack(
                children: [
                  FlutterMap(
                    options: MapOptions(
                      initialCenter: point,
                      initialZoom: 15.5,
                      interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
                      onTap: (_, __) => Links.directions(context, vendor),
                    ),
                    children: [
                      TileLayer(urlTemplate: AppConfig.mapTileUrl, userAgentPackageName: AppConfig.mapUserAgentPackage),
                      MarkerLayer(markers: [
                        Marker(
                          point: point,
                          width: 44,
                          height: 44,
                          alignment: Alignment.topCenter,
                          child: const Icon(Icons.location_on_rounded, color: AppColors.brand, size: 44),
                        ),
                      ]),
                    ],
                  ),
                  Positioned(
                    right: 10,
                    bottom: 10,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 40), backgroundColor: AppColors.ink),
                      onPressed: () => Links.directions(context, vendor),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: const Text('Open in Maps'),
                    ),
                  ),
                  const Positioned(
                    left: 8,
                    bottom: 6,
                    child: Text('© OpenStreetMap', style: TextStyle(fontSize: 10, color: Colors.black54)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewsSection(Vendor vendor) {
    final theme = Theme.of(context);
    final shown = _showAllReviews ? _reviews : _reviews.take(3).toList();
    final counts = List<int>.filled(5, 0);
    for (final r in _reviews) {
      final star = r.rating.round().clamp(1, 5);
      counts[star - 1]++;
    }
    final maxCount = counts.fold<int>(0, (a, b) => a > b ? a : b);

    return Padding(
      key: _reviewsKey,
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // The action wraps under the title on narrow screens instead of squeezing it.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text('Reviews', style: theme.textTheme.titleLarge?.copyWith(fontSize: 19)),
              ),
              TextButton.icon(
                onPressed: _writeReview,
                icon: const Icon(Icons.edit_rounded, size: 18),
                label: Text(_myReview == null ? 'Write a review' : 'Edit yours'),
              ),
            ],
          ),
          if (_reviews.isEmpty)
            SurfaceCard(
              onTap: _writeReview,
              child: Row(
                children: [
                  const Text('🍽️', style: TextStyle(fontSize: 30)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'No reviews yet. Tried it? Tell everyone what to order!',
                      style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            if (_reviews.length >= 3)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      for (var star = 5; star >= 1; star--)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            children: [
                              SizedBox(width: 14, child: Text('$star', style: theme.textTheme.labelMedium)),
                              const Icon(Icons.star_rounded, size: 14, color: AppColors.star),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: maxCount == 0 ? 0 : counts[star - 1] / maxCount,
                                    minHeight: 8,
                                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                                    color: AppColors.star,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              SizedBox(
                                width: 26,
                                child: Text('${counts[star - 1]}', textAlign: TextAlign.end, style: theme.textTheme.labelMedium),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 10),
            for (final r in shown)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ReviewTile(
                  review: r,
                  onEdit: _writeReview,
                  onReport: () => showReportSheet(context, targetType: 'review', targetId: r.id, title: 'Report this review'),
                ),
              ),
            if (_reviews.length > 3)
              Center(
                child: TextButton(
                  onPressed: () => setState(() => _showAllReviews = !_showAllReviews),
                  child: Text(_showAllReviews ? 'Show fewer reviews' : 'Show all ${_reviews.length} reviews'),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review, required this.onEdit, required this.onReport});

  final Review review;
  final VoidCallback onEdit;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      shape: review.isMine
          ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: AppColors.brand, width: 1.4))
          : null,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 4, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Avatar(name: review.authorName, size: 36),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(child: Text(review.authorName, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall)),
                          if (review.isMine)
                            Container(
                              margin: const EdgeInsets.only(left: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(6)),
                              child: const Text('You', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800)),
                            ),
                        ],
                      ),
                      Row(
                        children: [
                          StarRow(rating: review.rating, size: 14),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              Fmt.timeAgo(review.createdAt),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Review options',
                  icon: Icon(Icons.more_horiz_rounded, color: theme.colorScheme.onSurfaceVariant),
                  onSelected: (v) => v == 'edit' ? onEdit() : onReport(),
                  itemBuilder: (_) => [
                    if (review.isMine) const PopupMenuItem(value: 'edit', child: Text('Edit review')),
                    if (!review.isMine) const PopupMenuItem(value: 'report', child: Text('Report review')),
                  ],
                ),
              ],
            ),
            if (review.text != null) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(right: 10),
                child: Text(review.text!, style: theme.textTheme.bodyMedium?.copyWith(height: 1.5)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value, this.onTap, this.highlight = false});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: highlight ? AppColors.brand : theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: highlight ? FontWeight.w800 : FontWeight.w600,
                      color: highlight ? AppColors.brandDark : null,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null) Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

class _CircleIcon extends StatelessWidget {
  const _CircleIcon({required this.icon, required this.plain});

  final IconData icon;
  final bool plain;

  @override
  Widget build(BuildContext context) {
    if (plain) return Icon(icon);
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.95), shape: BoxShape.circle),
      child: Icon(icon, color: AppColors.ink, size: 20),
    );
  }
}

class _CircleAction extends StatelessWidget {
  const _CircleAction({required this.icon, required this.tooltip, required this.onTap, required this.plain});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool plain;

  @override
  Widget build(BuildContext context) {
    return IconButton(tooltip: tooltip, onPressed: onTap, icon: _CircleIcon(icon: icon, plain: plain));
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: const [
        SkeletonBox(height: 260, radius: 0),
        Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(height: 22, width: 120, radius: 20),
              SizedBox(height: 14),
              SkeletonBox(height: 28, width: 240),
              SizedBox(height: 10),
              SkeletonBox(height: 14, width: 180),
              SizedBox(height: 24),
              SkeletonBox(height: 70),
              SizedBox(height: 16),
              SkeletonBox(height: 160),
            ],
          ),
        ),
      ],
    );
  }
}
