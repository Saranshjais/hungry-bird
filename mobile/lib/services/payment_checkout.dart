import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

/// What Razorpay Checkout reported back.
class CheckoutResult {
  const CheckoutResult.success({required this.paymentId, required this.orderId, required this.signature})
      : errorCode = null,
        errorMessage = null;

  const CheckoutResult.failure({this.errorCode, this.errorMessage})
      : paymentId = null,
        orderId = null,
        signature = null;

  final String? paymentId;
  final String? orderId;
  final String? signature;
  final int? errorCode;
  final String? errorMessage;

  bool get isSuccess => paymentId != null;

  /// The user closed the sheet / backed out of the UPI app.
  bool get cancelled => errorCode == Razorpay.PAYMENT_CANCELLED;
  bool get networkError => errorCode == Razorpay.NETWORK_ERROR;
}

/// Opens a payment sheet. Swappable so widget tests never reach the real SDK.
abstract class PaymentCheckout {
  Future<CheckoutResult> open(Map<String, dynamic> options);
  void dispose();
}

/// Razorpay Standard Checkout through `razorpay_flutter` (Android only — the iOS app never sells).
class RazorpayCheckout implements PaymentCheckout {
  Razorpay? _razorpay;
  Completer<CheckoutResult>? _pending;

  // Created on first use: registering listeners already talks to the native plugin.
  Razorpay get _sdk => _razorpay ??= Razorpay()
    ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _onSuccess)
    ..on(Razorpay.EVENT_PAYMENT_ERROR, _onError)
    ..on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);

  @override
  Future<CheckoutResult> open(Map<String, dynamic> options) {
    _complete(const CheckoutResult.failure(errorCode: Razorpay.PAYMENT_CANCELLED));
    final pending = _pending = Completer<CheckoutResult>();
    _sdk.open(options);
    return pending.future;
  }

  void _complete(CheckoutResult result) {
    final pending = _pending;
    _pending = null;
    if (pending != null && !pending.isCompleted) pending.complete(result);
  }

  void _onSuccess(PaymentSuccessResponse response) => _complete(CheckoutResult.success(
        paymentId: response.paymentId,
        orderId: response.orderId,
        signature: response.signature,
      ));

  void _onError(PaymentFailureResponse response) =>
      _complete(CheckoutResult.failure(errorCode: response.code, errorMessage: response.message));

  // Wallets are switched off in `method`; treat a wallet hand-off as "not paid here".
  void _onExternalWallet(ExternalWalletResponse response) =>
      _complete(const CheckoutResult.failure(errorCode: Razorpay.PAYMENT_CANCELLED));

  @override
  void dispose() {
    _complete(const CheckoutResult.failure(errorCode: Razorpay.PAYMENT_CANCELLED));
    _razorpay?.clear();
    _razorpay = null;
  }
}
