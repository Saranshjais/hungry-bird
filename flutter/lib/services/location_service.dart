import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

enum LocationStatus { unknown, granted, denied, deniedForever, serviceDisabled, unavailable }

/// Wraps geolocator permission handling and remembers the last fix.
class LocationProvider extends ChangeNotifier {
  Position? _position;
  LocationStatus _status = LocationStatus.unknown;
  bool _busy = false;

  Position? get position => _position;
  LocationStatus get status => _status;
  bool get busy => _busy;
  bool get hasFix => _position != null;

  String get message => switch (_status) {
        LocationStatus.serviceDisabled => 'Location services are turned off. Enable them to see stalls near you.',
        LocationStatus.denied => 'Location permission was denied.',
        LocationStatus.deniedForever => 'Location is blocked for HungryBird. Allow it from your phone settings.',
        LocationStatus.unavailable => 'We could not get your location right now.',
        _ => '',
      };

  /// Checks permission silently (never prompts) and grabs a fix if already allowed.
  Future<void> refreshIfPermitted() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        await locate(prompt: false);
      }
    } catch (_) {
      // Platform without location support.
    }
  }

  /// Returns the current position, prompting for permission when [prompt] is true.
  Future<Position?> locate({bool prompt = true}) async {
    if (_busy) return _position;
    _busy = true;
    notifyListeners();
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _status = LocationStatus.serviceDisabled;
        return null;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && prompt) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        _status = LocationStatus.denied;
        return null;
      }
      if (permission == LocationPermission.deniedForever) {
        _status = LocationStatus.deniedForever;
        return null;
      }
      _position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      ).catchError((_) async => (await Geolocator.getLastKnownPosition())!);
      _status = LocationStatus.granted;
      return _position;
    } catch (_) {
      _status = LocationStatus.unavailable;
      return null;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> openSettings() async {
    if (_status == LocationStatus.serviceDisabled) {
      await Geolocator.openLocationSettings();
    } else {
      await Geolocator.openAppSettings();
    }
  }
}
