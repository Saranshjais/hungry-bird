import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/premium.dart';
import '../../state/auth_provider.dart';
import '../../state/premium_provider.dart';
import '../../widgets/common.dart';
import 'paywall.dart';

/// HungryBird Premium: the account's pass, its history and — on Android only — the passes on sale.
///
/// iOS never shows prices, plans or a buy button (App Store rule 3.1.1); it only reports status.
class PremiumScreen extends StatefulWidget {
  const PremiumScreen({super.key});

  @override
  State<PremiumScreen> createState() => _PremiumScreenState();
}

class _PremiumScreenState extends State<PremiumScreen> with WidgetsBindingObserver {
  int? _planId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Back from the UPI app (or later): the webhook may have activated the pass meanwhile.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) context.read<PremiumProvider>().refreshStatus();
  }

  Future<void> _refresh() async {
    if (!mounted) return;
    final premium = context.read<PremiumProvider>();
    await Future.wait([
      if (PremiumProvider.storeAllowed) premium.loadPlans(),
      premium.refreshStatus(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final premium = context.watch<PremiumProvider>();
    final auth = context.watch<AuthProvider>();
    final sells = PremiumProvider.storeAllowed;

    if (!premium.enabled) {
      return Scaffold(
        appBar: AppBar(title: const Text('HungryBird Premium')),
        body: const EmptyState(
          icon: Icons.workspace_premium_outlined,
          title: 'Premium isn\'t available right now',
          message: 'Every stall and food trail on HungryBird is open to everyone at the moment.',
        ),
      );
    }

    final plans = sells ? premium.plans : const <PremiumPlan>[];
    final selected = plans.isEmpty ? null : plans.firstWhere((p) => p.id == _planId, orElse: () => plans.first);
    final history = premium.status?.history ?? const [];
    final active = premium.isPremium;

    return Scaffold(
      appBar: AppBar(title: const Text('HungryBird Premium')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          // Without the pay bar the list itself has to clear the home indicator / nav bar.
          padding: readableInsets(context, EdgeInsets.fromLTRB(16, 8, 16, 24 + (selected == null ? MediaQuery.paddingOf(context).bottom : 0))),
          children: [
            const _Hero(),
            const SizedBox(height: 16),
            _StatusCard(loggedIn: auth.isLoggedIn, active: active, until: premium.premiumUntil, sells: sells),
            if (premium.benefits.isNotEmpty && (sells || active)) ...[
              _heading(context, active && !sells ? 'What\'s unlocked' : 'What you get'),
              SurfaceCard(
                child: Column(children: [for (final b in premium.benefits) BenefitRow(text: b)]),
              ),
            ],
            if (sells) ...[
              _heading(context, active ? 'Add more days' : 'Choose a pass'),
              if (!premium.paymentsAvailable || plans.isEmpty)
                SurfaceCard(
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppColors.premium),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Premium passes can\'t be bought right now. Please try again a little later.',
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              if (plans.isNotEmpty)
                RadioGroup<int>(
                  groupValue: selected!.id,
                  onChanged: (id) => setState(() => _planId = id),
                  child: Column(
                    children: [
                      for (final plan in plans)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: PlanTile(
                            plan: plan,
                            selected: plan.id == selected.id,
                            caption: plan.extensionLabel(active ? premium.premiumUntil : null),
                            onTap: () => setState(() => _planId = plan.id),
                          ),
                        ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
                child: Text(
                  '${oneTimeNote(premium.config)} Buying again adds the days to your current pass.',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ],
            if (history.isNotEmpty) ...[
              _heading(context, 'History'),
              Card(
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    for (var i = 0; i < history.length; i++) ...[
                      _HistoryRow(event: history[i], showAmount: sells),
                      if (i < history.length - 1) const Divider(indent: 16, endIndent: 16),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: selected == null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: ReadableWidth(
                child: FilledButton(
                  onPressed: premium.purchaseOffered && !premium.buying ? () => startPremiumPurchase(context, selected) : null,
                  child: premium.buying
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : Text(payLabel(selected, premium.config), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ),
            ),
    );
  }

  Widget _heading(BuildContext context, String text) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 22, 4, 10),
      child: Text(text, style: theme.textTheme.titleLarge?.copyWith(fontSize: 19)),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.ink, Color(0xFF4C1D95)]),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: const BoxDecoration(color: AppColors.premiumSoft, shape: BoxShape.circle),
            child: const Icon(Icons.workspace_premium_rounded, color: AppColors.premium, size: 28),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('HungryBird Premium', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
                SizedBox(height: 4),
                Text(
                  'Every hidden gem and food trail, unlocked.',
                  style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.loggedIn, required this.active, required this.until, required this.sells});

  final bool loggedIn;
  final bool active;
  final DateTime? until;
  final bool sells;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final (IconData icon, Color color, String title, String message) = !loggedIn
        ? (
            Icons.person_outline_rounded,
            muted,
            'Not logged in',
            sells ? 'Log in to see your Premium status. You\'ll be asked to log in before paying.' : 'Log in to see your Premium status.',
          )
        : active
            ? (
                Icons.verified_rounded,
                AppColors.success,
                'Premium is active',
                until == null ? 'Every hidden gem and food trail is unlocked.' : 'Unlocked until ${Fmt.date(until)}.',
              )
            : (
                Icons.lock_outline_rounded,
                AppColors.premium,
                sells ? 'You don\'t have Premium yet' : 'Premium isn\'t active on this account',
                sells ? 'Pick a pass below — it starts as soon as you pay.' : 'Premium content unlocks automatically when your account has Premium.',
              );
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 2),
                    Text(message, style: theme.textTheme.bodyMedium?.copyWith(color: muted, height: 1.4)),
                  ],
                ),
              ),
            ],
          ),
          if (!loggedIn) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/login?reason=premium'),
              icon: const Icon(Icons.login_rounded),
              label: const Text('Log in'),
            ),
          ],
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.event, required this.showAmount});

  final PremiumEvent event;

  /// Amounts paid stay off the iOS app (no prices there at all).
  final bool showAmount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final details = [
      if (event.createdAt != null) Fmt.date(event.createdAt),
      if (showAmount && event.amountPaise != null && event.amountPaise! > 0) Fmt.rupees(event.amountPaise!),
      if (event.endsAt != null) 'ends ${Fmt.date(event.endsAt)}',
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(event.kind == 'revoke' ? Icons.remove_circle_outline_rounded : Icons.add_circle_outline_rounded, color: muted, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.days > 0 && event.kind != 'revoke' ? '${event.title} · +${Fmt.days(event.days)}' : event.title,
                  style: theme.textTheme.titleSmall,
                ),
                if (details.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(details, style: theme.textTheme.bodySmall?.copyWith(color: muted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
