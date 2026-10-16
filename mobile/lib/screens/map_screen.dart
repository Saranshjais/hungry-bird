import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/config.dart';
import '../core/formatters.dart';
import '../core/links.dart';
import '../core/theme.dart';
import '../models/city.dart';
import '../models/vendor.dart';
import '../services/hungry_bird_api.dart';
import '../services/location_service.dart';
import '../state/city_provider.dart';
import '../state/premium_provider.dart';
import '../widgets/common.dart';
import '../widgets/vendor_cards.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _map = MapController();
  bool _mapReady = false;
  List<Vendor> _vendors = const [];
  bool _loading = false;
  String? _error;
  bool _gemsOnly = false;
  Vendor? _selected;
  City? _city;
  String? _unlockKey;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final city = context.watch<CityProvider>().selected;
    // Premium gems only get coordinates once unlocked.
    final unlock = context.watch<PremiumProvider>().unlockKey;
    final unlockChanged = _unlockKey != null && unlock != _unlockKey;
    _unlockKey = unlock;
    if (city != null && city.slug != _city?.slug) {
      _city = city;
      _selected = null;
      _load();
      if (_mapReady) _map.move(_cityCenter(city), 13);
    } else if (unlockChanged && city != null) {
      _load();
    }
  }

  LatLng _cityCenter(City? city) =>
      LatLng(city?.lat ?? AppConfig.fallbackLat, city?.lng ?? AppConfig.fallbackLng);

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await context.read<HungryBirdApi>().getVendors(city: _city?.slug, limit: 500);
      if (!mounted) return;
      // Only pins with real coordinates (locked Premium gems never carry any).
      setState(() => _vendors = page.vendors.where((v) => v.hasLocation && !v.locked).toList());
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _locateMe() async {
    final location = context.read<LocationProvider>();
    final pos = await location.locate();
    if (!mounted) return;
    if (pos == null) {
      showSnack(context, location.message.isEmpty ? 'Could not get your location' : location.message, error: true);
      return;
    }
    _map.move(LatLng(pos.latitude, pos.longitude), 15);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final position = context.watch<LocationProvider>().position;
    final visible = _gemsOnly ? _vendors.where((v) => v.isHiddenGem).toList() : _vendors;

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _cityCenter(_city),
              initialZoom: 13,
              minZoom: 4,
              maxZoom: 18,
              onMapReady: () => _mapReady = true,
              onTap: (_, __) => setState(() => _selected = null),
              interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
            ),
            children: [
              TileLayer(urlTemplate: AppConfig.mapTileUrl, userAgentPackageName: AppConfig.mapUserAgentPackage),
              MarkerLayer(
                markers: [
                  for (final v in visible)
                    Marker(
                      point: LatLng(v.lat!, v.lng!),
                      width: 44,
                      height: 52,
                      alignment: Alignment.topCenter,
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selected = v);
                          _map.move(LatLng(v.lat!, v.lng!), _map.camera.zoom < 14 ? 15 : _map.camera.zoom);
                        },
                        child: _Pin(vendor: v, selected: _selected?.id == v.id),
                      ),
                    ),
                  if (position != null)
                    Marker(
                      point: LatLng(position.latitude, position.longitude),
                      width: 26,
                      height: 26,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.info,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                          boxShadow: [BoxShadow(color: AppColors.info.withValues(alpha: 0.4), blurRadius: 12, spreadRadius: 4)],
                        ),
                      ),
                    ),
                ],
              ),
              // Lifted above the floating nav bar so the (required) attribution stays visible.
              Padding(
                padding: EdgeInsets.only(bottom: navBarSpace(context) - 24),
                child: RichAttributionWidget(
                  alignment: AttributionAlignment.bottomLeft,
                  attributions: [
                    TextSourceAttribution(
                      'OpenStreetMap contributors',
                      onTap: () => Links.open(context, 'https://openstreetmap.org/copyright'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Top bar (+ error banner right under it, however tall the bar gets with large text)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Material(
                          color: theme.colorScheme.surface,
                          elevation: 4,
                          shadowColor: Colors.black26,
                          borderRadius: BorderRadius.circular(18),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                const Icon(Icons.map_rounded, color: AppColors.brand),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(_city?.name ?? 'Map', style: theme.textTheme.titleSmall),
                                      Text(
                                        _loading ? 'Loading stalls…' : '${visible.length} stalls on the map',
                                        style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                      ),
                                    ],
                                  ),
                                ),
                                if (_loading) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Material(
                        color: _gemsOnly ? AppColors.gem : theme.colorScheme.surface,
                        elevation: 4,
                        shadowColor: Colors.black26,
                        borderRadius: BorderRadius.circular(18),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => setState(() {
                            _gemsOnly = !_gemsOnly;
                            _selected = null;
                          }),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Icon(Icons.diamond_rounded, color: _gemsOnly ? Colors.white : AppColors.gem, semanticLabel: 'Hidden gems only'),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Material(
                        color: AppColors.dangerSoft,
                        borderRadius: BorderRadius.circular(14),
                        child: LayoutBuilder(builder: (context, constraints) {
                          const style = TextStyle(color: AppColors.ink, fontSize: 13);
                          final retry = TextButton(onPressed: _load, child: const Text('Retry'));
                          // Tile padding, icon and gaps take ~88pt, the button its label + 24pt.
                          final room = constraints.maxWidth - 88 - textWidth(context, 'Retry', theme.textTheme.labelLarge ?? style) - 24;
                          final inline = wordsFit(context, _error!, DefaultTextStyle.of(context).style.merge(style), room);
                          return ListTile(
                            leading: const Icon(Icons.cloud_off_rounded, color: AppColors.danger),
                            title: Text(_error!, style: style),
                            subtitle: inline ? null : Align(alignment: AlignmentDirectional.centerStart, child: retry),
                            trailing: inline ? retry : null,
                          );
                        }),
                      ),
                    ),
                ],
              ),
            ),
          ),
          // Controls + preview card, kept clear of the floating nav bar (taller with 3-button
          // navigation or a home indicator) and phone-sized on tablets.
          Positioned(
            left: 16,
            right: 16,
            bottom: math.max(kNavBarSpace - 12, MediaQuery.paddingOf(context).bottom + 12),
            child: Align(
              alignment: Alignment.bottomRight,
              heightFactor: 1,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    FloatingActionButton.small(
                      heroTag: 'map-city',
                      tooltip: 'Back to city centre',
                      backgroundColor: theme.colorScheme.surface,
                      foregroundColor: theme.colorScheme.onSurface,
                      onPressed: () => _map.move(_cityCenter(_city), 13),
                      child: const Icon(Icons.location_city_rounded),
                    ),
                    const SizedBox(height: 8),
                    FloatingActionButton(
                      heroTag: 'map-me',
                      tooltip: 'My location',
                      backgroundColor: AppColors.brand,
                      foregroundColor: Colors.white,
                      onPressed: _locateMe,
                      child: const Icon(Icons.my_location_rounded),
                    ),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 250),
                      transitionBuilder: (child, anim) => SlideTransition(
                        position: Tween(begin: const Offset(0, 0.3), end: Offset.zero).animate(anim),
                        child: FadeTransition(opacity: anim, child: child),
                      ),
                      child: _selected == null
                          ? const SizedBox(width: double.infinity, key: ValueKey('none'))
                          : Padding(
                              key: ValueKey(_selected!.id),
                              padding: const EdgeInsets.only(top: 12),
                              child: _PreviewCard(vendor: _selected!, userLat: position?.latitude, userLng: position?.longitude),
                            ),
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
}

class _Pin extends StatelessWidget {
  const _Pin({required this.vendor, required this.selected});

  final Vendor vendor;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final color = vendor.isHiddenGem ? AppColors.gem : AppColors.brand;
    return AnimatedScale(
      scale: selected ? 1.25 : 1,
      alignment: Alignment.bottomCenter,
      duration: const Duration(milliseconds: 200),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: selected ? AppColors.ink : color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
            ),
            child: Icon(vendor.isHiddenGem ? Icons.diamond_rounded : Icons.restaurant_rounded, color: Colors.white, size: 18),
          ),
          CustomPaint(size: const Size(12, 8), painter: _PinTail(selected ? AppColors.ink : color)),
        ],
      ),
    );
  }
}

class _PinTail extends CustomPainter {
  _PinTail(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _PinTail old) => old.color != color;
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({required this.vendor, this.userLat, this.userLng});

  final Vendor vendor;
  final double? userLat;
  final double? userLng;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    String? distance;
    if (userLat != null && userLng != null && vendor.hasLocation) {
      final km = const Distance().as(LengthUnit.Meter, LatLng(userLat!, userLng!), LatLng(vendor.lat!, vendor.lng!)) / 1000;
      distance = Fmt.distance(km);
    }
    return Material(
      color: theme.colorScheme.surface,
      elevation: 8,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/vendor/${vendor.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Row(
                children: [
                  AppNetworkImage(url: vendor.imageUrl, width: 76, height: 76, radius: 14),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(vendor.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall?.copyWith(fontSize: 16)),
                        Text(
                          [vendor.subtitle, if (distance != null) '$distance away'].where((s) => s.isNotEmpty).join(' • '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            RatingPill(rating: vendor.rating, count: vendor.totalRatings, compact: true),
                            if (vendor.isHiddenGem) const VendorBadge(BadgeKind.hiddenGem, small: true),
                          ],
                        ),
                      ],
                    ),
                  ),
                  FavoriteButton(vendor: vendor, onImage: false),
                ],
              ),
              const SizedBox(height: 10),
              ActionButtonRow(
                secondaryIcon: Icons.directions_rounded,
                secondaryLabel: 'Directions',
                onSecondary: () => Links.directions(context, vendor),
                primaryLabel: 'View stall',
                onPrimary: () => context.push('/vendor/${vendor.id}'),
                minHeight: 44,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
