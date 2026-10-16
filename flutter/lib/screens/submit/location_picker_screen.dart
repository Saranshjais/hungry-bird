import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../services/location_service.dart';
import '../../widgets/common.dart';

class LocationPickerArgs {
  const LocationPickerArgs({required this.lat, required this.lng});

  final double lat;
  final double lng;
}

/// Drag the map under a fixed pin; returns the chosen [LatLng] via `context.pop`.
class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key, this.initial});

  final LocationPickerArgs? initial;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  final _map = MapController();
  late LatLng _center = LatLng(widget.initial?.lat ?? AppConfig.fallbackLat, widget.initial?.lng ?? AppConfig.fallbackLng);
  bool _dragging = false;

  Future<void> _locateMe() async {
    final location = context.read<LocationProvider>();
    final pos = await location.locate();
    if (!mounted) return;
    if (pos == null) {
      showSnack(context, location.message.isEmpty ? 'Could not get your location' : location.message, error: true);
      return;
    }
    _map.move(LatLng(pos.latitude, pos.longitude), 17);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Pin the stall')),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: 16,
              interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
              onPositionChanged: (camera, hasGesture) => setState(() {
                _center = camera.center;
                _dragging = hasGesture;
              }),
              onMapEvent: (event) {
                if (event is MapEventMoveEnd || event is MapEventFlingAnimationEnd) setState(() => _dragging = false);
              },
            ),
            children: [
              TileLayer(urlTemplate: AppConfig.mapTileUrl, userAgentPackageName: AppConfig.mapUserAgentPackage),
              const SimpleAttributionWidget(source: Text('OpenStreetMap contributors')),
            ],
          ),
          IgnorePointer(
            child: Center(
              child: AnimatedSlide(
                duration: const Duration(milliseconds: 150),
                offset: Offset(0, _dragging ? -0.75 : -0.5),
                child: const Icon(Icons.location_on_rounded, size: 56, color: AppColors.brand, shadows: [Shadow(blurRadius: 10, color: Colors.black38)]),
              ),
            ),
          ),
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Material(
              color: theme.colorScheme.surface,
              elevation: 3,
              borderRadius: BorderRadius.circular(14),
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.pan_tool_alt_outlined, color: AppColors.brand),
                    SizedBox(width: 10),
                    Expanded(child: Text('Move the map so the pin sits exactly on the stall.', style: TextStyle(fontWeight: FontWeight.w600))),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            right: 16,
            bottom: 110,
            child: FloatingActionButton.small(
              heroTag: 'picker-me',
              tooltip: 'My location',
              backgroundColor: theme.colorScheme.surface,
              foregroundColor: AppColors.brand,
              onPressed: _locateMe,
              child: const Icon(Icons.my_location_rounded),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${_center.latitude.toStringAsFixed(5)}, ${_center.longitude.toStringAsFixed(5)}',
              style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => context.pop(_center),
                icon: const Icon(Icons.check_rounded),
                label: const Text('Confirm this spot'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
