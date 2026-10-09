import 'package:intl/intl.dart';

class Fmt {
  Fmt._();

  static String rating(double? value) {
    if (value == null) return '–';
    return value.toStringAsFixed(1);
  }

  static String count(int value) {
    if (value >= 1000) {
      final k = value / 1000;
      return '${k.toStringAsFixed(k >= 10 ? 0 : 1)}k';
    }
    return '$value';
  }

  static String distance(double? km) {
    if (km == null) return '';
    if (km < 1) return '${(km * 1000).round()} m';
    return '${km.toStringAsFixed(km < 10 ? 1 : 0)} km';
  }

  static String timeAgo(DateTime? date, {DateTime? now}) {
    if (date == null) return '';
    final diff = (now ?? DateTime.now()).difference(date.toLocal());
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} h ago';
    if (diff.inDays < 7) return '${diff.inDays} d ago';
    return DateFormat('d MMM yyyy').format(date.toLocal());
  }

  static String date(DateTime? date) =>
      date == null ? '' : DateFormat('d MMM yyyy').format(date.toLocal());

  static String priceRange(double? min, double? max) {
    final f = NumberFormat.decimalPattern('en_IN');
    if (min != null && max != null && max > min) return '₹${f.format(min.round())} – ₹${f.format(max.round())}';
    if (min != null) return 'From ₹${f.format(min.round())}';
    if (max != null) return 'Up to ₹${f.format(max.round())}';
    return '';
  }

  /// Backend timestamps are naive UTC ISO strings.
  static DateTime? parseDate(Object? value) {
    if (value is! String || value.isEmpty) return null;
    final hasZone = value.endsWith('Z') || RegExp(r'[+-]\d\d:\d\d$').hasMatch(value);
    return DateTime.tryParse(hasZone ? value : '${value}Z');
  }

  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  /// Compares dotted version strings ("1.2.10" > "1.2.9").
  static int compareVersions(String a, String b) {
    List<int> parse(String v) => v.split(RegExp(r'[.+-]')).map((p) => int.tryParse(p) ?? 0).toList();
    final pa = parse(a), pb = parse(b);
    for (var i = 0; i < 3; i++) {
      final x = i < pa.length ? pa[i] : 0;
      final y = i < pb.length ? pb[i] : 0;
      if (x != y) return x.compareTo(y);
    }
    return 0;
  }
}

/// Safe JSON readers — the backend mixes ints/floats/strings for numbers.
double? asDouble(Object? v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

int asInt(Object? v, [int fallback = 0]) {
  if (v == null) return fallback;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? fallback;
}

String? asString(Object? v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty ? null : s;
}

bool asBool(Object? v) {
  if (v is bool) return v;
  if (v is num) return v != 0;
  return const {'true', '1', 'yes'}.contains(v?.toString().toLowerCase());
}
