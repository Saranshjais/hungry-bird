import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/favorites_provider.dart';
import '../widgets/common.dart';

class _NavItem {
  const _NavItem(this.label, this.icon, this.activeIcon);

  final String label;
  final IconData icon;
  final IconData activeIcon;
}

const _items = [
  _NavItem('Home', Icons.home_outlined, Icons.home_rounded),
  _NavItem('Explore', Icons.search_rounded, Icons.manage_search_rounded),
  _NavItem('Map', Icons.map_outlined, Icons.map_rounded),
  _NavItem('Saved', Icons.favorite_border_rounded, Icons.favorite_rounded),
  _NavItem('Profile', Icons.person_outline_rounded, Icons.person_rounded),
];

/// Hosts the five tabs with a floating pill navigation bar.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  void _onTap(int index) => shell.goBranch(index, initialLocation: index == shell.currentIndex);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: shell,
      bottomNavigationBar: _FloatingNavBar(currentIndex: shell.currentIndex, onTap: _onTap),
    );
  }
}

class _FloatingNavBar extends StatelessWidget {
  const _FloatingNavBar({required this.currentIndex, required this.onTap});

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _labelStyle = TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13);

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final savedCount = context.select<FavoritesProvider, int>((f) => f.count);
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Align(
        heightFactor: 1,
        // Phone-sized pill on tablets and unfolded foldables.
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Container(
            height: 68,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: dark ? AppColors.darkCard : AppColors.ink,
              borderRadius: BorderRadius.circular(34),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.22), blurRadius: 24, offset: const Offset(0, 10))],
            ),
            child: LayoutBuilder(builder: (context, constraints) => _tabs(context, constraints.maxWidth, savedCount)),
          ),
        ),
      ),
    );
  }

  Widget _tabs(BuildContext context, double width, int savedCount) {
    // The selected tab gets 6 of 18 flex units, minus its padding, icon and gap.
    final labelWidth = width * 6 / 18 - 12 * 2 - 24 - 6;
    return Row(
      children: List.generate(_items.length, (i) {
        final item = _items[i];
        final selected = i == currentIndex;
        // Narrow cover screens and large text get an icon-only pill instead of a clipped word.
        final showLabel = selected &&
            textWidth(context, item.label, DefaultTextStyle.of(context).style.merge(_labelStyle)) <= labelWidth;
        return Expanded(
          flex: selected ? 6 : 3,
          child: Semantics(
            selected: selected,
            button: true,
            excludeSemantics: true,
            label: i == 3 && savedCount > 0 ? '${item.label} ($savedCount)' : item.label,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTap(i),
              child: Center(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 260),
                  curve: Curves.easeOutCubic,
                  height: 46,
                  padding: EdgeInsets.symmetric(horizontal: selected ? 12 : 0),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.brand : Colors.transparent,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Badge(
                        isLabelVisible: i == 3 && savedCount > 0 && !selected,
                        label: Text('$savedCount'),
                        backgroundColor: AppColors.brand,
                        child: Icon(
                          selected ? item.activeIcon : item.icon,
                          color: selected ? Colors.white : Colors.white70,
                          size: 24,
                        ),
                      ),
                      if (showLabel) ...[
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            item.label,
                            maxLines: 1,
                            overflow: TextOverflow.clip,
                            style: _labelStyle,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}
