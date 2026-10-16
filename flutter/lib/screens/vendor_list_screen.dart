import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/hungry_bird_api.dart';
import '../state/app_config_provider.dart';
import '../widgets/vendor_browser.dart';

/// "See all" lists (category, hidden gems, most loved, near you).
class VendorListScreen extends StatelessWidget {
  const VendorListScreen({super.key, required this.title, required this.filters});

  factory VendorListScreen.fromQuery(Map<String, String> q) {
    final sort = VendorSort.values.firstWhere((s) => s.name == q['sort'], orElse: () => VendorSort.rating);
    return VendorListScreen(
      title: q['title'],
      filters: BrowseFilters(
        query: q['q'] ?? '',
        category: q['category'],
        hiddenGem: q['hidden'] == '1',
        famous: q['famous'] == '1',
        sort: sort,
        allCities: q['scope'] == 'all',
      ),
    );
  }

  final String? title;
  final BrowseFilters filters;

  @override
  Widget build(BuildContext context) {
    final category = context.watch<AppConfigProvider>().categoryBySlug(filters.category);
    final heading = title ?? (category != null ? '${category.icon ?? ''} ${category.name}'.trim() : 'Stalls');
    return Scaffold(
      appBar: AppBar(title: Text(heading)),
      body: VendorBrowser(initial: filters, showSearch: false),
    );
  }
}
