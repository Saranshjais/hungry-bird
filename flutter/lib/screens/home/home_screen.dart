import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/app_content.dart';
import '../../models/review.dart';
import '../../models/vendor.dart';
import '../../services/hungry_bird_api.dart';
import '../../services/location_service.dart';
import '../../state/app_config_provider.dart';
import '../../state/city_provider.dart';
import '../../state/notifications_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/vendor_cards.dart';
import 'home_widgets.dart';

/// Async state for one home section.
class _Load<T> {
  T? data;
  String? error;
  bool loading = false;
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _gems = _Load<List<Vendor>>();
  final _top = _Load<List<Vendor>>();
  final _nearby = _Load<List<Vendor>>();
  final _trails = _Load<List<FoodTrail>>();
  final _community = _Load<List<CommunityReview>>();

  String? _citySlug;
  String? _nearbyKey;
  late final LocationProvider _location;

  HungryBirdApi get _api => context.read<HungryBirdApi>();

  @override
  void initState() {
    super.initState();
    _location = context.read<LocationProvider>();
    _location.addListener(_onLocationChanged);
    _trailsAndCommunity();
    // The splash screen may already have a GPS fix before Home is built.
    if (_location.position != null) _onLocationChanged();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final slug = context.watch<CityProvider>().selectedSlug;
    if (slug != null && slug != _citySlug) {
      _citySlug = slug;
      _loadCitySections();
    }
  }

  @override
  void dispose() {
    _location.removeListener(_onLocationChanged);
    super.dispose();
  }

  Future<void> _run<T>(_Load<T> slot, Future<T> Function() task) async {
    setState(() {
      slot.loading = true;
      slot.error = null;
    });
    try {
      final result = await task();
      if (!mounted) return;
      setState(() => slot.data = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => slot.error = e.message);
    } finally {
      if (mounted) setState(() => slot.loading = false);
    }
  }

  void _loadCitySections() {
    final city = _citySlug;
    unawaited(_run(_gems, () async => (await _api.getVendors(city: city, hiddenGem: true, limit: 10)).vendors));
    unawaited(_run(_top, () async => (await _api.getVendors(city: city, sort: VendorSort.popular, limit: 6)).vendors));
  }

  void _trailsAndCommunity() {
    unawaited(_run(_trails, _api.getTrails));
    unawaited(_run(_community, _api.getCommunityReviews));
  }

  void _onLocationChanged() {
    final pos = _location.position;
    if (pos == null) {
      if (mounted) setState(() {});
      return;
    }
    // Avoid refetching for tiny GPS jitter.
    final key = '${pos.latitude.toStringAsFixed(3)},${pos.longitude.toStringAsFixed(3)}';
    if (key == _nearbyKey) return;
    _nearbyKey = key;
    unawaited(_run(_nearby, () => _api.getNearby(lat: pos.latitude, lng: pos.longitude, radiusKm: 5, limit: 10)));
  }

  Future<void> _refresh() async {
    final config = context.read<AppConfigProvider>();
    final notifications = context.read<NotificationsProvider>();
    _nearbyKey = null;
    _loadCitySections();
    _trailsAndCommunity();
    await Future.wait([
      config.load(),
      notifications.load(city: _citySlug),
      _location.refreshIfPermitted(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final config = context.watch<AppConfigProvider>();
    final cityName = context.select<CityProvider, String>((c) => c.selected?.name ?? 'your city');
    final announcement = config.settings.announcement;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        edgeOffset: 120,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const SliverToBoxAdapter(child: HomeHeader()),
            if (announcement.isNotEmpty) SliverToBoxAdapter(child: AnnouncementStrip(text: announcement)),
            SliverToBoxAdapter(child: BannerCarousel(banners: config.banners)),
            const SliverToBoxAdapter(child: SectionHeader(title: 'What are you craving?')),
            SliverToBoxAdapter(child: CategoryStrip(categories: config.categories)),
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Hidden gems 💎',
                subtitle: 'Loved by locals, missed by tourists',
                onSeeAll: () => context.push(Uri(path: '/vendors', queryParameters: {'hidden': '1', 'title': 'Hidden gems'}).toString()),
              ),
            ),
            SliverToBoxAdapter(child: _carousel(_gems, onRetry: _loadCitySections)),
            SliverToBoxAdapter(child: _nearbySection()),
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Most loved in $cityName',
                subtitle: 'The stalls everyone keeps reviewing',
                onSeeAll: () => context.push(Uri(path: '/vendors', queryParameters: {'sort': 'popular', 'title': 'Most loved'}).toString()),
              ),
            ),
            _topList(),
            if ((_trails.data ?? const []).isNotEmpty) ...[
              const SliverToBoxAdapter(child: SectionHeader(title: 'Food trails', subtitle: 'Curated walks through the best bites')),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 190,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _trails.data!.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, i) => TrailCard(trail: _trails.data![i]),
                  ),
                ),
              ),
            ],
            if ((_community.data ?? const []).isNotEmpty) ...[
              const SliverToBoxAdapter(child: SectionHeader(title: 'Fresh from the community')),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 178,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _community.data!.length.clamp(0, 10),
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, i) => CommunityReviewCard(review: _community.data![i]),
                  ),
                ),
              ),
            ],
            const SliverToBoxAdapter(child: SuggestStallCard()),
            SliverToBoxAdapter(child: SizedBox(height: navBarSpace(context))),
          ],
        ),
      ),
    );
  }

  Widget _carousel(_Load<List<Vendor>> slot, {required VoidCallback onRetry}) {
    if (slot.error != null && slot.data == null) {
      return ErrorState(message: slot.error!, onRetry: onRetry, compact: true);
    }
    final items = slot.data;
    if (items != null && items.isEmpty) {
      return const EmptyState(
        icon: Icons.diamond_outlined,
        title: 'No hidden gems yet',
        message: 'Be the first to suggest one in this city!',
        compact: true,
      );
    }
    return SizedBox(
      height: 252,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items?.length ?? 3,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, i) => items == null ? const VendorCardSkeleton() : VendorCard(vendor: items[i]),
      ),
    );
  }

  Widget _nearbySection() {
    final location = context.watch<LocationProvider>();
    if (location.hasFix) {
      final items = _nearby.data;
      return Column(
        children: [
          SectionHeader(
            title: 'Near you',
            subtitle: 'Within 5 km of where you are',
            onSeeAll: () => context.push(Uri(path: '/vendors', queryParameters: {'sort': 'distance', 'scope': 'all', 'title': 'Near you'}).toString()),
          ),
          if (_nearby.error != null && items == null)
            ErrorState(message: _nearby.error!, onRetry: () {
              _nearbyKey = null;
              _onLocationChanged();
            }, compact: true)
          else if (items != null && items.isEmpty)
            const EmptyState(
              icon: Icons.near_me_disabled_outlined,
              title: 'Nothing mapped nearby yet',
              message: 'We haven\'t mapped stalls within 5 km of you. Know one? Suggest it!',
              compact: true,
            )
          else
            SizedBox(
              height: 252,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: items?.length ?? 3,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (_, i) => items == null ? const VendorCardSkeleton() : VendorCard(vendor: items[i]),
              ),
            ),
        ],
      );
    }

    final action = location.busy
        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.gem))
        : TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.gem),
            onPressed: () async {
              if (location.status == LocationStatus.deniedForever || location.status == LocationStatus.serviceDisabled) {
                await location.openSettings();
              } else {
                await location.locate();
              }
            },
            child: Text(location.status == LocationStatus.deniedForever ? 'Settings' : 'Enable'),
          );
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.gemSoft,
          borderRadius: BorderRadius.circular(20),
        ),
        child: LayoutBuilder(builder: (context, constraints) {
          // On cover screens / with large text the button moves under the copy so the title
          // keeps enough width not to break mid-word.
          final stacked = constraints.maxWidth < 260 * MediaQuery.textScalerOf(context).scale(15) / 15;
          return Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: const Icon(Icons.near_me_rounded, color: AppColors.gem),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('What\'s cooking near you?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.ink)),
                    const SizedBox(height: 2),
                    Text(
                      location.message.isNotEmpty ? location.message : 'Turn on location to see the closest stalls.',
                      style: const TextStyle(color: AppColors.inkSoft, fontSize: 12.5, height: 1.35),
                    ),
                    if (stacked) action,
                  ],
                ),
              ),
              if (!stacked) ...[const SizedBox(width: 8), action],
            ],
          );
        }),
      ),
    );
  }

  Widget _topList() {
    final items = _top.data;
    if (_top.error != null && items == null) {
      return SliverToBoxAdapter(child: ErrorState(message: _top.error!, onRetry: _loadCitySections, compact: true));
    }
    if (items != null && items.isEmpty) {
      return const SliverToBoxAdapter(
        child: EmptyState(
          icon: Icons.storefront_outlined,
          title: 'No stalls here yet',
          message: 'We\'re still mapping this city. Suggest a stall to get it started!',
          compact: true,
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverToBoxAdapter(
        child: VendorTileColumn(children: [
          for (var i = 0; i < (items?.length ?? 3); i++) items == null ? const VendorTileSkeleton() : VendorTile(vendor: items[i]),
        ]),
      ),
    );
  }
}
