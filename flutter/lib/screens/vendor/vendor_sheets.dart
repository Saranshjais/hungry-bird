import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/review.dart';
import '../../models/vendor.dart';
import '../../services/hungry_bird_api.dart';
import '../../state/app_config_provider.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';

/// Opens the write/edit review sheet. Returns the saved result, or null if dismissed.
Future<RateResult?> showReviewSheet(BuildContext context, {required Vendor vendor, Review? existing}) {
  final auth = context.read<AuthProvider>();
  final allowGuests = context.read<AppConfigProvider>().settings.allowGuestReviews;
  if (!auth.isLoggedIn && !allowGuests) {
    context.push('/login?reason=review');
    return Future.value(null);
  }
  return showModalBottomSheet<RateResult>(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    // A tall sheet (keyboard up, short screen) stops below the status bar / notch.
    useSafeArea: true,
    builder: (_) => _ReviewSheet(vendor: vendor, existing: existing),
  );
}

class _ReviewSheet extends StatefulWidget {
  const _ReviewSheet({required this.vendor, this.existing});

  final Vendor vendor;
  final Review? existing;

  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  late int _rating = widget.existing?.rating.round() ?? 0;
  late final _text = TextEditingController(text: widget.existing?.text ?? '');
  final _name = TextEditingController();
  bool _saving = false;
  String? _error;

  static const _labels = ['', 'Not great', 'Okay', 'Good', 'Really good', 'Must try!'];

  @override
  void dispose() {
    _text.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      setState(() => _error = 'Tap the stars to rate this stall.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final result = await context.read<HungryBirdApi>().rateVendor(
            widget.vendor.id,
            rating: _rating.toDouble(),
            text: _text.text.trim(),
            authorName: _name.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(result);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.isUnauthorized) {
        Navigator.of(context).pop();
        context.push('/login?reason=review');
        return;
      }
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final loggedIn = context.watch<AuthProvider>().isLoggedIn;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.existing == null ? 'Rate ${widget.vendor.name}' : 'Update your review',
                  style: theme.textTheme.titleLarge, textAlign: TextAlign.center),
              const SizedBox(height: 4),
              Text(
                'How was your experience?',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              Center(child: StarRatingInput(value: _rating, onChanged: (v) => setState(() => _rating = v))),
              // At least 22pt tall so the sheet doesn't jump when a rating is picked, but free to grow
              // with large text instead of clipping the label.
              ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 22),
                child: Text(_labels[_rating],
                    textAlign: TextAlign.center, style: const TextStyle(color: AppColors.brand, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _text,
                maxLines: 4,
                maxLength: 500,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText: 'What should people order? How\'s the taste, hygiene, wait time?',
                ),
              ),
              if (!loggedIn) ...[
                const SizedBox(height: 4),
                TextField(
                  controller: _name,
                  maxLength: 60,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(hintText: 'Your name (optional)', prefixIcon: Icon(Icons.person_outline_rounded)),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.push('/login?reason=review');
                  },
                  child: const Text('Log in to keep track of your reviews'),
                ),
              ],
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
                ),
              const SizedBox(height: 4),
              FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(widget.existing == null ? 'Post review' : 'Save changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Lets people flag wrong listings or abusive reviews for the moderators.
Future<void> showReportSheet(BuildContext context, {required String targetType, required int targetId, required String title}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    useSafeArea: true,
    builder: (_) => _ReportSheet(targetType: targetType, targetId: targetId, title: title),
  );
}

class _ReportSheet extends StatefulWidget {
  const _ReportSheet({required this.targetType, required this.targetId, required this.title});

  final String targetType;
  final int targetId;
  final String title;

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  String? _reason;
  final _details = TextEditingController();
  bool _sending = false;

  List<String> get _reasons => widget.targetType == 'review'
      ? const ['Spam or advertising', 'Offensive or abusive', 'Fake review', 'Not about this stall', 'Other']
      : const ['Permanently closed', 'Wrong location on map', 'Wrong details (hours, price, menu)', 'Duplicate listing', 'Inappropriate content', 'Other'];

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_reason == null) return;
    setState(() => _sending = true);
    try {
      final message = await context.read<HungryBirdApi>().report(
            targetType: widget.targetType,
            targetId: widget.targetId,
            reason: _reason!,
            details: _details.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      showSnack(context, message);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(widget.title, style: theme.textTheme.titleLarge),
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text('Our moderators review every report.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              ),
              const SizedBox(height: 8),
              RadioGroup<String>(
                groupValue: _reason,
                onChanged: (v) => setState(() => _reason = v),
                child: Column(
                  children: [
                    for (final r in _reasons)
                      RadioListTile<String>(
                        value: r,
                        title: Text(r),
                        activeColor: AppColors.brand,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: TextField(
                  controller: _details,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: const InputDecoration(hintText: 'Anything else we should know? (optional)'),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: FilledButton(
                  onPressed: _reason == null || _sending ? null : _send,
                  child: _sending
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Send report'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
