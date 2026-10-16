import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;

  /// HTTP status, or null when the request never reached the server.
  final int? statusCode;

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

  /// The free hosting tier sleeps when idle; the first request can take ~40s.
  static const defaultTimeout = Duration(seconds: 45);

  Future<dynamic> get(String path, {Map<String, Object?>? query, Duration? timeout}) =>
      _send('GET', path, query: query, timeout: timeout);

  Future<dynamic> post(String path, {Object? body, Duration? timeout}) =>
      _send('POST', path, body: body, timeout: timeout);

  Future<dynamic> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

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
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
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
    throw ApiException(message, statusCode: response.statusCode);
  }
}
