import 'package:flutter/material.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';

class LocationToggle extends StatefulWidget {
  final bool isActive;
  final bool isLoading;
  final VoidCallback? onToggle;
  final String? locationMessage;

  const LocationToggle({
    super.key,
    required this.isActive,
    this.isLoading = false,
    this.onToggle,
    this.locationMessage,
  });

  @override
  State<LocationToggle> createState() => _LocationToggleState();
}

class _LocationToggleState extends State<LocationToggle> with TickerProviderStateMixin {
  late AnimationController _radarController;
  late AnimationController _pulseController;
  late AnimationController _heartController;
  
  late Animation<double> _radarAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<double> _heartAnimation;

  @override
  void initState() {
    super.initState();
    
    // Radar waves animation
    _radarController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _radarAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _radarController, curve: Curves.easeOut),
    );
    
    // Pulse animation
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    
    // Heart animation
    _heartController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _heartAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _heartController, curve: Curves.elasticOut),
    );
    
    if (widget.isActive) {
      _startAnimations();
    }
  }

  @override
  void didUpdateWidget(LocationToggle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _startAnimations();
    } else if (!widget.isActive && oldWidget.isActive) {
      _stopAnimations();
    }
  }

  void _startAnimations() {
    _radarController.repeat();
    _pulseController.repeat(reverse: true);
    _heartController.repeat(reverse: true);
  }

  void _stopAnimations() {
    _radarController.stop();
    _pulseController.stop();
    _heartController.stop();
    _radarController.reset();
    _pulseController.reset();
    _heartController.reset();
  }

  @override
  void dispose() {
    _radarController.dispose();
    _pulseController.dispose();
    _heartController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Main toggle button with animations
        GestureDetector(
          onTap: widget.isLoading ? null : widget.onToggle,
          child: Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: widget.isActive
                  ? AppColors.primaryGradient
                  : LinearGradient(
                      colors: [
                        AppColors.surfaceVariant,
                        AppColors.surface,
                      ],
                    ),
              boxShadow: [
                BoxShadow(
                  color: widget.isActive
                      ? AppColors.primary.withOpacity(0.3)
                      : Colors.black.withOpacity(0.1),
                  blurRadius: widget.isActive ? 20 : 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Radar waves (only when active)
                if (widget.isActive) ...[
                  AnimatedBuilder(
                    animation: _radarAnimation,
                    builder: (context, child) {
                      return CustomPaint(
                        size: const Size(160, 160),
                        painter: RadarPainter(
                          animationValue: _radarAnimation.value,
                          color: Colors.white.withOpacity(0.3),
                        ),
                      );
                    },
                  ),
                ],
                
                // Central content
                AnimatedBuilder(
                  animation: widget.isActive ? _pulseAnimation : 
                             const AlwaysStoppedAnimation(1.0),
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _pulseAnimation.value,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: widget.isLoading
                            ? const CircularProgressIndicator(
                                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                              )
                            : AnimatedBuilder(
                                animation: widget.isActive ? _heartAnimation : 
                                           const AlwaysStoppedAnimation(1.0),
                                builder: (context, child) {
                                  return Transform.scale(
                                    scale: _heartAnimation.value,
                                    child: Icon(
                                      widget.isActive ? Icons.favorite : Icons.favorite_border,
                                      size: 36,
                                      color: widget.isActive ? AppColors.heart : AppColors.textTertiary,
                                    ),
                                  );
                                },
                              ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: AppConstants.paddingL),
        
        // Status text
        AnimatedSwitcher(
          duration: AppConstants.shortAnimation,
          child: Text(
            widget.isActive 
                ? '💕 You\'re sharing love!'
                : '🤍 Tap to connect with hearts nearby',
            key: ValueKey(widget.isActive),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: widget.isActive ? AppColors.primary : AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        
        if (widget.locationMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: AppConstants.paddingS),
            child: Text(
              widget.locationMessage!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textTertiary,
              ),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }
}

class RadarPainter extends CustomPainter {
  final double animationValue;
  final Color color;

  RadarPainter({
    required this.animationValue,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;
    
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    // Draw multiple radar circles
    for (int i = 0; i < 3; i++) {
      final delay = i * 0.3;
      final adjustedValue = (animationValue - delay).clamp(0.0, 1.0);
      
      if (adjustedValue > 0) {
        final radius = maxRadius * adjustedValue;
        final opacity = (1.0 - adjustedValue) * 0.8;
        
        paint.color = color.withOpacity(opacity);
        canvas.drawCircle(center, radius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(RadarPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}