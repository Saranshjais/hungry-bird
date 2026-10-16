import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/app_content.dart';
import '../models/vendor.dart';
import '../state/city_provider.dart';
import '../widgets/common.dart';
import 'config.dart';

class Links {
  Links._();

  static Future<void> open(BuildContext context, String url, {bool inApp = false}) async {
    final uri = Uri.tryParse(url.startsWith('http') || url.contains(':') ? url : 'https://$url');
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: inApp ? LaunchMode.inAppBrowserView : LaunchMode.externalApplication);
    if (!ok && context.mounted) showSnack(context, 'Could not open the link', error: true);
  }

  /// Turn-by-turn directions in Google Maps (falls back to the browser).
  static Future<void> directions(BuildContext context, Vendor vendor) async {
    final destination = vendor.hasLocation
        ? '${vendor.lat},${vendor.lng}'
        : Uri.encodeComponent('${vendor.name} ${vendor.fullAddress}');
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$destination&travelmode=walking');
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) showSnack(context, 'Could not open maps', error: true);
  }

  static Future<void> call(BuildContext context, String phone) async {
    final cleaned = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final ok = await launchUrl(Uri(scheme: 'tel', path: cleaned));
    if (!ok && context.mounted) showSnack(context, 'Calling is not available on this device', error: true);
  }

  static Future<void> email(BuildContext context, String address, {String? subject}) async {
    final uri = Uri(scheme: 'mailto', path: address, query: subject == null ? null : 'subject=${Uri.encodeComponent(subject)}');
    final ok = await launchUrl(uri);
    if (!ok && context.mounted) showSnack(context, 'No email app found. Write to $address', error: true);
  }

  static String vendorWebUrl(Vendor vendor) => '${AppConfig.websiteUrl}/vendor/${vendor.id}';

  static Future<void> shareVendor(Vendor vendor) async {
    final buffer = StringBuffer('${vendor.name} on HungryBird');
    if (vendor.specialtyDish != null) buffer.write(' — try the ${vendor.specialtyDish}!');
    if (vendor.fullAddress.isNotEmpty) buffer.write('\n📍 ${vendor.fullAddress}');
    buffer.write('\n${vendorWebUrl(vendor)}');
    await SharePlus.instance.share(ShareParams(text: buffer.toString(), subject: vendor.name));
  }

  /// Follows a banner / notification deep link.
  static Future<void> follow(BuildContext context, LinkType type, String? value) async {
    if (value == null || value.isEmpty) return;
    switch (type) {
      case LinkType.vendor:
        final id = int.tryParse(value);
        if (id != null) context.push('/vendor/$id');
      case LinkType.city:
        await context.read<CityProvider>().selectSlug(value);
        if (context.mounted) context.go('/home');
      case LinkType.category:
        context.push(Uri(path: '/vendors', queryParameters: {'category': value}).toString());
      case LinkType.url:
        await open(context, value);
      case LinkType.none:
        break;
    }
  }
}
