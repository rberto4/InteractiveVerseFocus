import 'package:luma/models/location.dart';

class User {
  final String id;
  final String name;
  final String email;
  final String password;
  final Location? location;

  User( {
    required this.id,
    required this.name,
    required this.email,
    required this.password,
    this.location
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      location: json['location'] != null
          ? Location.fromJson(json['location'])
          : null, 
      id: json['id'],
      name: json['name'],
      email: json['email'],
      password: json['password'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'password': password,
      'location': location?.toJson(),
    };
  }
}