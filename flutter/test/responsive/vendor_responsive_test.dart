// Vendor detail (+ its sheets), "see all" lists and notifications.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hungry_bird_app/screens/vendor/vendor_detail_screen.dart';
import 'package:hungry_bird_app/screens/vendor/vendor_sheets.dart';

import 'fixtures.dart';
import 'harness.dart';

Future<void> _openReportSheet(WidgetTester tester) async {
  await pushTo(tester, '/vendor/101');
  showReportSheet(
    tester.element(find.byType(VendorDetailScreen)),
    targetType: 'vendor',
    targetId: 101,
    title: 'Report this listing',
  );
  await settle(tester);
}

Future<void> _openReviewSheet(WidgetTester tester) async {
  await pushTo(tester, '/vendor/101');
  // The bottom-bar review button (it may be icon-only on narrow screens).
  await tester.tap(find.byIcon(Icons.rate_review_outlined));
  await settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  responsiveScenario(Scenario('vendor_detail', open: (tester) => pushTo(tester, '/vendor/101')));
  responsiveScenario(Scenario('vendor_detail_minimal', open: (tester) => pushTo(tester, '/vendor/103')));
  responsiveScenario(const Scenario('review_sheet', modal: true, open: _openReviewSheet));
  responsiveScenario(const Scenario('review_sheet_keyboard', modal: true, keyboard: true, open: _openReviewSheet));
  responsiveScenario(const Scenario('report_sheet', modal: true, open: _openReportSheet));
  responsiveScenario(const Scenario('report_sheet_keyboard', modal: true, keyboard: true, open: _openReportSheet));
  responsiveScenario(Scenario('vendor_list', open: (tester) => pushTo(tester, '/vendors?category=kachori-samosa')));
  responsiveScenario(Scenario('notifications', open: (tester) => pushTo(tester, '/notifications')));
  responsiveScenario(
      Scenario('notifications_empty', mode: FixtureMode.empty, open: (tester) => pushTo(tester, '/notifications')));
}
