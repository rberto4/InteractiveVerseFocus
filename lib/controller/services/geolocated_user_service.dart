import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import 'package:luma/models/location.dart';
import 'package:luma/models/user.dart';

class GeolocatedUserService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  StreamSubscription<Position>? _positionStream;

  Future<void> updateUserLocation(String userId, Location location) async {
    await _firestore.collection('users').doc(userId).update({
      'location': location.toJson(),
    });
  }

  Stream<List<User>> getNearbyActiveUsers(double myLat, double myLng, double radiusMeters, String currentUserId) {
    return _firestore.collection('users').where('location.isActive', isEqualTo: true).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => User.fromJson(doc.data())).where((user) {
        if (user.location == null || user.id == currentUserId) return false;
        double distance = Geolocator.distanceBetween(myLat, myLng, user.location!.latitude, user.location!.longitude);
        return distance <= radiusMeters;
      }).toList();
    });
  }

  Future<Position> determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Location permissions are denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return Future.error('Location permissions are permanently denied, we cannot request permissions.');
    }

    return await Geolocator.getCurrentPosition();
  }

  void startLocationUpdates(String userId, Function(Position) onPositionUpdate) {
    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50, // Aggiorna ogni 50 metri di spostamento
    );

    _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen((Position position) {
      Location loc = Location(true, true, latitude: position.latitude, longitude: position.longitude);
      updateUserLocation(userId, loc);
      onPositionUpdate(position); // Chiama callback per aggiornare UI
    });
  }

  void stopLocationUpdates() {
    _positionStream?.cancel();
    _positionStream = null;
  }
}