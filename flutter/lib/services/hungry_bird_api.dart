import '../core/api_client.dart';
import '../core/formatters.dart';
import '../models/app_content.dart';
import '../models/city.dart';
import '../models/review.dart';
import '../models/user.dart';
import '../models/vendor.dart';

enum VendorSort { rating, popular, newest, distance }

class AuthResult {
  const AuthResult({required this.token, required this.user});

  final String token;
  final AppUser user;
}

class AppBootstrap {
  const AppBootstrap({required this.settings, required this.banners, required this.categories});

  final AppSettings settings;
  final List<AppBanner> banners;
  final List<FoodCategory> categories;
}

/// Typed access to the HungryBird Flask API.
class HungryBirdApi {
  HungryBirdApi(this.client);

  final ApiClient client;

  set token(String? value) => client.token = value;

  static List<Map<String, dynamic>> _list(Object? value) =>
      ((value as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();

  // ---------- content ----------

  Future<AppBootstrap> getAppConfig() async {
    final data = await client.get('/api/app/config', timeout: const Duration(seconds: 50)) as Map<String, dynamic>;
    return AppBootstrap(
      settings: AppSettings.fromJson(Map<String, dynamic>.from((data['settings'] as Map?) ?? const {})),
      banners: _list(data['banners']).map(AppBanner.fromJson).where((b) => b.imageUrl != null).toList(),
      categories: _list(data['categories']).map(FoodCategory.fromJson).where((c) => c.slug.isNotEmpty).toList(),
    );
  }

  Future<List<City>> getCities() async {
    final data = await client.get('/api/cities', timeout: const Duration(seconds: 50));
    return _list((data as Map)['cities']).map(City.fromJson).toList();
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

  Future<List<FoodTrail>> getTrails() async {
    final data = await client.get('/api/trails') as Map;
    return _list(data['trails']).map(FoodTrail.fromJson).toList();
  }

  Future<List<CityGuide>> getGuides() async {
    final data = await client.get('/api/guides') as Map;
    return _list(data['guides']).map(CityGuide.fromJson).toList();
  }

  Future<List<CommunityReview>> getCommunityReviews() async {
    final data = await client.get('/api/vendor-reviews') as Map;
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
    );
  }

  Future<AuthResult> login(String email, String password) async =>
      _auth(await client.post('/api/auth/login', body: {'email': email, 'password': password}));

  Future<AuthResult> register(String name, String email, String password) async => _auth(
        await client.post('/api/auth/register', body: {'name': name, 'email': email, 'password': password}),
      );

  Future<AppUser> me() async {
    final data = await client.get('/api/auth/me', timeout: const Duration(seconds: 50)) as Map;
    return AppUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<AppUser> updateProfile({required String name, required String email, String? phone}) async {
    final data = await client.put('/api/auth/profile', body: {'name': name, 'email': email, 'phone': phone ?? ''}) as Map;
    return AppUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<void> changePassword(String current, String next) =>
      client.put('/api/auth/password', body: {'current_password': current, 'new_password': next});

  Future<void> setNotificationsEnabled(bool enabled) =>
      client.put('/api/auth/notifications-preference', body: {'enabled': enabled});

  Future<void> deleteAccount() => client.delete('/api/auth/account');

  Future<List<Submission>> mySubmissions() async {
    final data = await client.get('/api/user/submissions') as Map;
    return _list(data['submissions']).map(Submission.fromJson).toList();
  }

  Future<List<MyReview>> myReviews() async {
    final data = await client.get('/api/user/reviews') as Map;
    return _list(data['reviews']).map(MyReview.fromJson).toList();
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
