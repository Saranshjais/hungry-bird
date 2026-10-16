// Responsive test harness: boots the real app (real router, providers and shell) against
// the fake backend in fixtures.dart, then re-lays out the open screen on every device in
// [deviceMatrix] at text scale 1.0 and 1.3, collecting:
//
//  * framework layout errors (RenderFlex overflows, unbounded constraints, …),
//  * text clipped by its box, cut without an ellipsis, or a word broken mid-word,
//  * text/icons drawn under the status bar / notch (at scroll offset 0),
//  * text drawn over other text or under a button (at scroll offset 0),
//  * text/icons that stay under the floating nav bar, the home indicator or the
//    keyboard even when scrolled to the end,
//  * controls stretched absurdly wide on tablets.
//
// Every scenario records the full matrix before asserting, so one run gives a complete
// picture. Real fonts are loaded (PlusJakartaSans + MaterialIcons); Devanagari and emoji fall
// back to the test font's boxes, which are wider than real glyphs (a conservative stress).
// Options (all off by default):
//   --dart-define=RESPONSIVE_RESULTS_DIR=<dir>  per-scenario JSON results
//   --dart-define=RESPONSIVE_SHOTS_DIR=<dir>    PNG screenshots (representative devices)
//   --dart-define=RESPONSIVE_ALL_SHOTS=true     screenshot every device
//   --dart-define=RESPONSIVE_QUICK=true         only the representative devices (~3x faster)
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hungry_bird_app/app.dart';
import 'package:hungry_bird_app/core/api_client.dart';
import 'package:hungry_bird_app/core/router.dart';
import 'package:hungry_bird_app/services/hungry_bird_api.dart';
import 'package:hungry_bird_app/services/local_store.dart';
import 'package:hungry_bird_app/widgets/vendor_cards.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fixtures.dart';

const _resultsDir = String.fromEnvironment('RESPONSIVE_RESULTS_DIR');
const _shotsDir = String.fromEnvironment('RESPONSIVE_SHOTS_DIR');
const _allShots = bool.fromEnvironment('RESPONSIVE_ALL_SHOTS');
const _quick = bool.fromEnvironment('RESPONSIVE_QUICK');

/// Representative devices: the ones screenshotted by default, and the only ones audited with
/// RESPONSIVE_QUICK.
const _shotDevices = {
  'iphone_se3',
  'iphone_16',
  'iphone_17_pro_max',
  'ipad_mini',
  'ipad_pro13_land',
  'ipad_split_half',
  'ipad_slide_over',
  'galaxy_s24_3btn',
  'galaxy_a55_3btn',
  'galaxy_fold1_cover',
  'galaxy_zfold6_folded',
  'galaxy_zfold6_open',
  'galaxy_zfold6_open_land',
  'galaxy_tab_s9',
  'galaxy_tab_s9_land',
};

/// Simulated on-screen keyboard height (logical px).
const double keyboardHeight = 300;

enum DeviceGroup { iphone, samsung, foldable, tablet }

class DeviceSpec {
  const DeviceSpec(this.id, this.group, this.width, this.height, this.dpr,
      {required this.top, required this.bottom, this.ios = false, this.scales = const [1.0, 1.3]});

  final String id;
  final DeviceGroup group;
  final double width;
  final double height;
  final double dpr;

  /// Safe-area insets (status bar / notch, home indicator / navigation bar).
  final double top;
  final double bottom;
  final bool ios;
  final List<double> scales;

  Size get size => Size(width, height);
}

const _tabletScales = [1.0];
const _both = [1.0, 1.3];

/// Logical sizes, portrait unless suffixed `_land`. Samsung "3btn" = 3-button navigation (48dp bar).
/// iOS devices come first so the target platform flips only once per scenario.
const deviceMatrix = <DeviceSpec>[
  // iPhone
  DeviceSpec('iphone_se3', DeviceGroup.iphone, 375, 667, 2, top: 20, bottom: 0, ios: true),
  DeviceSpec('iphone_13_mini', DeviceGroup.iphone, 375, 812, 3, top: 50, bottom: 34, ios: true),
  DeviceSpec('iphone_11', DeviceGroup.iphone, 414, 896, 2, top: 48, bottom: 34, ios: true),
  DeviceSpec('iphone_14', DeviceGroup.iphone, 390, 844, 3, top: 47, bottom: 34, ios: true),
  DeviceSpec('iphone_16', DeviceGroup.iphone, 393, 852, 3, top: 59, bottom: 34, ios: true),
  DeviceSpec('iphone_17_pro', DeviceGroup.iphone, 402, 874, 3, top: 62, bottom: 34, ios: true),
  DeviceSpec('iphone_air', DeviceGroup.iphone, 420, 912, 3, top: 62, bottom: 34, ios: true),
  DeviceSpec('iphone_14_plus', DeviceGroup.iphone, 428, 926, 3, top: 47, bottom: 34, ios: true),
  DeviceSpec('iphone_16_plus', DeviceGroup.iphone, 430, 932, 3, top: 59, bottom: 34, ios: true),
  DeviceSpec('iphone_17_pro_max', DeviceGroup.iphone, 440, 956, 3, top: 62, bottom: 34, ios: true),
  // iPad (iOS ignores the portrait lock with multitasking)
  DeviceSpec('ipad_mini', DeviceGroup.tablet, 744, 1133, 2, top: 24, bottom: 20, ios: true, scales: _tabletScales),
  DeviceSpec('ipad_air', DeviceGroup.tablet, 820, 1180, 2, top: 24, bottom: 20, ios: true, scales: _tabletScales),
  DeviceSpec('ipad_air_land', DeviceGroup.tablet, 1180, 820, 2, top: 24, bottom: 20, ios: true, scales: _tabletScales),
  DeviceSpec('ipad_pro13', DeviceGroup.tablet, 1024, 1366, 2, top: 24, bottom: 20, ios: true, scales: _tabletScales),
  DeviceSpec('ipad_pro13_land', DeviceGroup.tablet, 1366, 1024, 2, top: 24, bottom: 20, ios: true, scales: _tabletScales),
  DeviceSpec('ipad_split_half', DeviceGroup.tablet, 507, 820, 2, top: 24, bottom: 20, ios: true, scales: _both),
  DeviceSpec('ipad_slide_over', DeviceGroup.tablet, 320, 1180, 2, top: 24, bottom: 20, ios: true, scales: _both),
  // Samsung phones
  DeviceSpec('galaxy_s9_3btn', DeviceGroup.samsung, 360, 740, 3, top: 24, bottom: 48),
  DeviceSpec('galaxy_s21', DeviceGroup.samsung, 360, 800, 3, top: 32, bottom: 20),
  DeviceSpec('galaxy_s24_3btn', DeviceGroup.samsung, 360, 780, 3, top: 32, bottom: 48),
  DeviceSpec('galaxy_s24', DeviceGroup.samsung, 360, 780, 3, top: 32, bottom: 20),
  DeviceSpec('galaxy_s24_ultra', DeviceGroup.samsung, 384, 832, 3.75, top: 32, bottom: 20),
  DeviceSpec('galaxy_a55_3btn', DeviceGroup.samsung, 412, 915, 2.625, top: 32, bottom: 48),
  // Foldables
  DeviceSpec('galaxy_fold1_cover', DeviceGroup.foldable, 280, 653, 3, top: 24, bottom: 48),
  DeviceSpec('galaxy_zfold6_folded', DeviceGroup.foldable, 344, 882, 2.625, top: 28, bottom: 20),
  DeviceSpec('galaxy_zflip6', DeviceGroup.foldable, 412, 1004, 2.625, top: 32, bottom: 20),
  DeviceSpec('galaxy_zfold6_open', DeviceGroup.foldable, 690, 830, 2.625, top: 24, bottom: 48),
  DeviceSpec('galaxy_zfold6_open_land', DeviceGroup.foldable, 830, 690, 2.625, top: 24, bottom: 48),
  // Android tablet (Android 16 ignores the lock on sw >= 600dp)
  DeviceSpec('galaxy_tab_s9', DeviceGroup.tablet, 800, 1280, 2, top: 24, bottom: 48, scales: _tabletScales),
  DeviceSpec('galaxy_tab_s9_land', DeviceGroup.tablet, 1280, 800, 2, top: 24, bottom: 48, scales: _both),
];

String scaleKey(double scale) => scale.toStringAsFixed(1);

/// One screen state to audit across the matrix.
class Scenario {
  const Scenario(
    this.name, {
    this.mode = FixtureMode.stress,
    this.loggedIn = false,
    this.onboarded = true,
    this.located = false,
    this.keyboard = false,
    this.modal = false,
    this.open,
  });

  final String name;
  final FixtureMode mode;
  final bool loggedIn;
  final bool onboarded;
  final bool located;

  /// Simulates an open software keyboard (viewInsets.bottom = [keyboardHeight]).
  final bool keyboard;

  /// A sheet/dialog is on top: only its scrollables are scrolled.
  final bool modal;

  /// Navigates from the booted home screen to the state under test.
  final Future<void> Function(WidgetTester tester)? open;
}

// ---------------------------------------------------------------- setup

Future<void> loadAppFonts() async {
  final manifest = jsonDecode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final family in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(family['family'] as String);
    for (final font in (family['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

const _assetImages = [
  'assets/images/banner_1.jpg',
  'assets/images/banner_2.jpg',
  'assets/images/banner_3.jpg',
  'assets/images/city_delhi.jpg',
  'assets/images/city_jaipur.jpg',
  'assets/images/city_mumbai.jpg',
  'assets/images/logo.png',
  'assets/images/logo_mark.png',
  'assets/images/logo_mark_white.png',
  'assets/images/onboarding_1.jpg',
  'assets/images/onboarding_2.jpg',
  'assets/images/onboarding_3.jpg',
  'assets/images/placeholder.jpg',
];

/// Decodes bundled images for real so intrinsic sizes (e.g. a logo with only a width) are right.
Future<void> _precacheAssets(WidgetTester tester) async {
  await tester.runAsync(() => Future.wait(_assetImages.map((path) {
        final completer = Completer<void>();
        final stream = AssetImage(path).resolve(ImageConfiguration.empty);
        late final ImageStreamListener listener;
        void done() {
          stream.removeListener(listener);
          if (!completer.isCompleted) completer.complete();
        }

        listener = ImageStreamListener((_, __) => done(), onError: (_, __) => done());
        stream.addListener(listener);
        return completer.future;
      })));
}

void _mockPlatform(WidgetTester tester, Scenario s) {
  final prefs = <String, Object>{
    'pref_onboarding_done': s.onboarded,
    if (s.mode != FixtureMode.empty) ...{
      'pref_city': longCitySlug,
      'pref_recent_searches': [
        'Pyaz kachori near Hawa Mahal with extra chutney',
        'घेवर',
        'Lassi',
        'Best late-night chai tapri open after midnight',
      ],
      if (!s.loggedIn) 'guest_favorites': jsonEncode(stressVendors().take(3).toList()),
    },
  };
  SharedPreferences.setMockInitialValues(prefs);
  FlutterSecureStorage.setMockInitialValues(s.loggedIn ? {'auth_token': 'test-token'} : {});
  PackageInfo.setMockInitialValues(
    appName: 'HungryBird',
    packageName: 'com.hungrybird.hungry_bird_app',
    version: '1.0.0',
    buildNumber: '1',
    buildSignature: '',
  );

  final messenger = tester.binding.defaultBinaryMessenger;
  // flutter_map's tile cache asks for a cache directory.
  const pathProvider = MethodChannel('plugins.flutter.io/path_provider');
  final cacheDir = Directory.systemTemp.createTempSync('hb_responsive_').path;
  messenger.setMockMethodCallHandler(pathProvider, (_) async => cacheDir);
  addTearDown(() => messenger.setMockMethodCallHandler(pathProvider, null));
  for (final name in ['flutter.baseflow.com/geolocator', 'flutter.baseflow.com/geolocator_android']) {
    final channel = MethodChannel(name);
    messenger.setMockMethodCallHandler(channel, (call) async {
      switch (call.method) {
        case 'checkPermission':
        case 'requestPermission':
          return s.located ? 2 : 0;
        case 'isLocationServiceEnabled':
          return true;
        case 'getCurrentPosition':
        case 'getLastKnownPosition':
          return {'latitude': 26.9124, 'longitude': 75.7873, 'timestamp': 0, 'accuracy': 5.0};
      }
      return null;
    });
    addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
  }
}

/// Resizes the test view to [d]; returns true when the target platform flipped (needs a rebuild).
bool _applyDevice(WidgetTester tester, DeviceSpec d, double scale, {required bool keyboard}) {
  final view = tester.view;
  view.devicePixelRatio = d.dpr;
  view.physicalSize = d.size * d.dpr;
  view.viewPadding = FakeViewPadding(top: d.top * d.dpr, bottom: d.bottom * d.dpr);
  // With the keyboard up the bottom inset is consumed by the keyboard.
  view.padding = FakeViewPadding(top: d.top * d.dpr, bottom: keyboard ? 0 : d.bottom * d.dpr);
  view.viewInsets = keyboard ? FakeViewPadding(bottom: keyboardHeight * d.dpr) : FakeViewPadding.zero;
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  final platform = d.ios ? TargetPlatform.iOS : TargetPlatform.android;
  final changed = debugDefaultTargetPlatformOverride != platform;
  debugDefaultTargetPlatformOverride = platform;
  return changed;
}

/// Like a hot reload: rebuilds everything (picks up the new target platform's theme).
Future<void> _rebuildAll(WidgetTester tester) async {
  final binding = tester.binding;
  binding.buildOwner!.reassemble(binding.rootElement!);
  for (final view in binding.renderViews) {
    view.reassemble();
  }
  await tester.pump();
}

Future<void> settle(WidgetTester tester, [Duration total = const Duration(seconds: 1)]) async {
  const step = Duration(milliseconds: 100);
  for (var t = Duration.zero; t < total; t += step) {
    await tester.pump(step);
  }
}

GoRouter get appRouter => GoRouter.of(rootNavigatorKey.currentContext!);

Future<void> goTo(WidgetTester tester, String location) async {
  appRouter.go(location);
  await settle(tester);
}

Future<void> pushTo(WidgetTester tester, String location) async {
  appRouter.push(location);
  await settle(tester);
}

/// Scrolls the main vertical list until [finder] is built and on screen.
Future<void> reveal(WidgetTester tester, Finder finder) async {
  final list = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first;
  for (var i = 0; i < 60 && finder.evaluate().isEmpty; i++) {
    await tester.drag(list, const Offset(0, -250));
    await tester.pump(const Duration(milliseconds: 50));
  }
  await tester.ensureVisible(finder.first);
  // Wait out scroll animations (e.g. the caret-reveal scroll after typing): a Scrollable
  // ignores taps while it animates.
  final position = Scrollable.maybeOf(tester.element(finder.first))?.position;
  for (var i = 0; i < 30 && (i < 3 || (position?.isScrollingNotifier.value ?? false)); i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await reveal(tester, finder);
  await tester.tap(finder.first, warnIfMissed: false);
  await settle(tester, const Duration(milliseconds: 800));
}

Future<void> enterVisible(WidgetTester tester, Finder finder, String text) async {
  await reveal(tester, finder);
  await tester.enterText(finder.first, text);
  await tester.pump();
}

// ---------------------------------------------------------------- checks

/// `file:///d:/…/flutter/lib/` (decoded, lower-case) — creation locations under it are ours.
final _projectLib = Uri.decodeFull(Uri.directory(Directory.current.path).resolve('lib/').toString()).toLowerCase();

String? _locationOfWidget(Widget widget) {
  try {
    final json = widget
        .toDiagnosticsNode()
        .toJsonMap(InspectorSerializationDelegate(service: WidgetInspectorService.instance));
    final loc = json['creationLocation'];
    if (loc is! Map) return null;
    final file = Uri.decodeFull('${loc['file']}');
    if (!file.toLowerCase().startsWith(_projectLib)) return null;
    return 'lib/${file.substring(_projectLib.length)}:${loc['line']}';
  } catch (_) {
    return null;
  }
}

/// Nearest widget created in this project's lib/, walking up from [element].
String? projectLocation(Element element) {
  String? result;
  bool visit(Element e) {
    result = _locationOfWidget(e.widget);
    return result == null;
  }

  if (visit(element)) element.visitAncestorElements(visit);
  return result;
}

String? _locationFromRender(RenderObject object) {
  final creator = object.debugCreator;
  return creator is DebugCreator ? projectLocation(creator.element) : null;
}

String _label(RenderParagraph p) {
  final style = p.text.style;
  final family = style?.fontFamily ?? '';
  if (family.contains('MaterialIcons')) return '[icon]';
  var text = p.text.toPlainText().replaceAll('\n', ' ');
  if (text.length > 48) text = '${text.substring(0, 45)}…';
  return '"$text"';
}

String _at(RenderObject o) {
  final loc = _locationFromRender(o);
  return loc == null ? '' : ' @ $loc';
}

final _fileAndLine = RegExp(r'file:///\S+?\.dart:\d+');

String describeError(FlutterErrorDetails details) {
  final message = details.exceptionAsString().trim().split('\n').first;
  String? where;
  for (final match in _fileAndLine.allMatches(details.toString())) {
    final decoded = Uri.decodeFull(match.group(0)!);
    if (decoded.toLowerCase().startsWith(_projectLib)) {
      where = 'lib/${decoded.substring(_projectLib.length)}';
      break;
    }
  }
  final kind = message.contains('overflowed') ? 'overflow' : 'layout-error';
  return '[$kind] $message${where == null ? '' : ' @ $where'}';
}

/// Overflowing flex/constraint boxes currently on stage. Unlike the framework's one-shot
/// paint-time report this sees the same RenderFlex overflow again on every device.
void _checkOverflow(Set<String> issues, Finder? scope) {
  final finder = _within(scope, find.byWidgetPredicate((w) => w is Flex || w is UnconstrainedBox || w is ConstraintsTransformBox));
  for (final element in finder.evaluate()) {
    final box = element.renderObject;
    if (box is! RenderBox || !box.hasSize || !box.toStringShort().contains('OVERFLOWING')) continue;
    final where = projectLocation(element);
    final at = where == null ? '' : ' @ $where';
    if (box is RenderFlex) {
      final horizontal = box.direction == Axis.horizontal;
      var used = 0.0;
      var count = 0;
      box.visitChildren((child) {
        final c = child as RenderBox;
        used += horizontal ? c.size.width : c.size.height;
        count++;
      });
      used += box.spacing * (count > 1 ? count - 1 : 0);
      final overflow = used - (horizontal ? box.size.width : box.size.height);
      issues.add('[overflow] A RenderFlex overflowed by ${overflow.toStringAsFixed(1)} pixels on the '
          '${horizontal ? 'right' : 'bottom'}.$at');
    } else {
      issues.add('[overflow] ${box.runtimeType} is overflowing.$at');
    }
  }
}

final _complexScript = RegExp(r'[ऀ-ॿ\uD800-\uDFFF]');
final _wordChar = RegExp(r"[A-Za-z0-9'’]");
// URLs, handles, e-mails and long proper nouns (13+ letters, e.g. "Thiruvananthapuram").
final _unbreakable = RegExp(r'@|://|www\.|[^\s]{13,}');

/// Text problems in every on-stage paragraph.
void _checkText(Set<String> issues, Set<RenderParagraph> seen, Finder? scope) {
  for (final element in _within(scope, find.byType(RichText)).evaluate()) {
    final p = element.renderObject;
    if (p is! RenderParagraph || !p.hasSize || p.debugNeedsLayout || !seen.add(p)) continue;
    final label = _label(p);
    if (label == '[icon]') continue;
    final textSize = p.textSize;
    if (textSize.height > p.size.height + 1 || textSize.width > p.size.width + 1) {
      issues.add('[text-clipped] $label needs ${textSize.width.toStringAsFixed(0)}×${textSize.height.toStringAsFixed(0)} '
          'but box is ${p.size.width.toStringAsFixed(0)}×${p.size.height.toStringAsFixed(0)}${_at(p)}');
    }
    if (p.didExceedMaxLines && (p.overflow == TextOverflow.clip || p.overflow == TextOverflow.visible)) {
      issues.add('[text-cut] $label cut after ${p.maxLines} line(s) without ellipsis${_at(p)}');
    }
    final plain = p.text.toPlainText();
    // Devanagari/emoji render with the test fallback font (wider than real fonts), and a
    // single URL/handle/very long token has to break somewhere on a phone.
    if (plain.trim().isEmpty || _complexScript.hasMatch(plain) || p.maxLines == 1 || _unbreakable.hasMatch(plain)) {
      continue;
    }
    // A wrapped line that starts between two letters means the line before it broke mid-word.
    final firstBoxPerLine = <int, TextBox>{};
    for (final box in p.getBoxesForSelection(TextSelection(baseOffset: 0, extentOffset: plain.length))) {
      final current = firstBoxPerLine[box.top.round()];
      if (current == null || box.left < current.left) firstBoxPerLine[box.top.round()] = box;
    }
    final tops = firstBoxPerLine.keys.toList()..sort();
    for (final top in tops.skip(1)) {
      final box = firstBoxPerLine[top]!;
      final start = p.getPositionForOffset(Offset(box.left + 0.5, (box.top + box.bottom) / 2)).offset;
      if (start <= 0 || start >= plain.length) continue;
      if (_wordChar.hasMatch(plain[start - 1]) && _wordChar.hasMatch(plain[start])) {
        final word = RegExp(r"[A-Za-z0-9'’]*$").firstMatch(plain.substring(0, start))![0]! +
            RegExp(r"^[A-Za-z0-9'’]*").firstMatch(plain.substring(start))![0]!;
        issues.add('[word-broken] $label breaks "$word" mid-word${_at(p)}');
        break;
      }
    }
  }
}

Iterable<Offset> _grid(Rect rect, {double dx = 12, double dy = 6}) sync* {
  if (rect.width <= 2 || rect.height <= 1) return;
  for (var y = rect.top + 1; y < rect.bottom; y += dy) {
    for (var x = rect.left + 2; x < rect.right; x += dx) {
      yield Offset(x, y);
    }
  }
}

/// Text/icons hit at [points] (topmost content only, as a finger would reach it).
void _checkZone(WidgetTester tester, Iterable<Offset> points, String kind, Set<String> issues, {RenderBox? within}) {
  final reported = <RenderParagraph>{};
  for (final point in points) {
    final HitTestResult result;
    if (within != null) {
      final r = BoxHitTestResult();
      within.hitTest(r, position: within.globalToLocal(point));
      result = r;
    } else {
      result = tester.hitTestOnBinding(point);
    }
    for (final entry in result.path) {
      final target = entry.target;
      if (target is RenderParagraph && !_onMapCanvas(target) && reported.add(target)) {
        issues.add('[$kind] ${_label(target)}${_at(target)}');
      }
    }
  }
}

/// Map markers may sit anywhere on the map canvas, including under bottom chrome.
bool _onMapCanvas(RenderObject object) {
  final creator = object.debugCreator;
  if (creator is! DebugCreator) return false;
  var found = false;
  creator.element.visitAncestorElements((e) {
    found = e.widget.runtimeType.toString() == 'MarkerLayer';
    return !found;
  });
  return found;
}

final _navBar = find.byWidgetPredicate((w) => w.runtimeType.toString() == '_FloatingNavBar');

Rect? _navPill(WidgetTester tester) {
  final bar = _navBar.evaluate();
  if (bar.isEmpty) return null;
  final pill = find.descendant(of: _navBar, matching: find.byType(DecoratedBox)).evaluate();
  return pill.isEmpty ? null : tester.getRect(find.byElementPredicate((e) => e == pill.first));
}

RenderBox? _shellBody(WidgetTester tester) {
  final body = find.byType(StatefulNavigationShell).evaluate();
  return body.isEmpty ? null : body.first.renderObject as RenderBox?;
}

bool _invisible(RenderObject object) {
  for (RenderObject? o = object; o != null; o = o.parent) {
    if (o is RenderOpacity && o.opacity == 0) return true;
    if (o is RenderAnimatedOpacity && o.opacity.value == 0) return true;
  }
  return false;
}

/// Whether [box] is fully visible inside every scroll viewport / clip above it.
bool _unclipped(RenderBox box, Rect rect) {
  for (RenderObject? o = box.parent; o != null; o = o.parent) {
    if (o is RenderAbstractViewport || o is RenderClipRect || o is RenderClipRRect) {
      final clip = _globalRect(o as RenderBox).inflate(0.5);
      if (!clip.contains(rect.topLeft) || !clip.contains(rect.bottomRight - const Offset(0.1, 0.1))) return false;
    }
  }
  return true;
}

Rect _globalRect(RenderBox box) => MatrixUtils.transformRect(box.getTransformTo(null), Offset.zero & box.size);

bool _isAncestor(Element ancestor, Element element) {
  var found = false;
  element.visitAncestorElements((e) {
    found = identical(e, ancestor);
    return !found;
  });
  return found;
}

/// Text drawn on top of other text or under a button (e.g. a fixed overlay covering content).
/// Only meaningful before scrolling, when nothing legitimately slides under pinned headers.
void _checkOverlap(Set<String> issues, Finder? scope, Size screen) {
  final onScreen = Offset.zero & screen;
  final navBar = _navBar.evaluate().firstOrNull;
  final fabs = find.byType(FloatingActionButton).evaluate().toList();
  final texts = <(RenderParagraph, Rect, Element)>[];
  for (final e in _within(scope, find.byType(RichText)).evaluate()) {
    final p = e.renderObject;
    if (p is! RenderParagraph || !p.attached || !p.hasSize || _label(p) == '[icon]') continue;
    if (p.text.toPlainText().trim().isEmpty || _invisible(p)) continue;
    if (navBar != null && _isAncestor(navBar, e)) continue;
    // Floating action buttons legitimately float over list content.
    if (fabs.any((fab) => _isAncestor(fab, e))) continue;
    final rect = _globalRect(p);
    if (rect.isEmpty || !onScreen.contains(rect.topLeft) || !onScreen.contains(rect.bottomRight - const Offset(0.1, 0.1))) {
      continue;
    }
    if (!_unclipped(p, rect)) continue;
    texts.add((p, rect, e));
  }
  bool overlaps(Rect a, Rect b) {
    final i = a.intersect(b);
    return i.width > 2 && i.height > 2;
  }

  for (var i = 0; i < texts.length; i++) {
    for (var j = i + 1; j < texts.length; j++) {
      if (overlaps(texts[i].$2, texts[j].$2)) {
        issues.add('[overlap] ${_label(texts[i].$1)} and ${_label(texts[j].$1)} overlap${_at(texts[i].$1)}');
      }
    }
  }
  for (final b in _within(scope, find.byWidgetPredicate((w) => w is ButtonStyleButton)).evaluate()) {
    final box = b.renderObject;
    if (box is! RenderBox || !box.attached || !box.hasSize || _invisible(box)) continue;
    if (navBar != null && _isAncestor(navBar, b)) continue;
    final rect = _globalRect(box);
    if (!_unclipped(box, rect)) continue;
    for (final (p, textRect, element) in texts) {
      if (overlaps(rect, textRect) && !_isAncestor(b, element)) {
        issues.add('[overlap] ${_label(p)} is covered by a ${b.widget.runtimeType}${_at(p)}');
      }
    }
  }
}

void _checkStretch(WidgetTester tester, Set<String> issues, Finder? scope) {
  void check(Finder finder, double max, String what) {
    for (final e in _within(scope, finder).evaluate()) {
      final box = e.renderObject;
      if (box is! RenderBox || !box.hasSize || box.size.width <= max) continue;
      final where = projectLocation(e);
      issues.add('[stretched] $what is ${box.size.width.toStringAsFixed(0)} wide (> $max)${where == null ? '' : ' @ $where'}');
    }
  }

  check(find.byWidgetPredicate((w) => w is FilledButton || w is OutlinedButton), 720, 'button');
  check(find.byType(TextFormField), 720, 'form field');
  check(find.byType(VendorTile), 760, 'vendor tile');
  final pill = scope == null ? _navPill(tester) : null;
  if (pill != null && pill.width > 600) {
    issues.add('[stretched] floating nav bar is ${pill.width.toStringAsFixed(0)} wide (> 600)');
  }
}

final _modalContainer = find.byWidgetPredicate((w) => w is BottomSheet || w is Dialog);

Finder _within(Finder? scope, Finder finder) => scope == null ? finder : find.descendant(of: scope, matching: finder);

List<ScrollableState> _verticalScrollables(WidgetTester tester, {required bool modal}) {
  return _within(modal ? _modalContainer : null, find.byType(Scrollable))
      .evaluate()
      .map((e) => (e as StatefulElement).state as ScrollableState)
      .where((s) => s.position.axis == Axis.vertical && s.position.hasContentDimensions)
      .toList();
}

Future<void> _capture(WidgetTester tester, String path, DeviceSpec device) async {
  final view = tester.binding.renderViews.first;
  final layer = view.debugLayer! as OffsetLayer;
  // 1x logical pixels: enough to review layout without gigabytes of PNGs.
  await tester.runAsync(() async {
    final image = await layer.toImage(view.paintBounds, pixelRatio: 1 / device.dpr);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    File(path)
      ..createSync(recursive: true)
      ..writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}

/// Lays the current screen out on one device/text scale and returns everything that broke.
Future<Set<String>> _auditConfig(
  WidgetTester tester,
  Scenario s,
  DeviceSpec d,
  double scale,
  Set<String> errors,
) async {
  final issues = <String>{};
  if (_applyDevice(tester, d, scale, keyboard: s.keyboard)) await _rebuildAll(tester);
  try {
    await _auditLaidOut(tester, s, d, scale, issues);
  } on TypeError catch (e) {
    // Finders walk on-stage slivers; one that never got laid out (layout threw) breaks the walk.
    issues.add('[layout-error] screen was not laid out, audit incomplete ($e)');
  } on FlutterError catch (e) {
    // Same, when hit-testing a render object whose layout threw.
    issues.add('[layout-error] screen was not laid out, audit incomplete (${const LineSplitter().convert(e.message).first})');
  }
  // With a sheet/dialog open, overflow reports from the page underneath belong to its own scenario
  // (overflows inside the sheet are found by the tree scan).
  issues.addAll(s.modal ? errors.where((e) => !e.startsWith('[overflow]')) : errors);
  errors.clear();
  return issues;
}

Future<void> _auditLaidOut(WidgetTester tester, Scenario s, DeviceSpec d, double scale, Set<String> issues) async {
  // Re-lay out for the new metrics where the user left off (as when the window resizes or the
  // font size changes), then go back to the top. A long list can re-anchor its offset while
  // relaying out, so check again after each frame.
  await tester.pump();
  for (var attempt = 0; attempt < 3; attempt++) {
    final scrolled = _verticalScrollables(tester, modal: s.modal)
        .where((sc) => sc.position.pixels != sc.position.minScrollExtent)
        .toList();
    if (scrolled.isEmpty) break;
    for (final sc in scrolled) {
      sc.position.jumpTo(sc.position.minScrollExtent);
    }
    await tester.pump();
  }
  // Let implicit animations reacting to the new metrics finish (e.g. a dialog's keyboard padding).
  await tester.pump(const Duration(milliseconds: 350));

  final seen = <RenderParagraph>{};
  // With a sheet/dialog open only its content is audited (the page below has its own scenario).
  final scope = s.modal ? _modalContainer : null;
  void scan() {
    _checkOverflow(issues, scope);
    _checkText(issues, seen, scope);
    _checkStretch(tester, issues, scope);
  }

  scan();
  _checkOverlap(issues, scope, d.size);
  if (d.top > 0) {
    _checkZone(tester, _grid(Rect.fromLTWH(0, 0, d.width, d.top)), 'under-status-bar', issues);
  }
  if (_shotsDir.isNotEmpty && (_allShots || _shotDevices.contains(d.id))) {
    await _capture(tester, '$_shotsDir/${s.name}/${d.id}${scale == 1.0 ? '' : '_ts${scaleKey(scale)}'}.png', d);
  }

  // Scroll every vertical scrollable to its end so lazily built content is laid out too.
  for (final sc in _verticalScrollables(tester, modal: s.modal)) {
    if (!sc.mounted) continue;
    final position = sc.position;
    final step = position.viewportDimension * 0.9;
    for (var guard = 0; guard < 40 && position.pixels < position.maxScrollExtent; guard++) {
      position.jumpTo((position.pixels + step).clamp(position.minScrollExtent, position.maxScrollExtent));
      await tester.pump();
      if (!sc.mounted) break;
      scan();
    }
  }

  // At the end of every list nothing should remain hidden under bottom chrome. Inside the
  // tab shell only the tab body is probed (the nav bar itself legitimately sits there).
  final body = s.modal ? null : _shellBody(tester);
  final pill = body == null ? null : _navPill(tester);
  if (pill != null) {
    _checkZone(tester, _grid(pill.deflate(2)), 'under-nav-bar', issues, within: body);
  }
  final bottomZone = s.keyboard ? keyboardHeight : d.bottom;
  if (bottomZone > 0) {
    final zone = Rect.fromLTWH(0, d.height - bottomZone, d.width, bottomZone);
    _checkZone(tester, _grid(zone), s.keyboard ? 'under-keyboard' : 'under-home-indicator', issues, within: body);
  }
}

/// Registers a widget test that audits [s] across the full device matrix.
void responsiveScenario(Scenario s, {List<DeviceSpec>? devices}) {
  final matrix = devices ?? (_quick ? deviceMatrix.where((d) => _shotDevices.contains(d.id)).toList() : deviceMatrix);
  testWidgets('responsive: ${s.name}', (tester) async {
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

    final errors = <String>{};
    final originalOnError = FlutterError.onError;
    FlutterError.onError = (details) {
      // Uncaught test exceptions must reach the framework's handler.
      if (details.library == 'Flutter test framework') return originalOnError?.call(details);
      errors.add(describeError(details));
    };
    final results = <String, Map<String, List<String>>>{};
    try {
      appReady.value = false;
      _mockPlatform(tester, s);
      await _precacheAssets(tester);
      final first = matrix.first;
      _applyDevice(tester, first, first.scales.first, keyboard: s.keyboard);

      final store = await LocalStore.create();
      final api = HungryBirdApi(ApiClient(client: fakeBackend(s.mode), baseUrl: 'https://api.test'));
      await tester.pumpWidget(HungryBirdApp(store: store, api: api));
      await settle(tester, const Duration(seconds: 2));
      try {
        await s.open?.call(tester);
      } catch (e) {
        // The screen could not even be reached (e.g. the page before it failed to lay out).
        final reason = const LineSplitter().convert('$e').first;
        results['_setup'] = {'-': ['[setup-error] could not open the screen: $reason', ...errors]};
        rethrow;
      }
      await settle(tester, const Duration(milliseconds: 500));
      if (errors.isNotEmpty) {
        results['_setup'] = {'-': errors.toList()..sort()};
        errors.clear();
      }

      for (final d in matrix) {
        for (final scale in d.scales) {
          final issues = await _auditConfig(tester, s, d, scale, errors);
          (results[d.id] ??= {})[scaleKey(scale)] = issues.toList()..sort();
        }
      }
    } finally {
      FlutterError.onError = originalOnError;
      debugDefaultTargetPlatformOverride = null;
      if (_resultsDir.isNotEmpty) {
        File('$_resultsDir/${s.name}.json')
          ..createSync(recursive: true)
          ..writeAsStringSync(const JsonEncoder.withIndent('  ').convert(results));
      }
    }

    final failures = <String>[
      for (final MapEntry(key: device, value: byScale) in results.entries)
        for (final MapEntry(key: scale, value: issues) in byScale.entries)
          for (final issue in issues) '$device @ $scale: $issue',
    ];
    expect(failures, isEmpty, reason: '${s.name}: ${failures.length} responsive issue(s)\n${failures.take(40).join('\n')}');
  });
}
