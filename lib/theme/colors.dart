import 'package:flutter/material.dart';

class AppColors {
  // Primary colors - warm and welcoming
  static const Color primary = Color(0xFF6C63FF); // Soft purple
  static const Color primaryLight = Color(0xFF9A8FFF);
  static const Color primaryDark = Color(0xFF4338CA);
  
  // Secondary colors - warm and friendly
  static const Color secondary = Color(0xFFFF6B6B); // Coral red
  static const Color secondaryLight = Color(0xFFFFB3B3);
  static const Color secondaryDark = Color(0xFFE53E3E);
  
  // Accent colors - energetic and positive
  static const Color accent = Color(0xFF4ECDC4); // Turquoise
  static const Color accentLight = Color(0xFF9FEDD7);
  static const Color accentDark = Color(0xFF319795);
  
  // Neutral colors - calm and peaceful
  static const Color background = Color(0xFFFFFFFE);
  static const Color surface = Color(0xFFF7FAFC);
  static const Color surfaceVariant = Color(0xFFEDF2F7);
  
  // Text colors - readable and friendly
  static const Color textPrimary = Color(0xFF2D3748);
  static const Color textSecondary = Color(0xFF4A5568);
  static const Color textTertiary = Color(0xFF718096);
  static const Color textInverse = Color(0xFFFFFFFF);
  
  // Semantic colors - clear and reassuring
  static const Color success = Color(0xFF48BB78);
  static const Color warning = Color(0xFFED8936);
  static const Color error = Color(0xFFE53E3E);
  static const Color info = Color(0xFF3182CE);
  
  // Chat colors - warm and personal
  static const Color myMessage = Color(0xFF6C63FF);
  static const Color otherMessage = Color(0xFFE2E8F0);
  static const Color onlineIndicator = Color(0xFF48BB78);
  static const Color unreadBadge = Color(0xFFFF6B6B);
  
  // Special colors - magical and empathetic
  static const Color heart = Color(0xFFFF69B4);
  static const Color sunshine = Color(0xFFFFD700);
  static const Color sky = Color(0xFF87CEEB);
  
  // Gradients for beautiful backgrounds
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, primaryLight],
  );
  
  static const LinearGradient warmGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF9A9E), Color(0xFFFECFEF)],
  );
  
  static const LinearGradient coolGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFA8EDEA), Color(0xFFFED6E3)],
  );
}