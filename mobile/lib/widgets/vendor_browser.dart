import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../models/vendor.dart';
import '../services/hungry_bird_api.dart';
import '../services/location_service.dart';
import '../state/app_config_provider.dart';
import '../state/city_provider.dart';
import '../state/preferences_provider.dart';
import 'common.dart';
import 'vendor_cards.dart';

class BrowseFilters {
  const BrowseFilters({
    this.query = '',
    this.category,
    this.hiddenGem = false,
    this.famous = false,
    this.sort = VendorSort.rating,
    this.allCities = false,
  });

  final String query;
  final String? category;
  final bool hiddenGem;
  final bool famous;
  final VendorSort sort;
  final bool allCities;

  BrowseFilters copyWith({
    String? query,
    String? category,
    bool clearCategory = false,
    bool? hiddenGem,
    bool? famous,
    VendorSort? sort,
    bool? allCities,
  }) =>
      BrowseFilters(
        query: query ?? this.query,
        category: clearCategory ? null : (category ?? this.category),
        hiddenGem: hiddenGem ?? this.hiddenGem,
        famous: famous ?? this.famous,
        sort: sort ?? this.sort,
        allCities: allCities ?? this.allCities,
      );
}

const _sortLabels = {
  VendorSort.rating: 'Top rated',
  VendorSort.popular: 'Most reviewed',
  VendorSort.newest: 'Newest',
  VendorSort.distance: 'Nearest',
};

/// Searchable, filterable, infinitely scrolling vendor list.
class VendorBrowser extends StatefulWidget {
  const VendorBrowser({super.key, this.initial = const BrowseFilters(), this.showSearch = true, this.header});

  final BrowseFilters initial;
  final bool showSearch;
  final Widget? header;

  @override
  State<VendorBrowser> createState() => _VendorBrowserState();
}

class _VendorBrowserState extends State<VendorBrowser> {
  static const _pageSize = 20;

  late BrowseFilters _filters = widget.initial;
  late final _searchController = TextEditingController(text: widget.initial.query);
  final _searchFocus = FocusNode();
  final _scroll = ScrollController();
  Timer? _debounce;

  final List<Vendor> _items = [];
  int _total = 0;
  bool _loading = false;
  bool _loadingMore = false;
  String? _error;
  int _generation = 0;
  String? _citySlug;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _searchFocus.addListener(() => setState(() {}));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final slug = context.watch<CityProvider>().selectedSlug;
    if (slug != _citySlug) {
      _citySlug = slug;
      _reload();
    }
  }

  @override
  void didUpdateWidget(covariant VendorBrowser oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new search arrived from elsewhere (e.g. the home search bar).
    if (widget.initial.query != oldWidget.initial.query && widget.initial.query.isNotEmpty) {
      _searchController.text = widget.initial.query;
      _filters = _filters.copyWith(query: widget.initial.query);
      context.read<PreferencesProvider>().addRecentSearch(widget.initial.query);
      _reload();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scroll.dispose();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 600) _loadMore();
  }

  bool get _hasMore => _items.length < _total;

  Future<VendorPage> _fetch(int offset) {
    final pos = context.read<LocationProvider>().position;
    return context.read<HungryBirdApi>().getVendors(
          city: _filters.allCities ? 'all' : _citySlug,
          category: _filters.category,
          query: _filters.query.trim(),
          hiddenGem: _filters.hiddenGem,
          famous: _filters.famous,
          sort: _filters.sort,
          lat: pos?.latitude,
          lng: pos?.longitude,
          limit: _pageSize,
          offset: offset,
        );
  }

  Future<void> _reload() async {
    if (_citySlug == null && !_filters.allCities) return;
    final gen = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _fetch(0);
      if (!mounted || gen != _generation) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.vendors);
        _total = page.total;
      });
      if (_scroll.hasClients) _scroll.jumpTo(0);
    } on ApiException catch (e) {
      if (!mounted || gen != _generation) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted && gen == _generation) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || !_hasMore || _error != null) return;
    final gen = _generation;
    setState(() => _loadingMore = true);
    try {
      final page = await _fetch(_items.length);
      if (!mounted || gen != _generation) return;
      setState(() {
        _items.addAll(page.vendors.where((v) => !_items.any((e) => e.id == v.id)));
        _total = page.total;
      });
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _update(BrowseFilters next) {
    setState(() => _filters = next);
    _reload();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (value.trim() == _filters.query.trim()) return;
      _update(_filters.copyWith(query: value));
    });
  }

  void _submitQuery(String value) {
    _debounce?.cancel();
    context.read<PreferencesProvider>().addRecentSearch(value);
    _update(_filters.copyWith(query: value));
    _searchFocus.unfocus();
  }

  void _useSuggestion(String value) {
    _searchController.text = value;
    _submitQuery(value);
  }

  Future<void> _setSort(VendorSort sort) async {
    if (sort == VendorSort.distance) {
      final location = context.read<LocationProvider>();
      final pos = await location.locate();
      if (pos == null) {
        if (mounted) {
          showSnack(context, location.message.isEmpty ? 'Location is needed to sort by distance.' : location.message, error: true);
        }
        return;
      }
    }
    _update(_filters.copyWith(sort: sort));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cityName = context.select<CityProvider, String>((c) => c.selected?.name ?? 'your city');
    final recent = context.watch<PreferencesProvider>().recentSearches;
    final showSuggestions = widget.showSearch && _searchFocus.hasFocus && _searchController.text.isEmpty;

    return CustomScrollView(
      controller: _scroll,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      slivers: [
        if (widget.header != null) SliverToBoxAdapter(child: widget.header),
        if (widget.showSearch)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: TextField(
                controller: _searchController,
                focusNode: _searchFocus,
                textInputAction: TextInputAction.search,
                onChanged: (v) {
                  setState(() {});
                  _onQueryChanged(v);
                },
                onSubmitted: _submitQuery,
                decoration: InputDecoration(
                  hintText: 'Search stalls, dishes or areas',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _searchController.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Clear',
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () {
                            _searchController.clear();
                            _update(_filters.copyWith(query: ''));
                          },
                        ),
                ),
              ),
            ),
          ),
        if (showSuggestions)
          SliverToBoxAdapter(child: _Suggestions(recent: recent, onPick: _useSuggestion)),
        SliverToBoxAdapter(child: _filterChips(cityName)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 8, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _loading ? 'Searching…' : '$_total ${_total == 1 ? 'stall' : 'stalls'} ${_filters.allCities ? 'across all cities' : 'in $cityName'}',
                    style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
                PopupMenuButton<VendorSort>(
                  tooltip: 'Sort',
                  initialValue: _filters.sort,
                  onSelected: _setSort,
                  itemBuilder: (_) => [
                    for (final entry in _sortLabels.entries)
                      PopupMenuItem(value: entry.key, child: Text(entry.value)),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.swap_vert_rounded, size: 18, color: AppColors.brand),
                        const SizedBox(width: 4),
                        Text(_sortLabels[_filters.sort]!, style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        ..._results(),
        SliverToBoxAdapter(child: SizedBox(height: navBarSpace(context))),
      ],
    );
  }

  Widget _filterChips(String cityName) {
    final categories = context.watch<AppConfigProvider>().categories;
    final chips = <Widget>[
      FilterChip(
        label: Text(_filters.allCities ? 'All cities' : cityName),
        avatar: Icon(Icons.location_city_rounded, size: 16, color: _filters.allCities ? Colors.white : AppColors.brand),
        selected: _filters.allCities,
        onSelected: (v) => _update(_filters.copyWith(allCities: v)),
      ),
      FilterChip(
        label: const Text('Hidden gems'),
        avatar: Icon(Icons.diamond_rounded, size: 16, color: _filters.hiddenGem ? Colors.white : AppColors.gem),
        selected: _filters.hiddenGem,
        onSelected: (v) => _update(_filters.copyWith(hiddenGem: v)),
      ),
      FilterChip(
        label: const Text('Local legends'),
        avatar: Icon(Icons.local_fire_department_rounded, size: 16, color: _filters.famous ? Colors.white : AppColors.brandDeep),
        selected: _filters.famous,
        onSelected: (v) => _update(_filters.copyWith(famous: v)),
      ),
      for (final c in categories)
        FilterChip(
          label: Text('${c.icon ?? ''} ${c.name}'.trim()),
          selected: _filters.category == c.slug,
          onSelected: (v) => _update(v ? _filters.copyWith(category: c.slug) : _filters.copyWith(clearCategory: true)),
        ),
    ];
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => chips[i],
      ),
    );
  }

  List<Widget> _results() {
    if (_loading && _items.isEmpty) {
      return [
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverVendorTiles(
            itemCount: 6,
            itemBuilder: (_, __) => const VendorTileSkeleton(),
          ),
        ),
      ];
    }
    if (_error != null && _items.isEmpty) {
      return [SliverToBoxAdapter(child: ErrorState(message: _error!, onRetry: _reload))];
    }
    if (_items.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: EmptyState(
            icon: Icons.search_off_rounded,
            title: 'No stalls found',
            message: _filters.query.isNotEmpty
                ? 'Nothing matches "${_filters.query}". Try another dish or area — or tell us about a stall we\'re missing.'
                : 'Try removing a filter, or suggest a stall we\'re missing.',
            actionLabel: 'Suggest a stall',
            onAction: () => context.push('/submit'),
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
        sliver: SliverVendorTiles(
          itemCount: _items.length,
          itemBuilder: (_, i) => VendorTile(vendor: _items[i]),
        ),
      ),
      if (_loadingMore || _hasMore)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))),
          ),
        ),
    ];
  }
}

class _Suggestions extends StatelessWidget {
  const _Suggestions({required this.recent, required this.onPick});

  final List<String> recent;
  final ValueChanged<String> onPick;

  static const _popular = ['Pyaz kachori', 'Lassi', 'Kulfi', 'Chai', 'Mirchi vada', 'Pani puri', 'Ghewar', 'Samosa'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final prefs = context.read<PreferencesProvider>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (recent.isNotEmpty) ...[
            Row(
              children: [
                Text('Recent searches', style: theme.textTheme.titleSmall),
                const Spacer(),
                TextButton(onPressed: prefs.clearRecentSearches, child: const Text('Clear')),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final s in recent)
                  InputChip(
                    label: Text(s, maxLines: 1, overflow: TextOverflow.ellipsis),
                    avatar: const Icon(Icons.history_rounded, size: 16),
                    onPressed: () => onPick(s),
                    onDeleted: () => prefs.removeRecentSearch(s),
                  ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          Text('Popular right now', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in _popular)
                ActionChip(
                  label: Text(s),
                  avatar: const Icon(Icons.trending_up_rounded, size: 16, color: AppColors.brand),
                  onPressed: () => onPick(s),
                ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
