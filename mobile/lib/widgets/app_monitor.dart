import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';

import '../core/formatters.dart';
import '../core/links.dart';
import '../core/router.dart';
import '../core/theme.dart';
import '../state/app_config_provider.dart';
import '../state/auth_provider.dart';
import '../state/preferences_provider.dart';
import '../state/premium_provider.dart';

/// Watches the app coming back to the foreground. The splash screen only checks remote config
/// on a cold start, so on resume this re-checks maintenance mode and the minimum version,
/// refreshes the account (Premium activated by the payment webhook, email verified elsewhere,
/// session revoked by a password reset) and offers the optional update prompt.
class AppMonitor extends StatefulWidget {
  const AppMonitor({super.key, required this.router, required this.child});

  final GoRouter router;
  final Widget child;

  @override
  State<AppMonitor> createState() => _AppMonitorState();
}

class _AppMonitorState extends State<AppMonitor> with WidgetsBindingObserver {
  static const _quietScreens = {'/splash', '/onboarding', '/maintenance', '/update'};

  DateTime? _lastCheck;
  bool _prompted = false;
  String? _installed;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    appReady.addListener(_onReady);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    appReady.removeListener(_onReady);
    super.dispose();
  }

  String get _location => widget.router.routerDelegate.currentConfiguration.uri.path;

  void _onReady() {
    if (appReady.value) WidgetsBinding.instance.addPostFrameCallback((_) => _maybePromptUpdate());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_recheck());
  }

  Future<String?> _installedVersion() async {
    try {
      return _installed ??= (await PackageInfo.fromPlatform()).version;
    } catch (_) {
      return null;
    }
  }

  Future<void> _recheck() async {
    final now = DateTime.now();
    if (_location == '/splash' || (_lastCheck != null && now.difference(_lastCheck!) < const Duration(seconds: 15))) return;
    _lastCheck = now;
    final config = context.read<AppConfigProvider>();
    final auth = context.read<AuthProvider>();
    final premium = context.read<PremiumProvider>();
    await Future.wait([config.load(), auth.refreshUser()]);
    if (!mounted || config.error != null) return;

    final settings = config.settings;
    if (settings.maintenanceMode) {
      if (_location != '/maintenance') widget.router.go('/maintenance');
      return;
    }
    if (_location == '/maintenance') {
      // Maintenance is over: bootstrap again.
      widget.router.go('/splash');
      return;
    }
    final installed = await _installedVersion();
    if (!mounted) return;
    if (installed != null && Fmt.compareVersions(installed, settings.minAppVersion) < 0) {
      if (_location != '/update') widget.router.go('/update');
      return;
    }
    if (premium.enabled) unawaited(premium.refreshStatus());
    await _maybePromptUpdate();
  }

  /// Optional update: once per session, and never again for a version the user put off.
  Future<void> _maybePromptUpdate() async {
    if (_prompted || !appReady.value || !mounted) return;
    final settings = context.read<AppConfigProvider>().settings;
    final prefs = context.read<PreferencesProvider>();
    final installed = await _installedVersion();
    final latest = settings.latestAppVersion;
    if (installed == null || Fmt.compareVersions(installed, latest) >= 0) return;
    if (prefs.dismissedUpdateVersion == latest || !prefs.onboardingDone || _quietScreens.contains(_location)) return;
    final navContext = rootNavigatorKey.currentContext;
    if (navContext == null || !navContext.mounted) return;
    _prompted = true;

    final ios = defaultTargetPlatform == TargetPlatform.iOS;
    final storeUrl = ios ? settings.appStoreUrl : settings.playStoreUrl;
    final update = await showDialog<bool>(
      context: navContext,
      builder: (ctx) => AlertDialog(
        scrollable: true,
        icon: const Icon(Icons.system_update_rounded, color: AppColors.brand, size: 36),
        title: const Text('A new version is available'),
        content: Text(
          'HungryBird $latest has fixes and improvements. You\'re on $installed.'
          '${storeUrl.isEmpty ? ' Update from the ${ios ? 'App Store' : 'Play Store'} when it suits you.' : ''}',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(storeUrl.isEmpty ? 'OK' : 'Later')),
          if (storeUrl.isNotEmpty) FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Update')),
        ],
      ),
    );
    if (update == true) {
      if (navContext.mounted) await Links.open(navContext, storeUrl);
    } else {
      await prefs.dismissUpdate(latest);
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
