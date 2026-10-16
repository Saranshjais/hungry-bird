import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/premium.dart';
import '../models/user.dart';
import '../services/hungry_bird_api.dart';
import '../services/payment_checkout.dart';
import 'app_config_provider.dart';
import 'auth_provider.dart';

enum PurchaseStatus { success, cancelled, failed, pending }

class PurchaseOutcome {
  const PurchaseOutcome(this.status, {this.message, this.user});

  final PurchaseStatus status;
  final String? message;
  final AppUser? user;
}

/// HungryBird Premium: plans, the account's pass and buying one (Android only).
///
/// Everything here is inert while the admin switch `premium.enabled` is off.
class PremiumProvider extends ChangeNotifier {
  PremiumProvider(this._api, {PaymentCheckout Function()? checkout})
      : _checkoutFactory = checkout ?? RazorpayCheckout.new;

  final HungryBirdApi _api;
  final PaymentCheckout Function() _checkoutFactory;
  PaymentCheckout? _checkout;

  AuthProvider? _auth;
  AppConfigProvider? _config;
  String _unlockKey = '';

  PremiumStatus? _status;
  bool _loadingStatus = false;
  String? _statusError;
  List<PremiumPlan>? _plans;
  bool _buying = false;
  bool _disposed = false;

  /// The App Store allows no purchase button or link to buying elsewhere (rule 3.1.1), so
  /// only the Android app sells passes. iOS shows a plain "Premium" label instead.
  static bool get storeAllowed => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  PremiumConfig get config => _config?.settings.premium ?? const PremiumConfig();
  bool get enabled => config.enabled;
  bool get paymentsAvailable => config.paymentsAvailable;
  List<PremiumPlan> get plans => _plans ?? config.plans;
  List<String> get benefits => config.benefits;

  /// Whether this build may show plans and a buy button right now.
  bool get purchaseOffered => storeAllowed && enabled && paymentsAvailable && plans.isNotEmpty;

  AppUser? get user => _auth?.user;
  bool get isPremium => _auth?.user?.hasActivePremium ?? false;
  DateTime? get premiumUntil => _status?.premiumUntil ?? _auth?.user?.premiumUntil;
  PremiumStatus? get status => _status;
  bool get loadingStatus => _loadingStatus;
  String? get statusError => _statusError;
  bool get buying => _buying;

  /// Changes whenever what the server locks for this viewer can change (switch flipped,
  /// Premium gained or lost). Lists and detail pages reload when it does.
  String get unlockKey => '$enabled:$isPremium';

  /// Called by the provider tree whenever auth or config change.
  void bind(AuthProvider auth, AppConfigProvider config) {
    final wasLoggedIn = _auth?.isLoggedIn ?? false;
    _auth = auth;
    _config = config;
    final key = unlockKey;
    if (!auth.isLoggedIn && wasLoggedIn) _status = null;
    if (key != _unlockKey) {
      _unlockKey = key;
      // Runs while the provider tree rebuilds; listeners hear about it after the frame.
      Future.microtask(() {
        if (!_disposed) notifyListeners();
      });
    }
  }

  Future<void> refreshStatus() async {
    if (!(_auth?.isLoggedIn ?? false) || !enabled) return;
    _loadingStatus = true;
    notifyListeners();
    try {
      final status = await _api.getPremiumStatus();
      _status = status;
      _statusError = null;
      // The webhook may have activated a pass the app never heard back about.
      if (status.isPremium != isPremium || status.premiumUntil != _auth?.user?.premiumUntil) {
        await _auth?.refreshUser();
      }
    } on ApiException catch (e) {
      _statusError = e.isNotFound ? null : e.message;
    } finally {
      _loadingStatus = false;
      notifyListeners();
    }
  }

  Future<void> loadPlans() async {
    if (!enabled) return;
    try {
      _plans = await _api.getPremiumPlans();
      notifyListeners();
    } on ApiException {
      // Keep the plans that came with the app config.
    }
  }

  /// Order → Razorpay Checkout → server-side signature check → refreshed account.
  ///
  /// Throws [ApiException] when the order can't be created (e.g. `EMAIL_NOT_VERIFIED`,
  /// `PAYMENTS_NOT_CONFIGURED`, `PREMIUM_DISABLED`); the caller routes or explains.
  Future<PurchaseOutcome> purchase(PremiumPlan plan) async {
    if (_buying) return const PurchaseOutcome(PurchaseStatus.pending);
    _buying = true;
    notifyListeners();
    try {
      final order = await _api.createPaymentOrder(plan.id);
      final checkout = _checkout ??= _checkoutFactory();
      final result = await checkout.open(order.checkoutOptions()).timeout(
            const Duration(minutes: 15),
            onTimeout: () => const CheckoutResult.failure(errorCode: -1),
          );
      if (!result.isSuccess) {
        if (result.errorCode == -1) {
          unawaited(refreshStatus());
          return const PurchaseOutcome(
            PurchaseStatus.pending,
            message: 'We\'re still waiting to hear back about your payment. If you paid, Premium switches on '
                'by itself within a few minutes.',
          );
        }
        if (result.cancelled) {
          return const PurchaseOutcome(PurchaseStatus.cancelled, message: 'Payment cancelled. You haven\'t been charged.');
        }
        return PurchaseOutcome(
          PurchaseStatus.failed,
          message: result.networkError
              ? 'The connection dropped during payment. If money left your account, Premium switches on by itself '
                  'within a few minutes — otherwise please try again.'
              : 'The payment didn\'t go through. No money was taken — please try again.',
        );
      }
      try {
        final verified = await _api.verifyPayment(
          orderId: result.orderId ?? order.orderId,
          paymentId: result.paymentId!,
          signature: result.signature ?? '',
        );
        if (verified.user != null) {
          await _auth?.applyUser(verified.user!);
        } else {
          await _auth?.refreshUser();
        }
        unawaited(refreshStatus());
        return PurchaseOutcome(PurchaseStatus.success, user: _auth?.user);
      } on ApiException catch (e) {
        // Paid but not confirmed yet: the webhook still activates the pass.
        unawaited(refreshStatus());
        return PurchaseOutcome(
          PurchaseStatus.pending,
          message: e.code == ApiErrorCode.paymentVerificationFailed
              ? 'We couldn\'t confirm this payment. If money left your account, Premium switches on by itself '
                  'within a few minutes, or write to us from Help & support.'
              : 'Payment received — we\'re confirming it. Premium switches on by itself within a few minutes.',
        );
      }
    } finally {
      _buying = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _checkout?.dispose();
    super.dispose();
  }
}
