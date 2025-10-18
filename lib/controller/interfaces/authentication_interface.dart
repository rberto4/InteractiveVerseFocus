import 'package:luma/models/user.dart';

abstract class AuthenticationInterface {
  Future<void> login(User user);
  Future<void> logout();
  Future<void> register(User user);
  Future<User?> getCurrentUser();
  Future<void> deleteAccount();
  Future<void> updateUser(User user);
}