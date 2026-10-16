import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../services/location_service.dart';
import '../state/preferences_provider.dart';
import '../widgets/common.dart';

class _Page {
  const _Page(this.image, this.title, this.highlight, this.body);

  final String image;
  final String title;
  final String highlight;
  final String body;
}

const _pages = [
  _Page(
    'assets/images/onboarding_1.jpg',
    'Find the stalls',
    'locals love',
    'Discover hidden street-food gems, legendary chaat corners and chai tapris the tourist apps miss.',
  ),
  _Page(
    'assets/images/onboarding_2.jpg',
    'Explore your city',
    'one bite at a time',
    'Browse by craving, see what\'s near you on the map and get walking directions in a tap.',
  ),
  _Page(
    'assets/images/onboarding_3.jpg',
    'Share your',
    'favourite spots',
    'Rate stalls, write reviews and suggest the hidden gems only you know about.',
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish({bool askLocation = false}) async {
    final prefs = context.read<PreferencesProvider>();
    final location = context.read<LocationProvider>();
    if (askLocation) await location.locate();
    await prefs.completeOnboarding();
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = _index == _pages.length - 1;
    final height = MediaQuery.sizeOf(context).height;

    // The controls sit below the pages (not over them), and each page scrolls, so on short
    // screens or with large text the copy is never hidden behind the buttons.
    return Scaffold(
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _pages.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (context, i) {
                    final page = _pages[i];
                    return SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SizedBox(
                            height: height * 0.56,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.asset(page.image, fit: BoxFit.cover),
                                DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      stops: const [0.55, 1],
                                      colors: [Colors.transparent, theme.scaffoldBackgroundColor],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: readableInsets(context, const EdgeInsets.fromLTRB(28, 8, 28, 0), maxWidth: 560),
                            child: Column(
                              children: [
                                Text.rich(
                                  TextSpan(children: [
                                    TextSpan(text: '${page.title}\n'),
                                    TextSpan(text: page.highlight, style: const TextStyle(color: AppColors.brand)),
                                  ]),
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.headlineMedium?.copyWith(height: 1.15),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  page.body,
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.5),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: ReadableWidth(
                      maxWidth: 480,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(_pages.length, (i) {
                              final active = i == _index;
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                height: 8,
                                width: active ? 24 : 8,
                                decoration: BoxDecoration(
                                  color: active ? AppColors.brand : theme.colorScheme.outline,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: isLast
                                  ? () => _finish(askLocation: true)
                                  : () => _controller.nextPage(duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic),
                              child: Text(isLast ? 'Find food near me' : 'Next'),
                            ),
                          ),
                          if (isLast)
                            TextButton(onPressed: _finish, child: const Text('Maybe later')),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: TextButton(
                  style: TextButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.9), foregroundColor: AppColors.ink),
                  onPressed: _finish,
                  child: const Text('Skip'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
