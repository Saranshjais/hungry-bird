import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/links.dart';
import '../core/theme.dart';
import '../models/app_content.dart';
import '../services/hungry_bird_api.dart';
import '../state/app_config_provider.dart';
import '../state/auth_provider.dart';
import '../state/premium_provider.dart';
import '../widgets/common.dart';
import 'auth/auth_widgets.dart';

/// FAQ answers that match the live settings: guest reviews and Premium are admin switches, and
/// the iOS app never talks about buying Premium (App Store rule 3.1.1).
List<(String, String)> _faqs(AppSettings settings, {required bool sellsPremium}) => [
      (
        'How do you find these stalls?',
        'Our team maps stalls from public sources and field visits, and the community suggests hidden gems. '
            'Every suggestion is checked by a moderator before it goes live. Stalls with the Verified badge have '
            'been checked by the HungryBird team.'
      ),
      (
        'What makes a stall a "Hidden Gem"?',
        'Hidden gems are much-loved local spots that rarely show up on big food apps — small carts, decades-old '
            'shops and neighbourhood favourites.'
      ),
      if (settings.premium.enabled)
        sellsPremium
            ? (
                'What is HungryBird Premium?',
                'A pass that unlocks every Premium hidden gem — name, address and directions — and every food trail '
                    'for a fixed number of days. You pay once with UPI; it never renews by itself, and buying again adds '
                    'the days to your current pass. You need an account with a verified email.'
              )
            : (
                'What does the "Premium" label mean?',
                'Some hidden gems and food trails are part of HungryBird Premium. They unlock automatically on '
                    'accounts that have Premium — just log in.'
              ),
      (
        'I suggested a stall. When will it appear?',
        'Usually within a few days. You can follow the status under Profile → My suggestions.'
      ),
      (
        'Something about a stall is wrong.',
        'Open the stall, tap the ⋮ menu and choose "Report a problem". Our moderators will fix it.'
      ),
      (
        'Do I need an account?',
        settings.allowGuestReviews
            ? 'No. You can browse, save stalls on your phone and even post reviews as a guest. An account keeps your '
                'saved list and reviews across devices.'
            : 'Not to browse or save stalls on your phone. To post a review you need a free account, which also keeps '
                'your saved list across devices.'
      ),
      (
        'Why should I verify my email?',
        'Verifying proves the address is yours, so we can send you a code if you ever forget your password'
            '${settings.premium.enabled && sellsPremium ? ' — and it\'s needed to buy Premium' : ''}. Tap the '
            '"Email not verified" banner on your profile to get a 6-digit code.'
      ),
      (
        'I forgot my password.',
        'On the Log in screen tap "Forgot password?" and enter your email. We\'ll send a 6-digit code to set a new '
            'password. For your security this logs your account out on all devices.'
      ),
    ];

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  final _message = TextEditingController();
  String _topic = 'General question';
  bool _sending = false;

  static const _topics = ['General question', 'Account & login', 'Wrong stall information', 'Partnership', 'Bug report', 'Other'];

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _name = TextEditingController(text: user?.name ?? '');
    _email = TextEditingController(text: user?.email ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _sending = true);
    try {
      final reply = await context.read<HungryBirdApi>().sendContactMessage(
            name: _name.text.trim(),
            email: _email.text.trim(),
            subject: _topic,
            message: _message.text.trim(),
          );
      if (!mounted) return;
      _message.clear();
      showSnack(context, reply);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = context.watch<AppConfigProvider>().settings;
    final supportEmail = settings.supportEmail;
    final supportPhone = settings.supportPhone;
    final faqs = _faqs(settings, sellsPremium: PremiumProvider.storeAllowed);
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      body: ListView(
        padding: readableInsets(context, EdgeInsets.fromLTRB(16, 8, 16, 32 + MediaQuery.paddingOf(context).bottom)),
        children: [
          Text('Frequently asked', style: theme.textTheme.titleLarge),
          const SizedBox(height: 10),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final (q, a) in faqs)
                  ExpansionTile(
                    shape: const Border(),
                    collapsedShape: const Border(),
                    iconColor: AppColors.brand,
                    title: Text(q, style: theme.textTheme.titleSmall),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    expandedAlignment: Alignment.topLeft,
                    children: [Text(a, style: theme.textTheme.bodyMedium?.copyWith(height: 1.5))],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text('Contact us', style: theme.textTheme.titleLarge),
          const SizedBox(height: 4),
          Text('We usually reply within a day.', style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 14),
          Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Your name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: validateEmail,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _topic,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Topic'),
                  items: [for (final t in _topics) DropdownMenuItem(value: t, child: Text(t, overflow: TextOverflow.ellipsis))],
                  onChanged: (v) => setState(() => _topic = v ?? _topic),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _message,
                  maxLines: 5,
                  maxLength: 2000,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(labelText: 'How can we help?', alignLabelWithHint: true),
                  validator: (v) => (v == null || v.trim().length < 10) ? 'Please write at least a sentence' : null,
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Icon(Icons.send_rounded),
                  label: const Text('Send message'),
                ),
                if (supportEmail.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => Links.email(context, supportEmail, subject: 'HungryBird app support'),
                    icon: const Icon(Icons.mail_outline_rounded),
                    label: Text('Or email $supportEmail'),
                  ),
                ],
                if (supportPhone.isNotEmpty)
                  TextButton.icon(
                    onPressed: () => Links.call(context, supportPhone),
                    icon: const Icon(Icons.call_outlined),
                    label: Text('Or call $supportPhone'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
