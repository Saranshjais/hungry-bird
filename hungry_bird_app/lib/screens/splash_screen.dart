import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';

import '../core/formatters.dart';
import '../core/router.dart';
import '../core/theme.dart';
import '../services/location_service.dart';
import '../state/app_config_provider.dart';
import '../state/auth_provider.dart';
import '../state/city_provider.dart';
import '../state/notifications_provider.dart';
import '../state/preferences_provider.dart';

/// Loads remote config, session and cities, then routes to the right first screen.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, this.next});

  /// Deep link to open after bootstrapping.
  final String? next;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _slow = false;
  String? _error;
  Timer? _slowTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _slowTimer?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _error = null;
      _slow = false;
    });
    _slowTimer?.cancel();
    _slowTimer = Timer(const Duration(seconds: 5), () {
      if (mounted) setState(() => _slow = true);
    });

    final config = context.read<AppConfigProvider>();
    final auth = context.read<AuthProvider>();
    final cities = context.read<CityProvider>();
    final prefs = context.read<PreferencesProvider>();
    final notifications = context.read<NotificationsProvider>();
    final location = context.read<LocationProvider>();

    await Future.wait([config.load(), auth.init()]);
    await cities.load(defaultSlug: config.settings.defaultCity);
    _slowTimer?.cancel();
    if (!mounted) return;

    if (cities.cities.isEmpty) {
      setState(() => _error = cities.error ?? 'Could not load cities.');
      return;
    }

    unawaited(notifications.load(city: cities.selectedSlug));
    unawaited(location.refreshIfPermitted());

    if (config.settings.maintenanceMode) {
      context.go('/maintenance');
      return;
    }

    try {
      final info = await PackageInfo.fromPlatform();
      if (Fmt.compareVersions(info.version, config.settings.minAppVersion) < 0) {
        if (mounted) context.go('/update');
        return;
      }
    } catch (_) {
      // Version info unavailable (e.g. tests); skip the check.
    }

    if (!mounted) return;
    appReady.value = true;
    final next = widget.next;
    const notDeepLinks = ['/splash', '/onboarding', '/maintenance', '/update'];
    final deepLink =
        next != null && next.startsWith('/') && !notDeepLinks.any(next.startsWith) ? next : null;
    if (!prefs.onboardingDone) {
      context.go('/onboarding');
    } else if (deepLink != null && deepLink != '/home') {
      // Keep Home underneath so "back" from a shared vendor link lands in the app.
      context.go('/home');
      context.push(deepLink);
    } else {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/images/logo.png', width: 230),
                const SizedBox(height: 12),
                Text(
                  'Street food & hidden gems near you',
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 40),
                if (_error == null) ...[
                  const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 3)),
                  AnimatedOpacity(
                    opacity: _slow ? 1 : 0,
                    duration: const Duration(milliseconds: 400),
                    child: Padding(
                      padding: const EdgeInsets.only(top: 20),
                      child: Text(
                        'Warming up the kitchen…\nThe first load can take a few seconds.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.5),
                      ),
                    ),
                  ),
                ] else ...[
                  const Icon(Icons.wifi_off_rounded, size: 40, color: AppColors.brand),
                  const SizedBox(height: 12),
                  Text('Can\'t reach HungryBird', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 6),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _bootstrap,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Try again'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
