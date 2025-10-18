import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:luma/providers/auth_provider.dart';
import 'package:luma/providers/chat_provider.dart';
import 'package:luma/theme/colors.dart';
import 'package:luma/theme/constants.dart';
import 'package:luma/view/screens/authentication/welcome.dart';
import 'package:luma/view/screens/home/tabs/tab_map.dart';
import 'package:luma/view/screens/home/tabs/tab_user.dart';
import 'package:luma/view/widgets/empathy_components.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  int _currentIndex = 0;
  late AnimationController _tabController;
  late Animation<double> _tabAnimation;

  final List<Widget> _tabs = [
    const TabMap(),
    const TabUser(),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = AnimationController(
      duration: AppConstants.shortAnimation,
      vsync: this,
    );
    _tabAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _tabController, curve: Curves.easeInOut),
    );
    _tabController.forward();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            HeartIcon(
              size: AppConstants.iconL,
              isAnimated: true,
            ),
            const SizedBox(width: AppConstants.paddingS),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Luma',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  'Connect with hearts nearby',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Unread messages indicator
          Consumer<ChatProvider>(
            builder: (context, chatProvider, child) {
              return UnreadBadge(
                hasUnread: chatProvider.totalUnreadCount > 0,
                child: IconButton(
                  icon: const Icon(
                    Icons.notifications_outlined,
                    color: AppColors.textSecondary,
                  ),
                  onPressed: () {
                    // Show notifications or navigate to chats
                  },
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(
              Icons.logout,
              color: AppColors.textSecondary,
            ),
            onPressed: _logout,
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _tabAnimation,
        child: IndexedStack(
          index: _currentIndex,
          children: _tabs,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
            _tabController.reset();
            _tabController.forward();
          },
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textTertiary,
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w400,
            fontSize: 12,
          ),
          items: [
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(AppConstants.paddingS),
                decoration: BoxDecoration(
                  color: _currentIndex == 0 
                      ? AppColors.primary.withOpacity(0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppConstants.radiusS),
                ),
                child: Icon(
                  _currentIndex == 0 ? Icons.explore : Icons.explore_outlined,
                  size: AppConstants.iconM,
                ),
              ),
              label: 'Discover',
            ),
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(AppConstants.paddingS),
                decoration: BoxDecoration(
                  color: _currentIndex == 1 
                      ? AppColors.primary.withOpacity(0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppConstants.radiusS),
                ),
                child: Icon(
                  _currentIndex == 1 ? Icons.person : Icons.person_outline,
                  size: AppConstants.iconM,
                ),
              ),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  void _logout() async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.logout();
    
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const WelcomeScreen()),
      );
    }
  }
}
