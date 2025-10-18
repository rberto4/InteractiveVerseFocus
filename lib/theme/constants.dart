class AppConstants {
  // App Info
  static const String appName = 'Luma';
  static const String appTagline = 'Connect with hearts nearby';
  
  // Geolocation
  static const double defaultRadius = 500.0; // meters
  static const double nearbyThreshold = 20.0; // meters
  static const double locationUpdateDistance = 50.0; // meters
  
  // Chat
  static const int maxMessageLength = 500;
  static const String defaultChatPlaceholder = 'Share your thoughts...';
  
  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 400);
  static const Duration longAnimation = Duration(milliseconds: 600);
  static const Duration slowAnimation = Duration(milliseconds: 800);
  static const Duration pulseDuration = Duration(milliseconds: 1000);
  
  // Spacing
  static const double paddingXS = 4.0;
  static const double paddingS = 8.0;
  static const double paddingM = 16.0;
  static const double paddingL = 24.0;
  static const double paddingXL = 32.0;
  static const double paddingXXL = 48.0;
  
  // Border Radius
  static const double radiusS = 8.0;
  static const double radiusM = 12.0;
  static const double radiusL = 16.0;
  static const double radiusXL = 24.0;
  static const double radiusCircle = 50.0;
  
  // Icon Sizes
  static const double iconXS = 16.0;
  static const double iconS = 20.0;
  static const double iconM = 24.0;
  static const double iconL = 32.0;
  static const double iconXL = 48.0;
  
  // Empathetic Messages
  static const List<String> connectionMessages = [
    'Someone new is nearby! 💫',
    'A friendly face is close! ✨',
    'New connections await! 🌟',
    'Hearts are gathering! 💝',
  ];
  
  static const List<String> emptyStateMessages = [
    'No one nearby right now, but stay hopeful! 🌈',
    'Your community is growing, check back soon! 🌱',
    'Great connections are on their way! ⭐',
    'The perfect moment for new friendships is coming! 🦋',
  ];
  
  static const List<String> locationMessages = [
    'Share your location to find amazing people! 📍',
    'Let others discover your wonderful presence! 🎯',
    'Your location helps build beautiful connections! 🗺️',
    'Be discoverable and meet incredible souls! 💎',
  ];
  
  // Error Messages (Empathetic)
  static const String locationError = 'We need location access to help you connect with others nearby 💕';
  static const String networkError = 'Having trouble connecting. Your patience means everything! 🙏';
  static const String authError = 'Let\'s try signing in again. You\'re almost there! 💪';
  static const String generalError = 'Something unexpected happened, but we\'re here to help! 🤗';
}