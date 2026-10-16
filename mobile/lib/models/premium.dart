import '../core/formatters.dart';
import 'user.dart';

/// A fixed-duration Premium pass ("Monthly pass — 30 days"). Paying extends `premium_until`.
class PremiumPlan {
  const PremiumPlan({
    required this.id,
    required this.name,
    this.description,
    required this.pricePaise,
    this.priceDisplay,
    required this.durationDays,
  });

  final int id;
  final String name;
  final String? description;
  final int pricePaise;
  final String? priceDisplay;
  final int durationDays;

  /// "₹49" — the server's display string, else formatted from paise.
  String get price => priceDisplay ?? Fmt.rupees(pricePaise);

  /// "30 days", "1 day".
  String get durationLabel => Fmt.days(durationDays);

  /// When Premium would end after buying this plan: the server adds the plan's days to
  /// `max(now, premium_until)`, so an active pass is extended rather than restarted.
  DateTime extendsUntil(DateTime? currentUntil, {DateTime? now}) {
    final today = (now ?? DateTime.now()).toUtc();
    final from = currentUntil != null && currentUntil.isAfter(today) ? currentUntil.toUtc() : today;
    return from.add(Duration(days: durationDays));
  }

  /// "Premium until 15 Nov 2026" or, with an active pass, "Extends Premium to 15 Dec 2026".
  String extensionLabel(DateTime? currentUntil, {DateTime? now}) {
    final active = currentUntil != null && currentUntil.isAfter((now ?? DateTime.now()).toUtc());
    final end = Fmt.date(extendsUntil(currentUntil, now: now));
    return active ? 'Extends Premium to $end' : 'Premium until $end';
  }

  factory PremiumPlan.fromJson(Map<String, dynamic> json) => PremiumPlan(
        id: asInt(json['id']),
        name: asString(json['name']) ?? 'Premium pass',
        description: asString(json['description']),
        pricePaise: asInt(json['price_paise']),
        priceDisplay: asString(json['price_display']),
        durationDays: asInt(json['duration_days']),
      );
}

/// The `premium` block of `/api/app/config`. Everything premium is off unless [enabled].
class PremiumConfig {
  const PremiumConfig({
    this.enabled = false,
    this.paymentsAvailable = false,
    this.paymentMethods = const ['upi'],
    this.plans = const [],
    this.benefits = const [],
  });

  final bool enabled;
  final bool paymentsAvailable;
  final List<String> paymentMethods;
  final List<PremiumPlan> plans;
  final List<String> benefits;

  /// Only UPI is offered (the default): copy says "Pay with UPI".
  bool get upiOnly => paymentMethods.isEmpty || (paymentMethods.length == 1 && paymentMethods.first == 'upi');

  factory PremiumConfig.fromJson(Map<String, dynamic> json) {
    final methods = (json['payment_methods'] as List?)?.map((m) => m.toString()).where((m) => m.isNotEmpty).toList();
    return PremiumConfig(
      enabled: asBool(json['enabled']),
      paymentsAvailable: asBool(json['payments_available']),
      paymentMethods: methods == null || methods.isEmpty ? const ['upi'] : methods,
      plans: ((json['plans'] as List?) ?? const [])
          .whereType<Map>()
          .map((p) => PremiumPlan.fromJson(Map<String, dynamic>.from(p)))
          .where((p) => p.id != 0 && p.durationDays > 0)
          .toList(),
      benefits: ((json['benefits'] as List?) ?? const []).map((b) => asString(b)).whereType<String>().toList(),
    );
  }
}

/// One line of the account's Premium history (purchase, admin grant/extend/revoke).
class PremiumEvent {
  const PremiumEvent({required this.kind, this.days = 0, this.endsAt, this.createdAt, this.amountPaise});

  final String kind;
  final int days;
  final DateTime? endsAt;
  final DateTime? createdAt;
  final int? amountPaise;

  /// "Pass purchased", "Premium granted by HungryBird", …
  String get title => switch (kind) {
        'purchase' || 'payment' => 'Pass purchased',
        'grant' => 'Premium granted by HungryBird',
        'extend' => 'Premium extended by HungryBird',
        'revoke' => 'Premium ended by HungryBird',
        _ => 'Premium updated',
      };

  factory PremiumEvent.fromJson(Map<String, dynamic> json) => PremiumEvent(
        kind: asString(json['kind']) ?? '',
        days: asInt(json['days']),
        endsAt: Fmt.parseDate(json['ends_at']),
        createdAt: Fmt.parseDate(json['created_at']),
        amountPaise: json['amount_paise'] == null ? null : asInt(json['amount_paise']),
      );
}

/// `GET /api/premium/status`.
class PremiumStatus {
  const PremiumStatus({required this.isPremium, this.premiumUntil, this.history = const []});

  final bool isPremium;
  final DateTime? premiumUntil;
  final List<PremiumEvent> history;

  factory PremiumStatus.fromJson(Map<String, dynamic> json) => PremiumStatus(
        isPremium: asBool(json['is_premium']),
        premiumUntil: Fmt.parseDate(json['premium_until']),
        history: ((json['history'] as List?) ?? const [])
            .whereType<Map>()
            .map((e) => PremiumEvent.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

/// `POST /api/payments/order`: everything Razorpay Checkout needs.
class PaymentOrder {
  const PaymentOrder({
    required this.orderId,
    required this.amountPaise,
    this.currency = 'INR',
    required this.keyId,
    this.name = 'HungryBird',
    this.description,
    this.prefill = const {},
    this.method,
    this.plan,
  });

  final String orderId;
  final int amountPaise;
  final String currency;
  final String keyId;
  final String name;
  final String? description;
  final Map<String, String> prefill;
  final Map<String, bool>? method;
  final PremiumPlan? plan;

  /// UPI only unless the server says otherwise.
  static const upiOnly = {'upi': true, 'card': false, 'netbanking': false, 'wallet': false, 'emi': false, 'paylater': false};

  /// Razorpay Standard Checkout options.
  Map<String, dynamic> checkoutOptions() => {
        'key': keyId,
        'order_id': orderId,
        'amount': amountPaise,
        'currency': currency,
        'name': name,
        if (description != null) 'description': description,
        if (prefill.isNotEmpty) 'prefill': prefill,
        'method': method ?? upiOnly,
        'theme': {'color': '#F97316'},
      };

  factory PaymentOrder.fromJson(Map<String, dynamic> json) {
    final prefill = <String, String>{};
    final rawPrefill = json['prefill'];
    if (rawPrefill is Map) {
      rawPrefill.forEach((k, v) {
        final value = asString(v);
        if (value != null) prefill['$k'] = value;
      });
    }
    final rawMethod = json['method'];
    final plan = json['plan'];
    return PaymentOrder(
      orderId: asString(json['order_id']) ?? '',
      amountPaise: asInt(json['amount_paise']),
      currency: asString(json['currency']) ?? 'INR',
      keyId: asString(json['key_id']) ?? '',
      name: asString(json['name']) ?? 'HungryBird',
      description: asString(json['description']),
      prefill: prefill,
      method: rawMethod is Map ? rawMethod.map((k, v) => MapEntry('$k', asBool(v))) : null,
      plan: plan is Map ? PremiumPlan.fromJson(Map<String, dynamic>.from(plan)) : null,
    );
  }
}

/// `POST /api/payments/verify` → the updated account.
class PaymentVerification {
  const PaymentVerification({required this.ok, this.user});

  final bool ok;
  final AppUser? user;

  factory PaymentVerification.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return PaymentVerification(
      ok: json['ok'] == null ? user != null : asBool(json['ok']),
      user: user is Map ? AppUser.fromJson(Map<String, dynamic>.from(user)) : null,
    );
  }
}
