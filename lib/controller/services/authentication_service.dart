import 'package:luma/controller/interfaces/authentication_interface.dart';
import 'package:luma/models/user.dart';
import 'package:firebase_auth/firebase_auth.dart' as auth;
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthenticationService implements AuthenticationInterface {

  // instance of FirebaseAuth
  final auth.FirebaseAuth _auth = auth.FirebaseAuth.instance;
  
  @override
  Future<void> login(User user) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: user.email,
        password: user.password,
      );
    } catch (e) {
      print('Login error: $e');
      throw Exception('Login failed: $e');
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _auth.signOut();
    } catch (e) {
      throw Exception('Logout failed: $e');
    }
  }

  @override
  Future<void> register(User user) async {
    try {
      auth.UserCredential userCredential = await _auth.createUserWithEmailAndPassword(
        email: user.email,
        password: user.password,
      );
      await userCredential.user?.updateDisplayName(user.name);
      
      // Save user data to Firestore
      await FirebaseFirestore.instance.collection('users').doc(userCredential.user!.uid).set({
        'id': userCredential.user!.uid,
        'name': user.name,
        'email': user.email,
        'location': user.location?.toJson() ?? {},
      });
    } catch (e) {
      throw Exception('Registration failed: $e');
    }
  }

  @override
  Future<void> deleteAccount() async {
    try {
      auth.User? currentUser = _auth.currentUser;
      if (currentUser != null) {
        // Elimina da Firestore
        await FirebaseFirestore.instance.collection('users').doc(currentUser.uid).delete();
        // Elimina da Auth
        await currentUser.delete();
      }
    } catch (e) {
      throw Exception('Delete account failed: $e');
    }
  }

  @override
  Future<User?> getCurrentUser() async {
    try {
      auth.User? firebaseUser = _auth.currentUser;
      if (firebaseUser != null) {
        return User(
          id: firebaseUser.uid,
          name: firebaseUser.displayName ?? '',
          email: firebaseUser.email ?? '',
          password: '', // Password not retrievable
        );
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get current user: $e');
    }
  }
  
  @override
  Future<void> updateUser(User user) async {
    try {
      auth.User? firebaseUser = _auth.currentUser;
      if (firebaseUser != null) {
        await FirebaseFirestore.instance.collection('users').doc(firebaseUser.uid).update({
          'name': user.name,
          'email': user.email,
          'location': user.location?.toJson() ?? {},
        });
      }
    } catch (e) {
      throw Exception('Update user failed: $e');
    }
  }

}