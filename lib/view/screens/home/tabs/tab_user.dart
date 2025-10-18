import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:luma/providers/auth_provider.dart';
import 'package:luma/providers/location_provider.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';
import 'package:luma/view/widgets/empathy_components.dart';
import 'package:luma/view/screens/authentication/login.dart';

class TabUser extends StatefulWidget {
  const TabUser({super.key});

  @override
  State<TabUser> createState() => _TabUserState();
}

class _TabUserState extends State<TabUser> with TickerProviderStateMixin {
  late AnimationController _slideController;
  late AnimationController _fadeController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: AppConstants.mediumAnimation,
      vsync: this,
    );
    _fadeController = AnimationController(
      duration: AppConstants.slowAnimation,
      vsync: this,
    );
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutBack,
    ));
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _slideController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppColors.coolGradient,
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: Column(
                children: [
                  // Header with Profile Info
                  Container(
                    padding: const EdgeInsets.all(AppConstants.paddingL),
                    child: Column(
                      children: [
                        // Profile Avatar
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.white.withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.person,
                            color: Colors.white,
                            size: 60,
                          ),
                        ),
                        const SizedBox(height: AppConstants.paddingL),
                        
                        // User Name
                        Consumer<AuthProvider>(
                          builder: (context, authProvider, child) {
                            final user = authProvider.currentUser;
                            return Column(
                              children: [
                                Text(
                                  user?.name ?? 'Your Profile',
                                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: AppConstants.paddingS),
                                Text(
                                  user?.email ?? '',
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.white.withOpacity(0.8),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        
                        const SizedBox(height: AppConstants.paddingL),
                        
                        // Connection Status
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppConstants.paddingL,
                            vertical: AppConstants.paddingS,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(AppConstants.radiusL),
                            border: Border.all(color: Colors.white.withOpacity(0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              HeartIcon(
                                size: AppConstants.iconS,
                                isAnimated: true,
                                color: Colors.white,
                              ),
                              const SizedBox(width: AppConstants.paddingS),
                              Text(
                                'Ready to connect 💫',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Content Area
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(top: AppConstants.paddingL),
                      decoration: const BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(AppConstants.radiusXL),
                          topRight: Radius.circular(AppConstants.radiusXL),
                        ),
                      ),
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.all(AppConstants.paddingL),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Stats Section
                            Text(
                              'Your Journey 🌟',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: AppConstants.paddingM),
                            
                            Row(
                              children: [
                                Expanded(
                                  child: _buildStatCard(
                                    icon: Icons.favorite,
                                    title: 'Connections',
                                    value: '12',
                                    subtitle: 'Hearts shared',
                                    gradient: AppColors.primaryGradient,
                                  ),
                                ),
                                const SizedBox(width: AppConstants.paddingM),
                                Expanded(
                                  child: _buildStatCard(
                                    icon: Icons.chat_bubble,
                                    title: 'Conversations',
                                    value: '8',
                                    subtitle: 'Active chats',
                                    gradient: AppColors.coolGradient,
                                  ),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: AppConstants.paddingXL),
                            
                            // Settings Section
                            Text(
                              'Settings 🛠️',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: AppConstants.paddingM),
                            
                            _buildSettingOption(
                              icon: Icons.location_on,
                              title: 'Location Services',
                              subtitle: 'Manage your location sharing',
                              onTap: () => _showLocationSettings(),
                            ),
                            
                            _buildSettingOption(
                              icon: Icons.notifications,
                              title: 'Notifications',
                              subtitle: 'Customize your alerts',
                              onTap: () => _showNotificationSettings(),
                            ),
                            
                            _buildSettingOption(
                              icon: Icons.privacy_tip,
                              title: 'Privacy & Safety',
                              subtitle: 'Control who can connect with you',
                              onTap: () => _showPrivacySettings(),
                            ),
                            
                            const SizedBox(height: AppConstants.paddingXL),
                            
                            // Logout Button
                            EmpathyButton(
                              text: 'Sign Out',
                              onPressed: _showLogoutDialog,
                            ),
                            
                            const SizedBox(height: AppConstants.paddingM),
                            
                            // App Info
                            Center(
                              child: Text(
                                'Luma v1.0.0 • Made with 💜 for meaningful connections',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textTertiary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            
                            // Bottom padding for last element
                            SizedBox(height: MediaQuery.of(context).padding.bottom + AppConstants.paddingL),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required Gradient gradient,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppConstants.paddingM),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(AppConstants.paddingS),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(AppConstants.radiusM),
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: AppConstants.iconM,
            ),
          ),
          const SizedBox(height: AppConstants.paddingM),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.white.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppConstants.paddingS),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppConstants.radiusM),
          child: Container(
            padding: const EdgeInsets.all(AppConstants.paddingM),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppConstants.radiusM),
              border: Border.all(color: AppColors.surfaceVariant),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppConstants.paddingS),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppConstants.radiusS),
                  ),
                  child: Icon(
                    icon,
                    color: AppColors.primary,
                    size: AppConstants.iconM,
                  ),
                ),
                const SizedBox(width: AppConstants.paddingM),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: AppColors.textTertiary,
                  size: AppConstants.iconS,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showLocationSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(AppConstants.radiusXL),
            topRight: Radius.circular(AppConstants.radiusXL),
          ),
        ),
        padding: const EdgeInsets.all(AppConstants.paddingL),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppConstants.paddingL),
            Text(
              'Location Settings 📍',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AppConstants.paddingM),
            Consumer<LocationProvider>(
              builder: (context, locationProvider, child) {
                return SwitchListTile(
                  title: const Text('Enable Location Sharing'),
                  subtitle: const Text('Allow others to see your general location'),
                  value: locationProvider.isLocationActive,
                  onChanged: (value) => locationProvider.toggleLocationSharing(),
                  activeThumbColor: AppColors.primary,
                );
              },
            ),
            const SizedBox(height: AppConstants.paddingL),
          ],
        ),
      ),
    );
  }

  void _showNotificationSettings() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Notification settings coming soon! 🔔'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusM),
        ),
      ),
    );
  }

  void _showPrivacySettings() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Privacy settings coming soon! 🔒'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusM),
        ),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusL),
        ),
        title: Row(
          children: [
            Icon(
              Icons.logout,
              color: AppColors.primary,
            ),
            const SizedBox(width: AppConstants.paddingS),
            const Text('Sign Out'),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out? You\'ll miss out on new connections! 💔',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Stay Connected',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<AuthProvider>().logout();
              if (mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red[400],
              foregroundColor: Colors.white,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}