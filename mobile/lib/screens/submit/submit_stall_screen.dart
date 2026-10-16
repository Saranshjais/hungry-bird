import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../models/city.dart';
import '../../models/user.dart';
import '../../services/hungry_bird_api.dart';
import '../../services/location_service.dart';
import '../../state/app_config_provider.dart';
import '../../state/auth_provider.dart';
import '../../state/city_provider.dart';
import '../../widgets/common.dart';
import '../auth/auth_widgets.dart';
import 'location_picker_screen.dart';

const _priceOptions = ['Under ₹50', '₹50 – ₹100', '₹100 – ₹200', '₹200+'];

class SubmitStallScreen extends StatefulWidget {
  const SubmitStallScreen({super.key});

  @override
  State<SubmitStallScreen> createState() => _SubmitStallScreenState();
}

class _SubmitStallScreenState extends State<SubmitStallScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _mapsLink = TextEditingController();
  final _submitter = TextEditingController();
  final _email = TextEditingController();

  City? _city;
  String? _category;
  String? _price;
  int _rating = 0;
  LatLng? _point;
  bool _locating = false;
  bool _sending = false;
  bool _done = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _city = context.read<CityProvider>().selected;
  }

  @override
  void dispose() {
    for (final c in [_name, _description, _address, _mapsLink, _submitter, _email]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    final location = context.read<LocationProvider>();
    final pos = await location.locate();
    if (!mounted) return;
    setState(() {
      _locating = false;
      if (pos != null) _point = LatLng(pos.latitude, pos.longitude);
    });
    if (pos == null) {
      showSnack(context, location.message.isEmpty ? 'Could not get your location' : location.message, error: true);
    }
  }

  Future<void> _pickOnMap() async {
    final start = _point ??
        (context.read<LocationProvider>().position != null
            ? LatLng(context.read<LocationProvider>().position!.latitude, context.read<LocationProvider>().position!.longitude)
            : LatLng(_city?.lat ?? AppConfig.fallbackLat, _city?.lng ?? AppConfig.fallbackLng));
    final result = await context.push<LatLng>('/pick-location', extra: LocationPickerArgs(lat: start.latitude, lng: start.longitude));
    if (result != null && mounted) setState(() => _point = result);
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (_city == null) {
      setState(() => _error = 'Choose the city the stall is in.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    final categories = context.read<AppConfigProvider>().categories;
    final categoryName = categories.where((c) => c.slug == _category).map((c) => c.name).firstOrNull ?? _category;
    try {
      await context.read<HungryBirdApi>().submitStall(StallSubmission(
            cityId: _city!.id,
            stallName: _name.text.trim(),
            cuisineType: categoryName,
            description: _description.text.trim(),
            address: _address.text.trim(),
            estimatedPrice: _price,
            googleMapsUrl: _mapsLink.text.trim(),
            lat: _point?.latitude,
            lng: _point?.longitude,
            rating: _rating == 0 ? null : _rating.toDouble(),
            submitterName: _submitter.text.trim(),
            submitterEmail: _email.text.trim(),
          ));
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _reset() {
    _form.currentState?.reset();
    for (final c in [_name, _description, _address, _mapsLink]) {
      c.clear();
    }
    setState(() {
      _done = false;
      _category = null;
      _price = null;
      _rating = 0;
      _point = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_done) return _SuccessView(onAnother: _reset);

    final theme = Theme.of(context);
    final cities = context.watch<CityProvider>().cities;
    final categories = context.watch<AppConfigProvider>().categories;
    final loggedIn = context.watch<AuthProvider>().isLoggedIn;

    return Scaffold(
      appBar: AppBar(title: const Text('Suggest a stall')),
      body: Form(
        key: _form,
        child: ListView(
          padding: readableInsets(context, EdgeInsets.fromLTRB(20, 4, 20, 32 + MediaQuery.paddingOf(context).bottom)),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.brandSoft, borderRadius: BorderRadius.circular(16)),
              child: const Row(
                children: [
                  Text('💎', style: TextStyle(fontSize: 26)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Know a stall everyone should try? Tell us about it — our team verifies every suggestion before it goes live.',
                      style: TextStyle(color: AppColors.inkSoft, fontWeight: FontWeight.w600, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _label('Stall name *'),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: 'e.g. Rawat Mishtan Bhandar'),
              validator: (v) => (v == null || v.trim().length < 2) ? 'Enter the stall\'s name' : null,
            ),
            const SizedBox(height: 16),
            LayoutBuilder(builder: (context, constraints) {
              final city = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('City *'),
                  DropdownButtonFormField<int>(
                    initialValue: _city?.id,
                    isExpanded: true,
                    items: [
                      for (final c in cities)
                        DropdownMenuItem(value: c.id, child: Text(c.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (id) => setState(() => _city = cities.firstWhere((c) => c.id == id)),
                    validator: (v) => v == null ? 'Choose a city' : null,
                  ),
                ],
              );
              final category = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('Category'),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    isExpanded: true,
                    hint: const Text('Choose', maxLines: 1, overflow: TextOverflow.ellipsis),
                    items: [
                      for (final c in categories)
                        DropdownMenuItem(value: c.slug, child: Text('${c.icon ?? ''} ${c.name}'.trim(), maxLines: 1, overflow: TextOverflow.ellipsis)),
                      const DropdownMenuItem(value: 'Other', child: Text('Other')),
                    ],
                    onChanged: (v) => setState(() => _category = v),
                  ),
                ],
              );
              // Side by side unless half the width can't show "Choose" next to the arrow
              // (cover screens, large text); then stacked.
              final half = (constraints.maxWidth - 12) / 2;
              final hintWidth = textWidth(context, 'Choose', theme.textTheme.bodyLarge ?? const TextStyle());
              if (half - 16 * 2 - 24 >= hintWidth) {
                return Row(
                  children: [Expanded(child: city), const SizedBox(width: 12), Expanded(child: category)],
                );
              }
              return Column(children: [city, const SizedBox(height: 16), category]);
            }),
            const SizedBox(height: 16),
            _label('What makes it special?'),
            TextFormField(
              controller: _description,
              maxLines: 3,
              maxLength: 600,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'What to order, the story, best time to go…'),
            ),
            const SizedBox(height: 8),
            _label('Price per person'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final p in _priceOptions)
                  ChoiceChip(
                    label: Text(p),
                    selected: _price == p,
                    onSelected: (v) => setState(() => _price = v ? p : null),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            _label('Address or landmark *'),
            TextFormField(
              controller: _address,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: 'e.g. Near Hawa Mahal gate, Johari Bazaar'),
              validator: (v) => (v == null || v.trim().length < 4) ? 'Tell us where to find it' : null,
            ),
            const SizedBox(height: 12),
            _locationCard(theme),
            const SizedBox(height: 8),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              shape: const Border(),
              collapsedShape: const Border(),
              title: Text('Have a Google Maps link?', style: theme.textTheme.titleSmall),
              children: [
                TextFormField(
                  controller: _mapsLink,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(hintText: 'Paste the share link (optional)', prefixIcon: Icon(Icons.link_rounded)),
                ),
                const SizedBox(height: 8),
              ],
            ),
            const SizedBox(height: 8),
            _label('Your rating (optional)'),
            StarRatingInput(value: _rating, onChanged: (v) => setState(() => _rating = v), size: 34),
            if (!loggedIn) ...[
              const SizedBox(height: 16),
              _label('About you (optional)'),
              TextFormField(
                controller: _submitter,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(hintText: 'Your name', prefixIcon: Icon(Icons.person_outline_rounded)),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(hintText: 'Email, so we can thank you', prefixIcon: Icon(Icons.alternate_email_rounded)),
                validator: (v) => (v == null || v.trim().isEmpty) ? null : validateEmail(v),
              ),
              TextButton(
                onPressed: () => context.push('/login?reason=submit'),
                child: const Text('Log in to track your suggestions'),
              ),
            ],
            if (_error != null) FormErrorBanner(message: _error!),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Icon(Icons.send_rounded),
              label: const Text('Submit suggestion'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 2),
        child: Text(text, style: Theme.of(context).textTheme.titleSmall),
      );

  Widget _locationCard(ThemeData theme) {
    final hasPoint = _point != null;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: hasPoint ? AppColors.successSoft : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(hasPoint ? Icons.check_circle_rounded : Icons.push_pin_outlined, color: hasPoint ? AppColors.success : AppColors.brand),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  hasPoint
                      ? 'Pinned at ${_point!.latitude.toStringAsFixed(5)}, ${_point!.longitude.toStringAsFixed(5)}'
                      : 'Pin the exact spot — stalls with a pin get approved faster.',
                  style: TextStyle(fontWeight: FontWeight.w700, color: hasPoint ? const Color(0xFF166534) : null),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (context, constraints) {
            final style = OutlinedButton.styleFrom(minimumSize: const Size(0, 44), backgroundColor: theme.colorScheme.surface);
            final here = OutlinedButton.icon(
              style: style,
              onPressed: _locating ? null : _useCurrentLocation,
              icon: _locating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location_rounded, size: 18),
              label: const Text('I\'m here'),
            );
            final pick = OutlinedButton.icon(
              style: style,
              onPressed: _pickOnMap,
              icon: const Icon(Icons.map_outlined, size: 18),
              label: Text(hasPoint ? 'Adjust' : 'Pick on map'),
            );
            // Two columns while "Pick on map" fits on one line, else one button per row.
            const buttonText = TextStyle(fontFamily: AppTheme.fontFamily, fontWeight: FontWeight.w700, fontSize: 15);
            if ((constraints.maxWidth - 10) / 2 >= textWidth(context, 'Pick on map', buttonText) + 70) {
              return Row(children: [Expanded(child: here), const SizedBox(width: 10), Expanded(child: pick)]);
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [here, const SizedBox(height: 8), pick],
            );
          }),
        ],
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.onAnother});

  final VoidCallback onAnother;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final loggedIn = context.watch<AuthProvider>().isLoggedIn;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false),
      body: SafeArea(
        // Centred when it fits; scrolls on short screens / large text; phone-width on tablets.
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: math.max(0, constraints.maxHeight - 56)),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 110,
                          height: 110,
                          decoration: const BoxDecoration(color: AppColors.successSoft, shape: BoxShape.circle),
                          child: const Icon(Icons.check_rounded, size: 60, color: AppColors.success),
                        ),
                      ),
                      const SizedBox(height: 28),
                      Text('Thank you!', textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
                      const SizedBox(height: 10),
                      Text(
                        'Your suggestion is with our team. Once verified, it will appear on the map for everyone.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.5),
                      ),
                      const SizedBox(height: 32),
                      if (loggedIn)
                        FilledButton(
                          onPressed: () => context.pushReplacement('/profile/submissions'),
                          child: const Text('Track my suggestions'),
                        ),
                      const SizedBox(height: 10),
                      OutlinedButton(onPressed: onAnother, child: const Text('Suggest another stall')),
                      TextButton(onPressed: () => context.go('/home'), child: const Text('Back to home')),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
