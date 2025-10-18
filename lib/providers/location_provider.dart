import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:luma/controller/services/geolocated_user_service.dart';
import 'package:luma/models/location.dart';
import 'package:luma/models/user.dart';
import 'package:luma/theme/constants.dart';

class LocationProvider extends ChangeNotifier {
  final GeolocatedUserService _geoService = GeolocatedUserService();
  
  // State variables
  Position? _currentPosition;
  bool _isLocationActive = false;
  bool _isLoading = false;
  bool _hasLocationPermission = false;
  List<User> _nearbyUsers = [];
  StreamSubscription<List<User>>? _nearbyUsersSubscription;
  String? _currentUserId;
  String? _errorMessage;
  
  // Getters
  Position? get currentPosition => _currentPosition;
  bool get isLocationActive => _isLocationActive;
  bool get isLoading => _isLoading;
  bool get hasLocationPermission => _hasLocationPermission;
  List<User> get nearbyUsers => _nearbyUsers;
  String? get errorMessage => _errorMessage;
  int get nearbyUsersCount => _nearbyUsers.length;
  
  // Clear error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Initialize location state
  Future<void> initializeLocation(String userId) async {
    _currentUserId = userId;
    _setLoading(true);
    
    try {
      // Check permission first
      _hasLocationPermission = await _checkLocationPermission();
      
      if (_hasLocationPermission) {
        // Try to get current position
        _currentPosition = await _geoService.determinePosition();
        _errorMessage = null;
      }
    } catch (e) {
      _errorMessage = AppConstants.locationError;
      _hasLocationPermission = false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Start location sharing
  Future<bool> startLocationSharing() async {
    if (_currentUserId == null) return false;
    
    _setLoading(true);
    try {
      // Get current position
      _currentPosition = await _geoService.determinePosition();
      
      // Create location object
      final location = Location(
        true, // isActive
        true, // isVisible
        latitude: _currentPosition!.latitude,
        longitude: _currentPosition!.longitude,
      );
      
      // Update user location in Firestore
      await _geoService.updateUserLocation(_currentUserId!, location);
      
      // Start location updates
      _geoService.startLocationUpdates(_currentUserId!, (Position position) {
        _currentPosition = position;
        notifyListeners();
      });
      
      // Start listening for nearby users
      _startNearbyUsersStream();
      
      _isLocationActive = true;
      _errorMessage = null;
      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = 'Failed to start location sharing: ${_getHumanReadableError(e.toString())}';
      _isLocationActive = false;
      _setLoading(false);
      return false;
    }
  }
  
  // Stop location sharing
  Future<void> stopLocationSharing() async {
    if (_currentUserId == null) return;
    
    _setLoading(true);
    try {
      // Stop location updates
      _geoService.stopLocationUpdates();
      
      // Stop nearby users stream
      _nearbyUsersSubscription?.cancel();
      _nearbyUsersSubscription = null;
      
      // Update Firestore to mark location as inactive
      final location = Location(
        false, // isActive
        false, // isVisible
        latitude: _currentPosition?.latitude ?? 0,
        longitude: _currentPosition?.longitude ?? 0,
      );
      
      await _geoService.updateUserLocation(_currentUserId!, location);
      
      _isLocationActive = false;
      _nearbyUsers.clear();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to stop location sharing: $e';
    } finally {
      _setLoading(false);
    }
  }
  
  // Toggle location sharing
  Future<bool> toggleLocationSharing() async {
    if (_isLocationActive) {
      await stopLocationSharing();
      return false;
    } else {
      return await startLocationSharing();
    }
  }
  
  // Request location permission
  Future<bool> requestLocationPermission() async {
    try {
      _currentPosition = await _geoService.determinePosition();
      _hasLocationPermission = true;
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (e) {
      _hasLocationPermission = false;
      _errorMessage = AppConstants.locationError;
      notifyListeners();
      return false;
    }
  }
  
  // Get distance to user
  double getDistanceToUser(User user) {
    if (_currentPosition == null || user.location == null) return 0;
    
    return Geolocator.distanceBetween(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      user.location!.latitude,
      user.location!.longitude,
    );
  }
  
  // Get friendly distance string
  String getFriendlyDistance(User user) {
    final distance = getDistanceToUser(user);
    
    if (user.location?.isVisible == false) return 'nelle vicinanze 💫';
    if (distance < 20) return 'molto vicino ✨';
    if (distance < 50) return 'vicinissimo 🌟';
    if (distance < 100) return 'vicino 💝';
    if (distance < 200) return 'nelle vicinanze 🦋';
    if (distance < 500) return 'in zona 💎';
    return 'nelle vicinanze 🌈';
  }
  
  // Private methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  Future<bool> _checkLocationPermission() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return false;
      
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      return permission != LocationPermission.denied && 
             permission != LocationPermission.deniedForever;
    } catch (e) {
      return false;
    }
  }
  
  void _startNearbyUsersStream() {
    if (_currentPosition == null || _currentUserId == null) return;
    
    _nearbyUsersSubscription = _geoService.getNearbyActiveUsers(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      AppConstants.defaultRadius,
      _currentUserId!,
    ).listen(
      (users) {
        _nearbyUsers = users;
        notifyListeners();
      },
      onError: (error) {
        _errorMessage = 'Error loading nearby users: $error';
        notifyListeners();
      },
    );
  }
  
  String _getHumanReadableError(String error) {
    if (error.contains('location')) {
      return AppConstants.locationError;
    } else if (error.contains('permission')) {
      return 'We need location permission to help you connect 💕';
    } else if (error.contains('network')) {
      return AppConstants.networkError;
    } else {
      return AppConstants.generalError;
    }
  }
  
  @override
  void dispose() {
    _nearbyUsersSubscription?.cancel();
    _geoService.stopLocationUpdates();
    super.dispose();
  }
}