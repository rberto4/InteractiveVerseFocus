import 'package:flutter/material.dart';
import 'package:luma/controller/services/authentication_service.dart';
import 'package:luma/models/user.dart';

class AuthProvider extends ChangeNotifier {
  final AuthenticationService _authService = AuthenticationService();
  
  User? _currentUser;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _errorMessage;
  
  // Getters
  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get errorMessage => _errorMessage;
  
  // Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Initialize authentication state
  Future<void> initializeAuth() async {
    _setLoading(true);
    try {
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = _currentUser != null;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to initialize authentication: $e';
      _isAuthenticated = false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Login
  Future<bool> login(String email, String password) async {
    _setLoading(true);
    try {
      final user = User(
        id: '',
        name: '',
        email: email,
        password: password,
      );
      
      await _authService.login(user);
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _errorMessage = null;
      
      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = _getHumanReadableError(e.toString());
      _isAuthenticated = false;
      _setLoading(false);
      return false;
    }
  }
  
  // Register
  Future<bool> register(String name, String email, String password) async {
    _setLoading(true);
    try {
      final user = User(
        id: '',
        name: name,
        email: email,
        password: password,
      );
      
      await _authService.register(user);
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _errorMessage = null;
      
      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = _getHumanReadableError(e.toString());
      _isAuthenticated = false;
      _setLoading(false);
      return false;
    }
  }
  
  // Logout
  Future<void> logout() async {
    _setLoading(true);
    try {
      await _authService.logout();
      _currentUser = null;
      _isAuthenticated = false;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to logout: $e';
    } finally {
      _setLoading(false);
    }
  }
  
  // Update user
  Future<bool> updateUser(User user) async {
    _setLoading(true);
    try {
      await _authService.updateUser(user);
      _currentUser = user;
      _errorMessage = null;
      
      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = 'Failed to update profile: $e';
      _setLoading(false);
      return false;
    }
  }
  
  // Delete account
  Future<bool> deleteAccount() async {
    _setLoading(true);
    try {
      await _authService.deleteAccount();
      _currentUser = null;
      _isAuthenticated = false;
      _errorMessage = null;
      
      _setLoading(false);
      return true;
    } catch (e) {
      _errorMessage = 'Failed to delete account: $e';
      _setLoading(false);
      return false;
    }
  }
  
  // Private methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  String _getHumanReadableError(String error) {
    if (error.contains('user-not-found')) {
      return 'No account found with this email address 😔';
    } else if (error.contains('wrong-password')) {
      return 'Incorrect password. Let\'s try again! 💪';
    } else if (error.contains('email-already-in-use')) {
      return 'This email is already registered. Try logging in instead! 😊';
    } else if (error.contains('weak-password')) {
      return 'Please choose a stronger password for better security 🔒';
    } else if (error.contains('invalid-email')) {
      return 'Please enter a valid email address 📧';
    } else if (error.contains('network')) {
      return 'Connection issues. Check your internet and try again! 🌐';
    } else {
      return 'Something unexpected happened, but we\'re here to help! 🤗';
    }
  }
}