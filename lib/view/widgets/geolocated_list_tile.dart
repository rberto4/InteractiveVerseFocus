import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:luma/providers/location_provider.dart';
import 'package:luma/providers/chat_provider.dart';
import 'package:luma/models/user.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';
import 'package:luma/view/screens/chat/chat.dart';
import 'package:luma/view/widgets/empathy_components.dart';

class GeolocatedListTile extends StatefulWidget {
  final User? user;
  final Position currentPosition;
  const GeolocatedListTile({super.key, this.user, required this.currentPosition});

  @override
  State<GeolocatedListTile> createState() => _GeolocatedListTileState();
}

class _GeolocatedListTileState extends State<GeolocatedListTile> with TickerProviderStateMixin {
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: AppConstants.mediumAnimation,
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));
    
    _slideController.forward();
    
    // Check for unread messages asynchronously without triggering immediate rebuilds
    if (widget.user != null) {
      _checkUnreadMessagesAsync();
    }
  }
  
  // Async method to check unread messages without triggering build conflicts
  void _checkUnreadMessagesAsync() async {
    if (mounted && widget.user != null) {
      await context.read<ChatProvider>().checkUnreadMessages(widget.user!.id);
      // The UI will be updated naturally on the next build cycle
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.user == null) return const SizedBox.shrink();
    
    final locationProvider = context.watch<LocationProvider>();
    final chatProvider = context.watch<ChatProvider>();
    final distanceText = locationProvider.getFriendlyDistance(widget.user!);
    final hasUnread = chatProvider.hasUnreadMessages(widget.user!.id);

    return SlideTransition(
      position: _slideAnimation,
      child: ConnectionCard(
        isHighlighted: hasUnread,
        onTap: () => _openChat(context),
        child: Row(
          children: [
            // Avatar with online indicator
            Stack(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: AppColors.coolGradient,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.person,
                    color: Colors.white,
                    size: AppConstants.iconL,
                  ),
                ),
                // Online indicator
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppColors.onlineIndicator,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(width: AppConstants.paddingM),
            
            // User info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.user!.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (hasUnread)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppConstants.paddingS,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.unreadBadge,
                            borderRadius: BorderRadius.circular(AppConstants.radiusS),
                          ),
                          child: const Text(
                            'New',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: AppConstants.iconXS,
                        color: AppColors.textTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        distanceText,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Chat button with animation
            UnreadBadge(
              hasUnread: hasUnread,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: hasUnread ? AppColors.primaryGradient : null,
                  color: hasUnread ? null : AppColors.surfaceVariant,
                  shape: BoxShape.circle,
                  boxShadow: hasUnread
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: IconButton(
                  onPressed: () => _openChat(context),
                  icon: Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: hasUnread ? Colors.white : AppColors.textSecondary,
                    size: AppConstants.iconS,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openChat(BuildContext context) {
    // Mark as read when opening chat
    context.read<ChatProvider>().markChatAsRead(widget.user!.id);
    
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => 
            ChatScreen(otherUser: widget.user!),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(1.0, 0.0);
          const end = Offset.zero;
          const curve = Curves.easeInOutCubic;

          var tween = Tween(begin: begin, end: end).chain(
            CurveTween(curve: curve),
          );

          return SlideTransition(
            position: animation.drive(tween),
            child: child,
          );
        },
        transitionDuration: AppConstants.mediumAnimation,
      ),
    );
  }
}