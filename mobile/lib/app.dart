import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'services/hungry_bird_api.dart';
import 'services/local_store.dart';
import 'services/location_service.dart';
import 'state/app_config_provider.dart';
import 'state/auth_provider.dart';
import 'state/city_provider.dart';
import 'state/favorites_provider.dart';
import 'state/notifications_provider.dart';
import 'state/preferences_provider.dart';

class HungryBirdApp extends StatefulWidget {
  const HungryBirdApp({super.key, required this.store, required this.api});

  final LocalStore store;
  final HungryBirdApi api;

  @override
  State<HungryBirdApp> createState() => _HungryBirdAppState();
}

class _HungryBirdAppState extends State<HungryBirdApp> {
  late final GoRouter _router = buildRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;
    final store = widget.store;
    return MultiProvider(
      providers: [
        Provider<HungryBirdApi>.value(value: api),
        Provider<LocalStore>.value(value: store),
        ChangeNotifierProvider(create: (_) => PreferencesProvider(store)),
        ChangeNotifierProvider(create: (_) => AppConfigProvider(api)),
        ChangeNotifierProvider(create: (_) => CityProvider(api, store)),
        ChangeNotifierProvider(create: (_) => AuthProvider(api, store)),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProxyProvider<AuthProvider, FavoritesProvider>(
          create: (_) => FavoritesProvider(api, store),
          update: (_, auth, favorites) => favorites!..bindAuth(auth),
        ),
        ChangeNotifierProvider(create: (ctx) => NotificationsProvider(api, ctx.read<PreferencesProvider>())),
      ],
      child: Selector<PreferencesProvider, ThemeMode>(
        selector: (_, p) => p.themeMode,
        builder: (context, themeMode, _) => MaterialApp.router(
          title: 'HungryBird',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: themeMode,
          routerConfig: _router,
          builder: (context, child) {
            // Keep layouts intact on very large accessibility font sizes.
            final media = MediaQuery.of(context);
            return MediaQuery(
              data: media.copyWith(textScaler: media.textScaler.clamp(maxScaleFactor: 1.3)),
              child: child!,
            );
          },
        ),
      ),
    );
  }
}
