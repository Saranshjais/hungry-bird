import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/links.dart';
import '../core/theme.dart';
import '../state/app_config_provider.dart';

class _StatusLayout extends StatelessWidget {
  const _StatusLayout({required this.icon, required this.title, required this.message, required this.action});

  final IconData icon;
  final String title;
  final String message;
  final Widget action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        // Centred when it fits; scrolls on short screens / large text; phone-width on tablets.
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: math.max(0, constraints.maxHeight - 64)),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset('assets/images/logo.png', width: 170),
                      const SizedBox(height: 40),
                      Container(
                        width: 96,
                        height: 96,
                        decoration: const BoxDecoration(color: AppColors.brandSoft, shape: BoxShape.circle),
                        child: Icon(icon, size: 44, color: AppColors.brand),
                      ),
                      const SizedBox(height: 24),
                      Text(title, textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
                      const SizedBox(height: 10),
                      Text(
                        message,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.5),
                      ),
                      const SizedBox(height: 32),
                      SizedBox(width: double.infinity, child: action),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  bool _checking = false;

  Future<void> _retry() async {
    setState(() => _checking = true);
    final config = context.read<AppConfigProvider>();
    await config.load();
    if (!mounted) return;
    setState(() => _checking = false);
    if (!config.settings.maintenanceMode) context.go('/splash');
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppConfigProvider>().settings;
    return _StatusLayout(
      icon: Icons.construction_rounded,
      title: 'We\'ll be right back',
      message: settings.maintenanceMessage,
      action: FilledButton(
        onPressed: _checking ? null : _retry,
        child: _checking
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : const Text('Check again'),
      ),
    );
  }
}

class UpdateRequiredScreen extends StatelessWidget {
  const UpdateRequiredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppConfigProvider>().settings;
    final isIos = defaultTargetPlatform == TargetPlatform.iOS;
    final storeUrl = isIos ? settings.appStoreUrl : settings.playStoreUrl;
    return _StatusLayout(
      icon: Icons.system_update_rounded,
      title: 'Time for an update',
      message: settings.forceUpdateMessage.isEmpty
          ? 'This version of HungryBird is no longer supported. Please update to continue.'
          : settings.forceUpdateMessage,
      action: FilledButton(
        onPressed: storeUrl.isEmpty ? null : () => Links.open(context, storeUrl),
        child: Text(storeUrl.isEmpty ? 'Update from your app store' : 'Update now'),
      ),
    );
  }
}
