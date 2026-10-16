import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../models/premium.dart';
import '../../state/app_config_provider.dart';
import '../../state/auth_provider.dart';
import '../../state/premium_provider.dart';
import '../../widgets/common.dart';

/// Buys [plan]: logs in and verifies the email first when needed, then runs Razorpay
/// Checkout (Android only). Returns true once the account has Premium.
Future<bool> startPremiumPurchase(BuildContext context, PremiumPlan plan) async {
  final auth = context.read<AuthProvider>();
  final premium = context.read<PremiumProvider>();
  if (!PremiumProvider.storeAllowed) return false;

  if (!auth.isLoggedIn) {
    await context.push('/login?reason=premium');
    if (!context.mounted || !auth.isLoggedIn) return false;
    if (premium.isPremium) {
      showSnack(context, 'Your account already has Premium — everything is unlocked.');
      return true;
    }
  }
  if (auth.needsEmailVerification) {
    final verified = await context.push<bool>('/verify-email');
    if (!context.mounted || verified != true || auth.needsEmailVerification) return false;
  }

  try {
    final outcome = await premium.purchase(plan);
    if (!context.mounted) return outcome.status == PurchaseStatus.success;
    switch (outcome.status) {
      case PurchaseStatus.success:
        await _showWelcome(context, outcome.user?.premiumUntil ?? premium.premiumUntil);
        return true;
      case PurchaseStatus.cancelled:
        showSnack(context, outcome.message ?? 'Payment cancelled.');
      case PurchaseStatus.failed:
        showSnack(context, outcome.message ?? 'The payment didn\'t go through. Please try again.', error: true);
      case PurchaseStatus.pending:
        if (outcome.message != null) await _showPending(context, outcome.message!);
    }
  } on ApiException catch (e) {
    if (!context.mounted) return false;
    switch (e.code) {
      case ApiErrorCode.emailNotVerified:
        final verified = await context.push<bool>('/verify-email');
        if (verified == true && context.mounted) return startPremiumPurchase(context, plan);
      case ApiErrorCode.premiumDisabled:
        await context.read<AppConfigProvider>().load();
        if (context.mounted) showSnack(context, 'Premium isn\'t available right now.', error: true);
      case ApiErrorCode.paymentsNotConfigured:
        showSnack(context, 'Payments aren\'t available right now. Please try again a little later.', error: true);
      case ApiErrorCode.paymentProviderError:
        showSnack(context, 'We couldn\'t start the payment. Nothing was charged — please try again.', error: true);
      default:
        if (e.isNotFound) {
          await premium.loadPlans();
          if (context.mounted) showSnack(context, 'That pass is no longer available. Please pick another one.', error: true);
        } else {
          showSnack(context, e.message, error: true);
        }
    }
  }
  return false;
}

Future<void> _showWelcome(BuildContext context, DateTime? until) => showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        scrollable: true,
        icon: const Icon(Icons.workspace_premium_rounded, color: AppColors.premium, size: 40),
        title: const Text('Welcome to Premium!'),
        content: Text(
          until == null
              ? 'Every hidden gem and food trail is now unlocked.'
              : 'Every hidden gem and food trail is unlocked until ${Fmt.date(until)}.',
          textAlign: TextAlign.center,
        ),
        actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Start exploring'))],
      ),
    );

Future<void> _showPending(BuildContext context, String message) => showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        scrollable: true,
        title: const Text('Confirming your payment'),
        content: Text(message),
        actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );

/// Bottom sheet shown when someone taps a locked hidden gem or trail.
Future<void> showPaywallSheet(BuildContext context, {required String title, String? subtitle}) {
  return showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LockedHeading(title: title, subtitle: subtitle),
            const SizedBox(height: 18),
            PaywallPanel(onUnlocked: () => Navigator.of(sheetContext).pop()),
          ],
        ),
      ),
    ),
  );
}

/// Lock badge + "Premium hidden gem" + "C-Scheme · Chaat".
class LockedHeading extends StatelessWidget {
  const LockedHeading({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(color: AppColors.premiumSoft, shape: BoxShape.circle),
          child: const Icon(Icons.lock_rounded, color: AppColors.premium),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: theme.textTheme.titleLarge),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(subtitle!, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// What a locked item offers instead of its details.
///
/// Android (passes on sale): benefits, the plans and a buy button. iOS: a plain explanation —
/// no price, no buy button and no pointer to buying anywhere else (App Store rule 3.1.1).
class PaywallPanel extends StatefulWidget {
  const PaywallPanel({super.key, this.onUnlocked});

  /// Called once the account has Premium (e.g. to close the sheet; the page reloads by itself).
  final VoidCallback? onUnlocked;

  @override
  State<PaywallPanel> createState() => _PaywallPanelState();
}

class _PaywallPanelState extends State<PaywallPanel> {
  int? _planId;

  Future<void> _buy(PremiumPlan plan) async {
    final unlocked = await startPremiumPurchase(context, plan);
    if (unlocked && mounted) widget.onUnlocked?.call();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final premium = context.watch<PremiumProvider>();
    final loggedIn = context.select<AuthProvider, bool>((a) => a.isLoggedIn);
    final body = theme.textTheme.bodyMedium?.copyWith(color: muted, height: 1.45);

    if (!premium.enabled) {
      return Text('This listing isn\'t available right now. Please check back later.', style: body);
    }

    if (premium.isPremium) {
      // Premium arrived while this page was open; it reloads on its own.
      return Text('Your account has Premium — this unlocks in a moment.', style: body);
    }

    if (!PremiumProvider.storeAllowed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'This is part of HungryBird Premium. Premium hidden gems and food trails open automatically when your '
            'account has Premium.',
            style: body,
          ),
          if (loggedIn) ...[
            const SizedBox(height: 10),
            Text('Premium isn\'t active on this account.', style: theme.textTheme.titleSmall),
          ] else ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => context.push('/login?reason=premium'),
              icon: const Icon(Icons.login_rounded),
              label: const Text('Log in'),
            ),
          ],
        ],
      );
    }

    if (!premium.purchaseOffered) {
      return Text('Premium passes can\'t be bought right now. Please try again a little later.', style: body);
    }

    final plans = premium.plans;
    final selected = plans.firstWhere((p) => p.id == _planId, orElse: () => plans.first);
    final benefits = premium.benefits.take(3).toList();
    final until = premium.premiumUntil;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Unlock with Premium', style: theme.textTheme.titleMedium),
        const SizedBox(height: 6),
        if (benefits.isEmpty)
          Text('A Premium pass opens every hidden gem — name, address and directions — and every food trail.', style: body)
        else
          for (final b in benefits) BenefitRow(text: b),
        const SizedBox(height: 14),
        RadioGroup<int>(
          groupValue: selected.id,
          onChanged: (id) => setState(() => _planId = id),
          child: Column(
            children: [
              for (final plan in plans)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: PlanTile(
                    plan: plan,
                    selected: plan.id == selected.id,
                    caption: plan.extensionLabel(until),
                    onTap: () => setState(() => _planId = plan.id),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        FilledButton(
          onPressed: premium.buying ? null : () => _buy(selected),
          child: premium.buying
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
              : Text(payLabel(selected, premium.config), maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
        const SizedBox(height: 6),
        Text(oneTimeNote(premium.config), textAlign: TextAlign.center, style: theme.textTheme.bodySmall?.copyWith(color: muted)),
        TextButton(onPressed: () => context.push('/premium'), child: const Text('About Premium')),
      ],
    );
  }
}

/// "Pay ₹49 with UPI".
String payLabel(PremiumPlan plan, PremiumConfig config) => config.upiOnly ? 'Pay ${plan.price} with UPI' : 'Pay ${plan.price}';

String oneTimeNote(PremiumConfig config) =>
    '${config.upiOnly ? 'One-time UPI payment' : 'One-time payment'}. Passes don\'t renew automatically.';

class BenefitRow extends StatelessWidget {
  const BenefitRow({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: theme.textTheme.bodyMedium?.copyWith(height: 1.4))),
        ],
      ),
    );
  }
}

/// A selectable pass: name, description, what buying it does, price and duration.
class PlanTile extends StatelessWidget {
  const PlanTile({super.key, required this.plan, required this.selected, required this.onTap, this.caption});

  final PremiumPlan plan;
  final bool selected;
  final VoidCallback onTap;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    return Material(
      color: selected ? AppColors.premiumSoft : theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: selected ? AppColors.premium : theme.colorScheme.outline, width: selected ? 1.6 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: LayoutBuilder(builder: (context, constraints) {
          final priceStyle = theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: selected ? AppColors.ink : null);
          final durationStyle = theme.textTheme.labelSmall?.copyWith(color: selected ? AppColors.inkSoft : muted);
          // Narrow tiles (cover screens, sheets, large text) put the price under the name so the
          // name keeps enough width not to break mid-word.
          final narrow = constraints.maxWidth < 300 * MediaQuery.textScalerOf(context).scale(14) / 14;
          return Padding(
            padding: const EdgeInsets.fromLTRB(2, 10, 14, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Radio<int>(
                  value: plan.id,
                  activeColor: AppColors.premium,
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(plan.name, style: theme.textTheme.titleSmall?.copyWith(color: selected ? AppColors.ink : null)),
                        if (plan.description != null) ...[
                          const SizedBox(height: 2),
                          Text(plan.description!, style: theme.textTheme.bodySmall?.copyWith(color: selected ? AppColors.inkSoft : muted)),
                        ],
                        if (narrow) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [Text(plan.price, style: priceStyle), Text(plan.durationLabel, style: durationStyle)],
                          ),
                        ],
                        if (caption != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            caption!,
                            style: theme.textTheme.labelSmall?.copyWith(color: AppColors.premium, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (!narrow) ...[
                  const SizedBox(width: 10),
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [Text(plan.price, style: priceStyle), Text(plan.durationLabel, style: durationStyle)],
                    ),
                  ),
                ],
              ],
            ),
          );
        }),
      ),
    );
  }
}
