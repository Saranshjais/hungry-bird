import '../core/api_client.dart';
import '../core/formatters.dart';
import '../models/app_content.dart';
import '../models/city.dart';
import '../models/premium.dart';
import '../models/review.dart';
import '../models/trail.dart';
import '../models/user.dart';
import '../models/vendor.dart';

enum VendorSort { rating, popular, newest, distance }

class AuthResult {
  const AuthResult({required this.token, required this.user, this.verificationSent = false});

  final String token;
  final AppUser user;

  /// Register only: whether a verification code was emailed.
  final bool verificationSent;
}

class AppBootstrap {
  const AppBootstrap({required this.settings, required this.banners, required this.categories});

  final AppSettings settings;
  final List<AppBanner> banners;
  final List<FoodCategory> categories;
}

/// `PUT /api/auth/profile` result: an email change makes the account unverified again.
class ProfileUpdate {
  const ProfileUpdate({required this.user, required this.verificationSent});

  final AppUser user;
  final bool verificationSent;
}

/// Typed access to the HungryBird Flask API. Failures throw [ApiException] (with
/// [ApiException.code] when the server sends a machine-readable `code`).
class HungryBirdApi {
  HungryBirdApi(this.client);

  final ApiClient client;

  set token(String? value) => client.token = value;

  /// See [ApiClient.onSessionExpired].
  set onSessionExpired(void Function()? callback) => client.onSessionExpired = callback;

  static List<Map<String, dynamic>> _list(Object? value) =>
      ((value as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

  /// `[…]` or `{key: […]}`.
  static List<Map<String, dynamic>> _items(Object? data, String key) => _list(data is Map ? data[key] : data);

  // ---------- content ----------

  Future<AppBootstrap> getAppConfig() async {
    final data = await client.get('/api/app/config', timeout: const Duration(seconds: 50)) as Map<String, dynamic>;
    // Launch-build keys (premium, socials, support phone, push) may sit next to `settings`.
    final merged = <String, dynamic>{
      for (final e in data.entries)
        if (!const {'settings', 'banners', 'categories'}.contains(e.key)) e.key: e.value,
      ...Map<String, dynamic>.from((data['settings'] as Map?) ?? const {}),
    };
    if (data['premium'] is Map) merged['premium'] = data['premium'];
    return AppBootstrap(
      settings: AppSettings.fromJson(merged),
      banners: _list(data['banners']).map(AppBanner.fromJson).where((b) => b.imageUrl != null).toList(),
      categories: _list(data['categories']).map(FoodCategory.fromJson).where((c) => c.slug.isNotEmpty).toList(),
    );
  }

  Future<List<City>> getCities() async {
    final data = await client.get('/api/cities', timeout: const Duration(seconds: 50));
    return _items(data, 'cities').map(City.fromJson).toList();
  }

  Future<List<FoodCategory>> getCategories({String? city}) async {
    final data = await client.get('/api/categories', query: {'city': city});
    return _items(data, 'categories').map(FoodCategory.fromJson).where((c) => c.slug.isNotEmpty && c.name.isNotEmpty).toList();
  }

  Future<VendorPage> getVendors({
    String? city,
    String? category,
    String? query,
    bool hiddenGem = false,
    bool famous = false,
    VendorSort sort = VendorSort.rating,
    double? lat,
    double? lng,
    int limit = 20,
    int offset = 0,
  }) async {
    final data = await client.get('/api/vendors', query: {
      'city': city ?? 'all',
      'category': category,
      'q': query,
      'is_hidden_gem': hiddenGem ? 'true' : null,
      'is_famous': famous ? 'true' : null,
      'sort': sort.name,
      'lat': lat,
      'lng': lng,
      'limit': limit,
      'offset': offset,
    }) as Map;
    final vendors = _list(data['vendors']).map(Vendor.fromJson).toList();
    return VendorPage(vendors: vendors, total: asInt(data['total'], vendors.length));
  }

  Future<List<Vendor>> getNearby({required double lat, required double lng, double radiusKm = 5, int limit = 20}) async {
    final data = await client.get('/api/vendors/nearby', query: {
      'lat': lat,
      'lng': lng,
      'radius': radiusKm,
      'limit': limit,
    }) as Map;
    return _list(data['vendors']).map(Vendor.fromJson).toList();
  }

  /// A locked Premium vendor comes back as 200 with [VendorDetail.locked] set.
  Future<VendorDetail> getVendor(int id) async {
    final data = await client.get('/api/vendors/$id');
    return VendorDetail.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<RateResult> rateVendor(int vendorId, {required double rating, String? text, String? authorName}) async {
    final data = await client.post('/api/vendors/$vendorId/rate', body: {
      'rating': rating,
      'review_text': text ?? '',
      'author_name': authorName ?? '',
    });
    return RateResult.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<String> submitStall(StallSubmission submission) async {
    final data = await client.post('/api/submit-vendor', body: submission.toJson()) as Map;
    return asString(data['message']) ?? 'Thanks for your suggestion!';
  }

  /// The active food trails of one city (admin-managed, sorted by the server).
  Future<List<FoodTrail>> getTrails({required String city}) async {
    final data = await client.get('/api/trails', query: {'city': city});
    return _items(data, 'trails').map(FoodTrail.fromJson).where((t) => t.title.isNotEmpty).toList();
  }

  Future<FoodTrail> getTrail(int id) async {
    final data = await client.get('/api/trails/$id') as Map;
    final trail = data['trail'];
    return FoodTrail.fromJson(Map<String, dynamic>.from(trail is Map ? trail : data));
  }

  /// Recent written reviews, from [city] only when given (never of locked Premium vendors).
  Future<List<CommunityReview>> getCommunityReviews({String? city}) async {
    final data = await client.get('/api/vendor-reviews', query: {'city': city}) as Map;
    return _list(data['reviews']).map(CommunityReview.fromJson).toList();
  }

  Future<List<AppNotification>> getNotifications({String? city}) async {
    final data = await client.get('/api/notifications', query: {'city': city}) as Map;
    return _list(data['notifications']).map(AppNotification.fromJson).toList();
  }

  Future<String> sendContactMessage({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) async {
    final data = await client.post('/api/contact', body: {
      'name': name,
      'email': email,
      'subject': subject,
      'message': message,
      'source': 'app',
    }) as Map;
    return asString(data['message']) ?? 'Message sent.';
  }

  Future<String> report({
    required String targetType,
    required int targetId,
    required String reason,
    String? details,
  }) async {
    final data = await client.post('/api/reports', body: {
      'target_type': targetType,
      'target_id': targetId,
      'reason': reason,
      'details': details ?? '',
    }) as Map;
    return asString(data['message']) ?? 'Thanks for reporting.';
  }

  // ---------- auth ----------

  AuthResult _auth(Object? data) {
    final map = Map<String, dynamic>.from(data as Map);
    return AuthResult(
      token: map['token'] as String,
      user: AppUser.fromJson(Map<String, dynamic>.from(map['user'] as Map)),
      verificationSent: asBool(map['verification_sent']),
    );
  }

  static AppUser _user(Object? data) => AppUser.fromJson(Map<String, dynamic>.from((data as Map)['user'] as Map));

  Future<AuthResult> login(String email, String password) async =>
      _auth(await client.post('/api/auth/login', body: {'email': email, 'password': password}));

  /// Also emails a verification code ([AuthResult.verificationSent]).
  Future<AuthResult> register(String name, String email, String password) async => _auth(
        await client.post('/api/auth/register', body: {'name': name, 'email': email, 'password': password}),
      );

  Future<AppUser> me() async => _user(await client.get('/api/auth/me', timeout: const Duration(seconds: 50)));

  /// Changing [email] needs [currentPassword]; the new address must then be verified.
  Future<ProfileUpdate> updateProfile({required String name, required String email, String? phone, String? currentPassword}) async {
    final data = await client.put('/api/auth/profile', body: {
      'name': name,
      'email': email,
      'phone': phone ?? '',
      if (currentPassword != null && currentPassword.isNotEmpty) 'current_password': currentPassword,
    }) as Map;
    return ProfileUpdate(user: _user(data), verificationSent: asBool(data['verification_sent']));
  }

  /// Revokes every session of the account (the old token stops working); returns this device's
  /// fresh token and the account. Errors: `INVALID_PASSWORD`, `WEAK_PASSWORD`.
  Future<({String? token, AppUser? user})> changePassword(String current, String next) async {
    final data = await client.put('/api/auth/password', body: {'current_password': current, 'new_password': next});
    if (data is! Map) return (token: null, user: null);
    final user = data['user'];
    return (token: asString(data['token']), user: user is Map ? AppUser.fromJson(Map<String, dynamic>.from(user)) : null);
  }

  /// Emails a fresh 6-digit code; returns the seconds until another may be requested.
  Future<int> sendVerificationCode() async {
    final data = await client.post('/api/auth/email/send-code');
    return data is Map && data['resend_after'] != null ? asInt(data['resend_after'], 60) : 60;
  }

  Future<AppUser> verifyEmail(String code) async => _user(await client.post('/api/auth/email/verify', body: {'code': code}));

  /// Always succeeds for a well-formed email (no account enumeration).
  Future<void> forgotPassword(String email) => client.post('/api/auth/password/forgot', body: {'email': email});

  /// Sets a new password with the emailed code. The server signs the account out everywhere.
  Future<void> resetPassword({required String email, required String code, required String newPassword}) =>
      client.post('/api/auth/password/reset', body: {'email': email, 'code': code, 'new_password': newPassword});

  Future<void> setNotificationsEnabled(bool enabled) =>
      client.put('/api/auth/notifications-preference', body: {'enabled': enabled});

  /// Permanent, so the server re-checks the password. Errors: `INVALID_PASSWORD`, `RATE_LIMITED`.
  Future<void> deleteAccount({required String currentPassword}) =>
      client.delete('/api/auth/account', body: {'current_password': currentPassword});

  Future<List<Submission>> mySubmissions() async {
    final data = await client.get('/api/user/submissions') as Map;
    return _list(data['submissions']).map(Submission.fromJson).toList();
  }

  Future<List<MyReview>> myReviews() async {
    final data = await client.get('/api/user/reviews') as Map;
    return _list(data['reviews']).map(MyReview.fromJson).toList();
  }

  // ---------- premium ----------

  Future<List<PremiumPlan>> getPremiumPlans() async {
    final data = await client.get('/api/premium/plans');
    return _items(data, 'plans').map(PremiumPlan.fromJson).where((p) => p.id != 0 && p.durationDays > 0).toList();
  }

  Future<PremiumStatus> getPremiumStatus() async =>
      PremiumStatus.fromJson(Map<String, dynamic>.from(await client.get('/api/premium/status') as Map));

  /// Errors: `PREMIUM_DISABLED`, `PAYMENTS_NOT_CONFIGURED`, `EMAIL_NOT_VERIFIED`, 404 (plan gone).
  Future<PaymentOrder> createPaymentOrder(int planId) async =>
      PaymentOrder.fromJson(Map<String, dynamic>.from(await client.post('/api/payments/order', body: {'plan_id': planId}) as Map));

  /// Server-side signature check (idempotent). Error: `PAYMENT_VERIFICATION_FAILED`.
  Future<PaymentVerification> verifyPayment({required String orderId, required String paymentId, required String signature}) async {
    final data = await client.post('/api/payments/verify', body: {
      'razorpay_order_id': orderId,
      'razorpay_payment_id': paymentId,
      'razorpay_signature': signature,
    });
    return PaymentVerification.fromJson(Map<String, dynamic>.from(data as Map));
  }

  // ---------- favourites ----------

  Future<List<Vendor>> getFavorites() async {
    final data = await client.get('/api/favorites') as Map;
    return _list(data['favorites']).map(Vendor.fromJson).toList();
  }

  /// Returns true if the vendor is now saved.
  Future<bool> toggleFavorite(int vendorId) async {
    final data = await client.post('/api/favorites/toggle', body: {'vendor_id': vendorId}) as Map;
    return data['status'] == 'added';
  }

  Future<Set<int>> syncFavorites(Iterable<int> vendorIds) async {
    final data = await client.post('/api/favorites/sync', body: {'vendor_ids': vendorIds.toList()}) as Map;
    return ((data['vendor_ids'] as List?) ?? const []).map((e) => asInt(e)).toSet();
  }
}
