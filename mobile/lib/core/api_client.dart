import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

/// Machine-readable `code` of an error response (`{"error": "…", "code": "RATE_LIMITED"}`).
enum ApiErrorCode {
  emailNotVerified,
  paymentsNotConfigured,
  premiumDisabled,
  emailNotConfigured,
  rateLimited,
  invalidCode,
  codeExpired,
  tooManyAttempts,
  weakPassword,
  paymentVerificationFailed,
  paymentProviderError,
  validation,
  emailInUse,
  alreadyVerified,
  emailSendFailed,
  accountSuspended,
  invalidCredentials,
  invalidPassword,
  premiumRequired,
  unauthorized,
  notFound,
  unknown;

  static ApiErrorCode? parse(Object? value, {int? statusCode}) {
    final code = switch (value?.toString()) {
      'EMAIL_NOT_VERIFIED' => emailNotVerified,
      'PAYMENTS_NOT_CONFIGURED' => paymentsNotConfigured,
      'PREMIUM_DISABLED' => premiumDisabled,
      'EMAIL_NOT_CONFIGURED' => emailNotConfigured,
      'RATE_LIMITED' => rateLimited,
      'INVALID_CODE' => invalidCode,
      'CODE_EXPIRED' => codeExpired,
      'TOO_MANY_ATTEMPTS' => tooManyAttempts,
      'WEAK_PASSWORD' => weakPassword,
      'PAYMENT_VERIFICATION_FAILED' => paymentVerificationFailed,
      'PAYMENT_PROVIDER_ERROR' => paymentProviderError,
      'VALIDATION' => validation,
      'EMAIL_IN_USE' => emailInUse,
      'ALREADY_VERIFIED' => alreadyVerified,
      'EMAIL_SEND_FAILED' => emailSendFailed,
      'ACCOUNT_SUSPENDED' => accountSuspended,
      'INVALID_CREDENTIALS' => invalidCredentials,
      'INVALID_PASSWORD' => invalidPassword,
      'PREMIUM_REQUIRED' => premiumRequired,
      'UNAUTHORIZED' => unauthorized,
      'NOT_FOUND' => notFound,
      null || '' => null,
      _ => unknown,
    };
    // A bare 429 (e.g. from a proxy's rate limiter) carries no code.
    return code ?? (statusCode == 429 ? rateLimited : null);
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code, this.retryAfter, this.attemptsLeft});

  final String message;

  /// HTTP status, or null when the request never reached the server.
  final int? statusCode;

  /// The server's error code (every JSON error carries one).
  final ApiErrorCode? code;

  /// Seconds to wait before retrying (`Retry-After`, `retry_after` or `resend_after`).
  final int? retryAfter;

  /// `INVALID_CODE`: wrong tries left for this code.
  final int? attemptsLeft;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isNetwork => statusCode == null;

  @override
  String toString() => message;
}

/// Thin JSON wrapper around `package:http` for the Flask backend.
class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String baseUrl;

  /// Bearer token of the logged-in user (null for guests).
  String? token;

  /// Called once when the server rejects the current token (401 on a request that sent it:
  /// expired, revoked by a password change/reset, or issued before a server upgrade). The token
  /// is dropped first, so later requests go out as a guest and can't loop on the same error.
  void Function()? onSessionExpired;

  /// The free hosting tier sleeps when idle; the first request can take ~40s.
  static const defaultTimeout = Duration(seconds: 45);

  Future<dynamic> get(String path, {Map<String, Object?>? query, Duration? timeout}) =>
      _send('GET', path, query: query, timeout: timeout);

  Future<dynamic> post(String path, {Object? body, Duration? timeout}) =>
      _send('POST', path, body: body, timeout: timeout);

  Future<dynamic> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<dynamic> delete(String path, {Object? body}) => _send('DELETE', path, body: body);

  Uri uri(String path, [Map<String, Object?>? query]) {
    final params = <String, String>{};
    query?.forEach((key, value) {
      if (value == null) return;
      final str = value is bool ? (value ? 'true' : 'false') : value.toString();
      if (str.isNotEmpty) params[key] = str;
    });
    final base = Uri.parse('$baseUrl$path');
    return params.isEmpty ? base : base.replace(queryParameters: params);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, Object?>? query,
    Object? body,
    Duration? timeout,
  }) async {
    final request = http.Request(method, uri(path, query));
    request.headers['Accept'] = 'application/json';
    final sentToken = token;
    if (sentToken != null) request.headers['Authorization'] = 'Bearer $sentToken';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    http.Response response;
    try {
      final streamed = await _client.send(request).timeout(timeout ?? defaultTimeout);
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw ApiException('The server is taking too long to respond. Please try again.');
    } on http.ClientException {
      throw ApiException('Could not reach HungryBird. Check your internet connection.');
    } catch (_) {
      throw ApiException('Could not reach HungryBird. Check your internet connection.');
    }

    dynamic data;
    if (response.body.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(response.bodyBytes));
      } on FormatException {
        data = null;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }

    // Only the token that was actually sent counts (a concurrent login may have replaced it).
    if (response.statusCode == 401 && sentToken != null && sentToken == token) {
      token = null;
      onSessionExpired?.call();
    }

    String message;
    if (data is Map && (data['error'] ?? data['message']) != null) {
      message = (data['error'] ?? data['message']).toString();
    } else if (response.statusCode == 404) {
      message = 'We couldn\'t find what you were looking for.';
    } else if (response.statusCode >= 500) {
      message = 'Something went wrong on our side. Please try again shortly.';
    } else {
      message = 'Request failed (${response.statusCode}).';
    }
    var retryAfter = int.tryParse(response.headers['retry-after'] ?? '');
    if (data is Map) {
      for (final key in const ['retry_after', 'resend_after']) {
        final value = data[key];
        if (value is num) retryAfter = value.ceil();
      }
    }
    final attemptsLeft = data is Map && data['attempts_left'] is num ? (data['attempts_left'] as num).toInt() : null;
    throw ApiException(
      message,
      statusCode: response.statusCode,
      code: ApiErrorCode.parse(data is Map ? data['code'] : null, statusCode: response.statusCode),
      retryAfter: retryAfter,
      attemptsLeft: attemptsLeft,
    );
  }
}
