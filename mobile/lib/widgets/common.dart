import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../core/formatters.dart';
import '../core/theme.dart';

/// Space reserved under scrollables for the floating bottom navigation bar.
const double kNavBarSpace = 110;

/// [kNavBarSpace], grown when a tall system navigation bar (Android 3-button nav) lifts the
/// floating bar. Inside the tab shell the bottom padding is the floating bar's full height.
double navBarSpace(BuildContext context) => math.max(kNavBarSpace, MediaQuery.paddingOf(context).bottom + 8);

/// Widest a column of text, forms or details gets on tablets and unfolded foldables.
const double kContentMaxWidth = 680;

/// [padding] widened symmetrically so the content between stays at most [maxWidth] wide.
/// Phones get [padding] unchanged; tablets get a centred, readable column.
EdgeInsets readableInsets(BuildContext context, EdgeInsets padding, {double maxWidth = kContentMaxWidth}) {
  final extra = (MediaQuery.sizeOf(context).width - padding.horizontal - maxWidth) / 2;
  if (extra <= 0) return padding;
  return padding.copyWith(left: padding.left + extra, right: padding.right + extra);
}

/// Caps [child] at [maxWidth] and centres it horizontally (no-op on phones).
class ReadableWidth extends StatelessWidget {
  const ReadableWidth({super.key, required this.child, this.maxWidth = kContentMaxWidth});

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      heightFactor: 1,
      child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
    );
  }
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  messenger?.hideCurrentSnackBar();
  messenger?.showSnackBar(SnackBar(
    content: Row(
      children: [
        Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
            color: error ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC), size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
      ],
    ),
  ));
}

/// Shown where a photo is missing: a plain tile with an icon, never a stock photo that could
/// pass for the stall's own.
class ImagePlaceholder extends StatelessWidget {
  const ImagePlaceholder({super.key, this.width, this.height, this.icon = Icons.storefront_rounded});

  final double? width;
  final double? height;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(builder: (context, constraints) {
      final w = width ?? (constraints.hasBoundedWidth ? constraints.maxWidth : 96);
      final h = height ?? (constraints.hasBoundedHeight ? constraints.maxHeight : 96);
      return Container(
        width: width,
        height: height,
        color: scheme.surfaceContainerHighest,
        alignment: Alignment.center,
        child: Icon(icon, size: (math.min(w, h) * 0.34).clamp(16.0, 56.0), color: scheme.onSurfaceVariant.withValues(alpha: 0.45)),
      );
    });
  }
}

class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.radius = 0,
    this.fallbackAsset,
    this.placeholderIcon = Icons.storefront_rounded,
  });

  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final double radius;

  /// Bundled artwork for a missing/broken [url]; otherwise an [ImagePlaceholder].
  final String? fallbackAsset;
  final IconData placeholderIcon;

  @override
  Widget build(BuildContext context) {
    Widget fallback() => fallbackAsset != null
        ? Image.asset(fallbackAsset!, fit: fit, width: width, height: height)
        : ImagePlaceholder(width: width, height: height, icon: placeholderIcon);
    final image = (url == null || !url!.startsWith('http'))
        ? fallback()
        : CachedNetworkImage(
            imageUrl: url!,
            fit: fit,
            width: width,
            height: height,
            fadeInDuration: const Duration(milliseconds: 200),
            placeholder: (_, __) => SkeletonBox(width: width, height: height, radius: 0),
            errorWidget: (_, __, ___) => fallback(),
          );
    if (radius == 0) return image;
    return ClipRRect(borderRadius: BorderRadius.circular(radius), child: image);
  }
}

/// A Premium item's photo: blurred beyond recognition, darkened, with a lock on top.
class LockedImage extends StatelessWidget {
  const LockedImage({super.key, required this.url, this.width, this.height, this.radius = 0, this.lockSize = 20});

  final String? url;
  final double? width;
  final double? height;
  final double radius;
  final double lockSize;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ImageFiltered(
              imageFilter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16, tileMode: TileMode.clamp),
              child: AppNetworkImage(url: url, width: width, height: height, placeholderIcon: Icons.diamond_rounded),
            ),
            const ColoredBox(color: Color(0x4D1C1917)),
            Center(
              child: Container(
                padding: EdgeInsets.all(lockSize * 0.45),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.92), shape: BoxShape.circle),
                child: Icon(Icons.lock_rounded, size: lockSize, color: AppColors.premium, semanticLabel: 'Premium'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height, this.radius = 12});

  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: dark ? const Color(0xFF292524) : const Color(0xFFEDEBE9),
      highlightColor: dark ? const Color(0xFF3A3532) : const Color(0xFFF8F7F6),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(radius)),
      ),
    );
  }
}

/// Star + rating, or "New" for unrated stalls.
class RatingPill extends StatelessWidget {
  const RatingPill({super.key, required this.rating, this.count = 0, this.onImage = false, this.compact = false});

  final double? rating;
  final int count;
  final bool onImage;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final hasRating = rating != null && count > 0;
    final bg = onImage ? Colors.white : (hasRating ? AppColors.successSoft : AppColors.brandSoft);
    final fg = hasRating ? (onImage ? AppColors.ink : const Color(0xFF166534)) : AppColors.brandDark;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 7 : 9, vertical: compact ? 3 : 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: onImage ? [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 8)] : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(hasRating ? Icons.star_rounded : Icons.auto_awesome_rounded,
              size: compact ? 13 : 15, color: hasRating ? AppColors.star : AppColors.brand),
          const SizedBox(width: 3),
          Flexible(
            child: Text(
              hasRating ? (compact ? Fmt.rating(rating) : '${Fmt.rating(rating)} (${Fmt.count(count)})') : 'New',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: compact ? 11.5 : 12.5, fontWeight: FontWeight.w800, color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

enum BadgeKind { hiddenGem, famous, verified, premium }

class VendorBadge extends StatelessWidget {
  const VendorBadge(this.kind, {super.key, this.small = false});

  final BadgeKind kind;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final (label, icon, fg, bg) = switch (kind) {
      BadgeKind.hiddenGem => ('Hidden Gem', Icons.diamond_rounded, AppColors.gem, AppColors.gemSoft),
      BadgeKind.famous => ('Local Legend', Icons.local_fire_department_rounded, AppColors.brandDeep, AppColors.brandLight),
      BadgeKind.verified => ('Verified', Icons.verified_rounded, AppColors.info, const Color(0xFFDBEAFE)),
      BadgeKind.premium => ('Premium', Icons.workspace_premium_rounded, AppColors.premium, AppColors.premiumSoft),
    };
    return Container(
      padding: EdgeInsets.symmetric(horizontal: small ? 7 : 10, vertical: small ? 3 : 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: small ? 12 : 14, color: fg),
          const SizedBox(width: 4),
          // Ellipsizes rather than overflows when squeezed (narrow cards, large text).
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: small ? 10.5 : 12, fontWeight: FontWeight.w800, color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.subtitle, this.onSeeAll, this.padding});

  final String title;
  final String? subtitle;
  final VoidCallback? onSeeAll;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(20, 24, 12, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleLarge?.copyWith(fontSize: 19)),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                  ),
              ],
            ),
          ),
          if (onSeeAll != null)
            TextButton(
              onPressed: onSeeAll,
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Text('See all'),
                SizedBox(width: 2),
                Icon(Icons.chevron_right_rounded, size: 18),
              ]),
            ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.compact = false,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 32, vertical: compact ? 24 : 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: compact ? 64 : 84,
              height: compact ? 64 : 84,
              decoration: const BoxDecoration(color: AppColors.brandSoft, shape: BoxShape.circle),
              child: Icon(icon, size: compact ? 30 : 38, color: AppColors.brand),
            ),
            const SizedBox(height: 18),
            Text(title, textAlign: TextAlign.center, style: theme.textTheme.titleMedium?.copyWith(fontSize: 18)),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.45),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry, this.compact = false});

  final String message;
  final VoidCallback onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) => EmptyState(
        icon: Icons.cloud_off_rounded,
        title: 'Couldn\'t load this',
        message: message,
        actionLabel: 'Try again',
        onAction: onRetry,
        compact: compact,
      );
}

/// Interactive 1–5 star picker.
class StarRatingInput extends StatelessWidget {
  const StarRatingInput({super.key, required this.value, required this.onChanged, this.size = 40});

  final int value;
  final ValueChanged<int> onChanged;
  final double size;

  @override
  Widget build(BuildContext context) {
    // Five 40pt stars need ~280pt: scale them down on very narrow screens (Galaxy Fold cover,
    // iPad Slide Over) instead of overflowing.
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(5, (i) {
          final filled = i < value;
          return Semantics(
            button: true,
            label: '${i + 1} star${i == 0 ? '' : 's'}',
            selected: filled,
            child: IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: size,
              onPressed: () => onChanged(i + 1),
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 160),
                transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                child: Icon(
                  filled ? Icons.star_rounded : Icons.star_outline_rounded,
                  key: ValueKey(filled),
                  color: filled ? AppColors.star : Theme.of(context).colorScheme.outline,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class StarRow extends StatelessWidget {
  const StarRow({super.key, required this.rating, this.size = 16});

  final double rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final icon = rating >= i + 1
            ? Icons.star_rounded
            : rating > i
                ? Icons.star_half_rounded
                : Icons.star_outline_rounded;
        return Icon(icon, size: size, color: AppColors.star);
      }),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.size = 40});

  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    const palette = [Color(0xFFF97316), Color(0xFF7C3AED), Color(0xFF0EA5E9), Color(0xFF16A34A), Color(0xFFDB2777)];
    final color = palette[name.codeUnits.fold<int>(0, (a, b) => a + b) % palette.length];
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.14), shape: BoxShape.circle),
      child: Text(
        Fmt.initials(name),
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: size * 0.38),
      ),
    );
  }
}

/// Width of [text] laid out on one line in [style] at the user's text size.
double textWidth(BuildContext context, String text, TextStyle style) {
  final painter = TextPainter(
    text: TextSpan(text: text, style: style),
    textDirection: Directionality.of(context),
    textScaler: MediaQuery.textScalerOf(context),
    maxLines: 1,
  )..layout();
  final width = painter.width;
  painter.dispose();
  return width;
}

/// Whether every word of [text] fits on a line [width] wide, so wrapping never splits a word.
bool wordsFit(BuildContext context, String text, TextStyle style, double width) =>
    text.split(' ').every((word) => textWidth(context, word, style) <= width);

/// An outlined secondary action beside a filled primary one (e.g. "Review" + "Get directions").
///
/// Keeps the [primaryFlex] split when both labels fit. On narrow screens or with large text the
/// secondary button shrinks to its label, then to an icon (with tooltip), and the primary falls
/// back to [primaryShortLabel] — so no label ever breaks mid-word.
class ActionButtonRow extends StatelessWidget {
  const ActionButtonRow({
    super.key,
    required this.secondaryIcon,
    required this.secondaryLabel,
    required this.onSecondary,
    required this.primaryLabel,
    this.primaryShortLabel,
    this.primaryIcon,
    required this.onPrimary,
    this.primaryFlex = 1,
    this.gap = 10,
    this.minHeight = 52,
  });

  final IconData secondaryIcon;
  final String secondaryLabel;
  final VoidCallback onSecondary;
  final String primaryLabel;
  final String? primaryShortLabel;
  final IconData? primaryIcon;
  final VoidCallback onPrimary;
  final int primaryFlex;
  final double gap;
  final double minHeight;

  // Mirrors the theme's button text; icon buttons add padding (16 + 24), a 20pt icon and an 8pt gap.
  static const _labelStyle = TextStyle(fontFamily: AppTheme.fontFamily, fontWeight: FontWeight.w700, fontSize: 15);
  static const _iconChrome = 70.0;
  static const _plainChrome = 50.0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final available = constraints.maxWidth - gap;
      final primaryChrome = primaryIcon == null ? _plainChrome : _iconChrome;
      final secondaryNeed = textWidth(context, secondaryLabel, _labelStyle) + _iconChrome;
      double primaryNeed(String label) => textWidth(context, label, _labelStyle) + primaryChrome;

      final secondaryShare = available / (1 + primaryFlex);
      if (secondaryNeed <= secondaryShare && primaryNeed(primaryLabel) <= available - secondaryShare) {
        return _row(secondary: Expanded(child: _secondary(withLabel: true)), primary: _primary(primaryLabel), flex: primaryFlex);
      }
      final shortLabel = primaryShortLabel ?? primaryLabel;
      for (final label in {primaryLabel, shortLabel}) {
        if (secondaryNeed + primaryNeed(label) <= available) {
          return _row(secondary: _secondary(withLabel: true), primary: _primary(label));
        }
      }
      final iconOnlyRoom = available - minHeight;
      return _row(
        secondary: SizedBox(width: minHeight, child: _secondary(withLabel: false)),
        primary: _primary(primaryNeed(primaryLabel) <= iconOnlyRoom ? primaryLabel : shortLabel),
      );
    });
  }

  Widget _row({required Widget secondary, required Widget primary, int flex = 1}) {
    return Row(children: [secondary, SizedBox(width: gap), Expanded(flex: flex, child: primary)]);
  }

  Widget _secondary({required bool withLabel}) {
    final style = OutlinedButton.styleFrom(minimumSize: Size(0, minHeight));
    if (!withLabel) {
      return Tooltip(
        message: secondaryLabel,
        child: OutlinedButton(
          style: style.copyWith(padding: const WidgetStatePropertyAll(EdgeInsets.zero)),
          onPressed: onSecondary,
          child: Icon(secondaryIcon, size: 20, semanticLabel: secondaryLabel),
        ),
      );
    }
    return OutlinedButton.icon(
      style: style,
      onPressed: onSecondary,
      icon: Icon(secondaryIcon, size: 20),
      label: Text(secondaryLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
    );
  }

  Widget _primary(String label) {
    final style = FilledButton.styleFrom(minimumSize: Size(0, minHeight));
    final text = Text(label, maxLines: 1, overflow: TextOverflow.ellipsis);
    if (primaryIcon == null) return FilledButton(style: style, onPressed: onPrimary, child: text);
    return FilledButton.icon(style: style, onPressed: onPrimary, icon: Icon(primaryIcon, size: 20), label: text);
  }
}

/// Rounded white card container used across screens.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.margin});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
