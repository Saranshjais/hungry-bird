import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../screens/about_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/explore_screen.dart';
import '../screens/help_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/main_shell.dart';
import '../screens/map_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/profile/change_password_screen.dart';
import '../screens/profile/edit_profile_screen.dart';
import '../screens/profile/my_reviews_screen.dart';
import '../screens/profile/my_submissions_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/saved_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/status_screens.dart';
import '../screens/submit/location_picker_screen.dart';
import '../screens/submit/submit_stall_screen.dart';
import '../screens/vendor/vendor_detail_screen.dart';
import '../screens/vendor_list_screen.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Flipped by the splash screen once config, session and cities are loaded.
final appReady = ValueNotifier<bool>(false);

const _bootstrapFree = {'/splash', '/maintenance', '/update'};

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: appReady,
    // Deep links (shared vendor URLs, web reloads) bootstrap first, then continue.
    redirect: (context, state) {
      if (appReady.value || _bootstrapFree.contains(state.matchedLocation)) return null;
      return Uri(path: '/splash', queryParameters: {'next': state.uri.toString()}).toString();
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, state) => SplashScreen(next: state.uri.queryParameters['next']),
      ),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/maintenance', builder: (_, __) => const MaintenanceScreen()),
      GoRoute(path: '/update', builder: (_, __) => const UpdateRequiredScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => MainShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, __) => const HomeScreen())]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/explore',
              builder: (_, state) => ExploreScreen(initialQuery: state.uri.queryParameters['q']),
            ),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/map', builder: (_, __) => const MapScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/saved', builder: (_, __) => const SavedScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen())]),
        ],
      ),
      GoRoute(
        path: '/vendor/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) => VendorDetailScreen(vendorId: int.tryParse(state.pathParameters['id'] ?? '') ?? 0),
      ),
      GoRoute(
        path: '/vendors',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) => VendorListScreen.fromQuery(state.uri.queryParameters),
      ),
      GoRoute(path: '/submit', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const SubmitStallScreen()),
      GoRoute(
        path: '/pick-location',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) => LocationPickerScreen(initial: state.extra as LocationPickerArgs?),
      ),
      GoRoute(
        path: '/login',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, state) => LoginScreen(reason: state.uri.queryParameters['reason']),
      ),
      GoRoute(path: '/register', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/notifications', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/profile/edit', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const EditProfileScreen()),
      GoRoute(path: '/profile/password', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const ChangePasswordScreen()),
      GoRoute(path: '/profile/submissions', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const MySubmissionsScreen()),
      GoRoute(path: '/profile/reviews', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const MyReviewsScreen()),
      GoRoute(path: '/settings', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/help', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const HelpScreen()),
      GoRoute(path: '/about', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const AboutScreen()),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Page not found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => context.go('/home'), child: const Text('Go home')),
          ],
        ),
      ),
    ),
  );
}
