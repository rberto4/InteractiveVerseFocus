class Location {
  final double latitude;
  final double longitude;
  final bool? isVisible;
  final bool? isActive;

  Location(this.isVisible, this.isActive, {required this.latitude, required this.longitude});

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      json['isVisible'],
      json['isActive'],
      latitude: json['latitude'],
      longitude: json['longitude'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'isVisible': isVisible,
      'isActive': isActive,
    };
  }
}