import 'package:flutter/material.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';

class EmpathyButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final ButtonStyle? style;
  final Widget? icon;
  final double? width;
  final double? height;

  const EmpathyButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.style,
    this.icon,
    this.width,
    this.height = 56,
  });

  @override
  State<EmpathyButton> createState() => _EmpathyButtonState();
}

class _EmpathyButtonState extends State<EmpathyButton> with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: AppConstants.shortAnimation,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _scaleController.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _scaleController.reverse();
  }

  void _onTapCancel() {
    _scaleController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.onPressed != null ? _onTapDown : null,
      onTapUp: widget.onPressed != null ? _onTapUp : null,
      onTapCancel: widget.onPressed != null ? _onTapCancel : null,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Container(
              width: widget.width,
              height: widget.height,
              decoration: BoxDecoration(
                gradient: widget.onPressed != null
                    ? AppColors.primaryGradient
                    : LinearGradient(
                        colors: [
                          AppColors.primary.withOpacity(0.5),
                          AppColors.primaryLight.withOpacity(0.5),
                        ],
                      ),
                borderRadius: BorderRadius.circular(AppConstants.radiusM),
                boxShadow: widget.onPressed != null
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ]
                    : null,
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.isLoading ? null : widget.onPressed,
                  borderRadius: BorderRadius.circular(AppConstants.radiusM),
                  child: Center(
                    child: widget.isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              strokeWidth: 2,
                            ),
                          )
                        : Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (widget.icon != null) ...[
                                widget.icon!,
                                const SizedBox(width: AppConstants.paddingS),
                              ],
                              Text(
                                widget.text,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class HeartIcon extends StatefulWidget {
  final double size;
  final Color? color;
  final bool isAnimated;

  const HeartIcon({
    super.key,
    this.size = AppConstants.iconM,
    this.color,
    this.isAnimated = false,
  });

  @override
  State<HeartIcon> createState() => _HeartIconState();
}

class _HeartIconState extends State<HeartIcon> with TickerProviderStateMixin {
  late AnimationController _heartController;
  late Animation<double> _heartAnimation;

  @override
  void initState() {
    super.initState();
    _heartController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _heartAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _heartController, curve: Curves.elasticOut),
    );

    if (widget.isAnimated) {
      _heartController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _heartController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _heartAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: widget.isAnimated ? _heartAnimation.value : 1.0,
          child: Icon(
            Icons.favorite,
            size: widget.size,
            color: widget.color ?? AppColors.heart,
          ),
        );
      },
    );
  }
}

class ConnectionCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final bool isHighlighted;

  const ConnectionCard({
    super.key,
    required this.child,
    this.onTap,
    this.isHighlighted = false,
  });

  @override
  State<ConnectionCard> createState() => _ConnectionCardState();
}

class _ConnectionCardState extends State<ConnectionCard> with TickerProviderStateMixin {
  late AnimationController _hoverController;
  late Animation<double> _elevationAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _hoverController = AnimationController(
      duration: AppConstants.shortAnimation,
      vsync: this,
    );
    _elevationAnimation = Tween<double>(begin: 2.0, end: 8.0).animate(
      CurvedAnimation(parent: _hoverController, curve: Curves.easeOut),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.02).animate(
      CurvedAnimation(parent: _hoverController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _hoverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _hoverController,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            margin: const EdgeInsets.symmetric(
              horizontal: AppConstants.paddingM,
              vertical: AppConstants.paddingS,
            ),
            decoration: BoxDecoration(
              color: widget.isHighlighted ? AppColors.primaryLight.withOpacity(0.1) : AppColors.background,
              borderRadius: BorderRadius.circular(AppConstants.radiusM),
              border: widget.isHighlighted
                  ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 2)
                  : null,
              boxShadow: [
                BoxShadow(
                  color: AppColors.textPrimary.withOpacity(0.08),
                  blurRadius: _elevationAnimation.value,
                  offset: Offset(0, _elevationAnimation.value / 2),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: widget.onTap,
                onHover: (isHovering) {
                  if (isHovering) {
                    _hoverController.forward();
                  } else {
                    _hoverController.reverse();
                  }
                },
                borderRadius: BorderRadius.circular(AppConstants.radiusM),
                child: Padding(
                  padding: const EdgeInsets.all(AppConstants.paddingM),
                  child: widget.child,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class UnreadBadge extends StatefulWidget {
  final bool hasUnread;
  final Widget child;

  const UnreadBadge({
    super.key,
    required this.hasUnread,
    required this.child,
  });

  @override
  State<UnreadBadge> createState() => _UnreadBadgeState();
}

class _UnreadBadgeState extends State<UnreadBadge> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    if (widget.hasUnread) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(UnreadBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hasUnread && !oldWidget.hasUnread) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.hasUnread && oldWidget.hasUnread) {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (widget.hasUnread)
          Positioned(
            right: 0,
            top: 0,
            child: AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: AppColors.unreadBadge,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}