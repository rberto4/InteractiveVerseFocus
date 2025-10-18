import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:luma/providers/location_provider.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';
import 'package:luma/view/widgets/location_toggle.dart';
import 'package:luma/view/widgets/geolocated_list_tile.dart';
import 'package:luma/view/widgets/empathy_components.dart';

class TabMap extends StatefulWidget {
  const TabMap({super.key});

  @override
  State<TabMap> createState() => _TabMapState();
}

class _TabMapState extends State<TabMap> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: AppConstants.mediumAnimation,
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeInOut),
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFF8FAFC),
            Color(0xFFFFFFFF),
          ],
        ),
      ),
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SafeArea(
          child: Consumer<LocationProvider>(
            builder: (context, locationProvider, child) {
              return Padding(
                padding: const EdgeInsets.all(AppConstants.paddingL),
                child: Column(
                  children: [
                    // Header with heart
                    Container(
                      padding: const EdgeInsets.all(AppConstants.paddingL),
                      child: Column(
                        children: [
                          HeartIcon(
                            size: AppConstants.iconL,
                            isAnimated: locationProvider.isLocationActive,
                          ),
                          const SizedBox(height: AppConstants.paddingM),
                          Text(
                            locationProvider.isLocationActive
                                ? 'Connecting Hearts 💕'
                                : 'Ready to Connect? 🤍',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: AppConstants.paddingS),
                          Text(
                            locationProvider.isLocationActive
                                ? 'You\'re discoverable by wonderful people nearby!'
                                : 'Share your location to find amazing souls around you',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppConstants.paddingL),

                    // Location Toggle
                    LocationToggle(
                      isActive: locationProvider.isLocationActive,
                      isLoading: locationProvider.isLoading,
                      onToggle: () => _toggleLocation(context),
                      locationMessage: _getLocationMessage(locationProvider),
                    ),

                    const SizedBox(height: AppConstants.paddingXL),

                    // Nearby users section
                    if (locationProvider.isLocationActive)
                      Expanded(
                        child: Column(
                          children: [
                            // Section header
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(AppConstants.paddingS),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(AppConstants.radiusS),
                                  ),
                                  child: const Icon(
                                    Icons.people,
                                    color: AppColors.primary,
                                    size: AppConstants.iconS,
                                  ),
                                ),
                                const SizedBox(width: AppConstants.paddingS),
                                Text(
                                  'Hearts Nearby',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: AppConstants.paddingS,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.accent,
                                    borderRadius: BorderRadius.circular(AppConstants.radiusS),
                                  ),
                                  child: Text(
                                    '${locationProvider.nearbyUsersCount}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: AppConstants.paddingM),

                            // Users list
                            Expanded(
                              child: _buildNearbyUsersList(locationProvider),
                            ),
                          ],
                        ),
                      ),

                    // Error message
                    if (locationProvider.errorMessage != null)
                      Container(
                        margin: const EdgeInsets.only(top: AppConstants.paddingM),
                        padding: const EdgeInsets.all(AppConstants.paddingM),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(AppConstants.radiusM),
                          border: Border.all(color: AppColors.error.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: AppColors.error),
                            const SizedBox(width: AppConstants.paddingS),
                            Expanded(
                              child: Text(
                                locationProvider.errorMessage!,
                                style: const TextStyle(color: AppColors.error),
                              ),
                            ),
                            IconButton(
                              onPressed: () => locationProvider.clearError(),
                              icon: const Icon(Icons.close, color: AppColors.error),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildNearbyUsersList(LocationProvider locationProvider) {
    if (locationProvider.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
            SizedBox(height: AppConstants.paddingM),
            Text(
              'Looking for hearts nearby... 💫',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    if (locationProvider.nearbyUsers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppConstants.paddingXL),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.search,
                size: AppConstants.iconXL,
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: AppConstants.paddingL),
            Text(
              'No hearts nearby right now 🌙',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppConstants.paddingS),
            Text(
              'Amazing connections are on their way!\nStay open and they\'ll find you ✨',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textTertiary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      itemCount: locationProvider.nearbyUsers.length,
      itemBuilder: (context, index) {
        final user = locationProvider.nearbyUsers[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppConstants.paddingS),
          child: GeolocatedListTile(
            user: user,
            currentPosition: locationProvider.currentPosition!,
          ),
        );
      },
    );
  }

  void _toggleLocation(BuildContext context) {
    final locationProvider = context.read<LocationProvider>();
    locationProvider.toggleLocationSharing();
  }

  String? _getLocationMessage(LocationProvider locationProvider) {
    if (locationProvider.isLocationActive) {
      return 'You\'re visible to ${locationProvider.nearbyUsersCount} nearby hearts';
    } else if (!locationProvider.hasLocationPermission) {
      return 'We need location permission to help you connect 💕';
    }
    return null;
  }
}
