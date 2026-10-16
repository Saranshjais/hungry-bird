import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/formatters.dart';
import '../../core/links.dart';
import '../../core/theme.dart';
import '../../models/app_content.dart';
import '../../models/review.dart';
import '../../state/city_provider.dart';
import '../../state/notifications_provider.dart';
import '../../widgets/city_picker.dart';
import '../../widgets/common.dart';

class HomeHeader extends StatefulWidget {
  const HomeHeader({super.key});

  @override
  State<HomeHeader> createState() => _HomeHeaderState();
}

class _HomeHeaderState extends State<HomeHeader> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _submit(String value) {
    final q = value.trim();
    context.go(q.isEmpty ? '/explore' : Uri(path: '/explore', queryParameters: {'q': q}).toString());
    _search.clear();
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final city = context.watch<CityProvider>().selected;
    final unread = context.select<NotificationsProvider, int>((n) => n.unreadCount);
    final theme = Theme.of(context);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFB923C), AppColors.brand, AppColors.brandDark],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 12, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Image.asset('assets/images/logo_mark_white.png', height: 34),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => showCityPicker(context),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Exploring', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                            Row(
                              children: [
                                const Icon(Icons.location_on_rounded, color: Colors.white, size: 18),
                                const SizedBox(width: 2),
                                Flexible(
                                  child: Text(
                                    city?.name ?? 'Choose city',
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                                  ),
                                ),
                                const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    onPressed: () => context.push('/notifications'),
                    style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.2)),
                    icon: Badge(
                      isLabelVisible: unread > 0,
                      label: Text('$unread'),
                      backgroundColor: AppColors.ink,
                      child: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text.rich(
                const TextSpan(children: [
                  TextSpan(text: 'Hungry? Find your next\n'),
                  TextSpan(text: 'favourite street bite.', style: TextStyle(color: Color(0xFFFFEDD5))),
                ]),
                style: theme.textTheme.headlineSmall?.copyWith(color: Colors.white, height: 1.2, fontSize: 25),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  onSubmitted: _submit,
                  style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    hintText: 'Search kachori, chai, lassi…',
                    hintStyle: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w500),
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.search_rounded, color: AppColors.muted),
                    suffixIcon: Padding(
                      padding: const EdgeInsets.all(6),
                      child: IconButton.filled(
                        tooltip: 'Search',
                        style: IconButton.styleFrom(backgroundColor: AppColors.ink, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        onPressed: () => _submit(_search.text),
                        icon: const Icon(Icons.tune_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AnnouncementStrip extends StatelessWidget {
  const AnnouncementStrip({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.brandSoft,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.brandLight),
        ),
        child: Row(
          children: [
            const Icon(Icons.campaign_rounded, color: AppColors.brand),
            const SizedBox(width: 10),
            Expanded(
              child: Text(text, style: const TextStyle(color: AppColors.inkSoft, fontWeight: FontWeight.w600, height: 1.35)),
            ),
          ],
        ),
      ),
    );
  }
}

class BannerCarousel extends StatefulWidget {
  const BannerCarousel({super.key, required this.banners});

  final List<AppBanner> banners;

  @override
  State<BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<BannerCarousel> {
  final _controller = PageController(viewportFraction: 0.9);
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_controller.hasClients || widget.banners.length < 2) return;
      final next = (_index + 1) % widget.banners.length;
      _controller.animateToPage(next, duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final banners = widget.banners;
    return Column(
      children: [
        const SizedBox(height: 18),
        SizedBox(
          height: 168,
          child: PageView.builder(
            controller: _controller,
            itemCount: banners.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) {
              final banner = banners[i];
              final clickable = banner.linkType != LinkType.none;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: Material(
                    child: InkWell(
                      onTap: clickable ? () => Links.follow(context, banner.linkType, banner.linkValue) : null,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (banner.assetImage != null)
                            Image.asset(banner.assetImage!, fit: BoxFit.cover, semanticLabel: banner.title)
                          else
                            AppNetworkImage(url: banner.imageUrl),
                          if (banner.assetImage == null) ...[
                            const DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                  colors: [Color(0xCC1C1917), Color(0x001C1917)],
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  SizedBox(
                                    width: 220,
                                    child: Text(
                                      banner.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, height: 1.15),
                                    ),
                                  ),
                                  if (banner.subtitle != null) ...[
                                    const SizedBox(height: 4),
                                    SizedBox(
                                      width: 220,
                                      child: Text(banner.subtitle!, maxLines: 2, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (banners.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(banners.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  height: 6,
                  width: active ? 18 : 6,
                  decoration: BoxDecoration(
                    color: active ? AppColors.brand : Theme.of(context).colorScheme.outline,
                    borderRadius: BorderRadius.circular(6),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }
}

class CategoryStrip extends StatelessWidget {
  const CategoryStrip({super.key, required this.categories});

  final List<FoodCategory> categories;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 104,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final cat = categories[i];
          return SizedBox(
            width: 82,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => context.push(Uri(path: '/vendors', queryParameters: {'category': cat.slug, 'title': cat.name}).toString()),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.brandLight, width: 2),
                      boxShadow: [BoxShadow(color: AppColors.brand.withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, 4))],
                    ),
                    child: cat.imageUrl != null
                        ? ClipOval(child: AppNetworkImage(url: cat.imageUrl, width: 60, height: 60))
                        : Text(cat.icon ?? '🍽️', style: const TextStyle(fontSize: 28)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    cat.name,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700, height: 1.2),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class TrailCard extends StatelessWidget {
  const TrailCard({super.key, required this.trail});

  final FoodTrail trail;

  void _open(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      builder: (sheetContext) {
        final theme = Theme.of(sheetContext);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(trail.title, style: theme.textTheme.titleLarge),
                const SizedBox(height: 6),
                if (trail.description != null)
                  Text(trail.description!, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                const SizedBox(height: 12),
                Wrap(spacing: 8, children: [
                  if (trail.duration != null) Chip(avatar: const Icon(Icons.schedule_rounded, size: 16), label: Text(trail.duration!)),
                  if (trail.budget != null) Chip(avatar: const Icon(Icons.payments_outlined, size: 16), label: Text(trail.budget!)),
                ]),
                const SizedBox(height: 8),
                Text('Stops', style: theme.textTheme.titleSmall),
                const SizedBox(height: 4),
                ...trail.stops.asMap().entries.map((e) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.brandSoft,
                        child: Text('${e.key + 1}', style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w800, fontSize: 13)),
                      ),
                      title: Text(e.value),
                      trailing: const Icon(Icons.search_rounded),
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        context.go(Uri(path: '/explore', queryParameters: {'q': e.value}).toString());
                      },
                    )),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Material(
          child: InkWell(
            onTap: () => _open(context),
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(url: trail.imageUrl),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x001C1917), Color(0xE61C1917)],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(20)),
                        child: Text('${trail.stops.length} stops', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 8),
                      Text(trail.title, maxLines: 2, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800, height: 1.2)),
                      const SizedBox(height: 4),
                      Text(
                        [trail.duration, trail.budget].whereType<String>().join(' • '),
                        style: const TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CommunityReviewCard extends StatelessWidget {
  const CommunityReviewCard({super.key, required this.review});

  final CommunityReview review;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 270,
      child: SurfaceCard(
        onTap: review.vendorId == null ? null : () => context.push('/vendor/${review.vendorId}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Avatar(name: review.authorName, size: 34),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(review.authorName, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                      Text(Fmt.timeAgo(review.createdAt), style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ),
                StarRow(rating: review.rating, size: 14),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: Text(
                '“${review.text ?? ''}”',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.storefront_rounded, size: 15, color: AppColors.brand),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    review.vendorName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class SuggestStallCard extends StatelessWidget {
  const SuggestStallCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.ink,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Know a hidden gem?', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  const Text(
                    'Add your favourite stall to the map and help fellow foodies find it.',
                    style: TextStyle(color: Colors.white70, height: 1.4, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                    onPressed: () => context.push('/submit'),
                    icon: const Icon(Icons.add_location_alt_rounded, size: 20),
                    label: const Text('Suggest a stall'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const Text('🛺', style: TextStyle(fontSize: 54)),
          ],
        ),
      ),
    );
  }
}
