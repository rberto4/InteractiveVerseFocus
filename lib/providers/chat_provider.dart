import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:luma/controller/services/chat_service.dart';
import 'package:luma/models/chat/message.dart';
import 'package:luma/models/user.dart';
import 'package:luma/theme/constants.dart';

class ChatProvider extends ChangeNotifier {
  final ChatService _chatService = ChatService();
  
  // State variables
  final Map<String, List<Message>> _chatMessages = {};
  final Map<String, bool> _unreadMessages = {};
  final Map<String, StreamSubscription<List<Message>>> _messageSubscriptions = {};
  String? _currentUserId;
  final bool _isLoading = false;
  String? _errorMessage;
  
  // Getters
  Map<String, List<Message>> get chatMessages => _chatMessages;
  Map<String, bool> get unreadMessages => _unreadMessages;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get totalUnreadCount => _unreadMessages.values.where((unread) => unread).length;
  
  // Initialize chat provider
  void initializeChat(String userId) {
    _currentUserId = userId;
  }
  
  // Clear error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Generate chat ID
  String generateChatId(String user1, String user2) {
    return user1.compareTo(user2) < 0 ? '${user1}_$user2' : '${user2}_$user1';
  }
  
  // Start listening to chat messages
  void startListeningToChat(String otherUserId) {
    if (_currentUserId == null) return;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    
    // Don't start multiple subscriptions for the same chat
    if (_messageSubscriptions.containsKey(chatId)) return;
    
    _messageSubscriptions[chatId] = _chatService.getMessagesStream(chatId).listen(
      (messages) {
        _chatMessages[chatId] = messages;
        _updateUnreadStatus(chatId, messages);
        
        // Schedule notification for next frame to avoid build conflicts
        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
      },
      onError: (error) {
        _errorMessage = 'Error loading messages: ${_getHumanReadableError(error.toString())}';
        
        // Schedule notification for next frame to avoid build conflicts
        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
      },
    );
  }
  
  // Stop listening to chat messages
  void stopListeningToChat(String otherUserId) {
    if (_currentUserId == null) return;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    _messageSubscriptions[chatId]?.cancel();
    _messageSubscriptions.remove(chatId);
  }
  
  // Send message
  Future<bool> sendMessage(String otherUserId, String content) async {
    if (_currentUserId == null || content.trim().isEmpty) return false;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    
    try {
      final message = Message(
        senderId: _currentUserId!,
        receiverId: otherUserId,
        content: content.trim(),
        timestamp: Timestamp.now(),
      );
      
      await _chatService.sendMessage(chatId, message);
      _errorMessage = null;
      return true;
    } catch (e) {
      _errorMessage = 'Failed to send message: ${_getHumanReadableError(e.toString())}';
      notifyListeners();
      return false;
    }
  }
  
  // Get messages for a chat
  List<Message> getMessagesForChat(String otherUserId) {
    if (_currentUserId == null) return [];
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    return _chatMessages[chatId] ?? [];
  }
  
  // Check if chat has unread messages
  bool hasUnreadMessages(String otherUserId) {
    if (_currentUserId == null) return false;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    return _unreadMessages[chatId] ?? false;
  }
  
  // Mark chat as read
  void markChatAsRead(String otherUserId) {
    if (_currentUserId == null) return;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    _unreadMessages[chatId] = false;
    
    // Schedule notification for next frame to avoid build conflicts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });
  }
  
  // Check unread messages for a specific user (silent update)
  Future<void> checkUnreadMessages(String otherUserId) async {
    if (_currentUserId == null) return;
    
    final chatId = generateChatId(_currentUserId!, otherUserId);
    
    try {
      final hasUnread = await _chatService.hasUnreadMessages(chatId, _currentUserId!);
      _unreadMessages[chatId] = hasUnread;
      // Don't call notifyListeners() here to avoid build phase conflicts
      // The UI will be updated on the next rebuild cycle
    } catch (e) {
      // Silent fail for unread check
    }
  }
  
  // Force refresh UI (call this when safe to do so)
  void refreshUI() {
    notifyListeners();
  }
  
  // Delete chat if users are not nearby
  Future<void> deleteChatIfNotNearby(String otherUserId, bool isNearby) async {
    if (_currentUserId == null) return;
    
    try {
      await _chatService.deleteChatIfNotNearby(_currentUserId!, otherUserId, isNearby);
      
      if (!isNearby) {
        final chatId = generateChatId(_currentUserId!, otherUserId);
        _chatMessages.remove(chatId);
        _unreadMessages.remove(chatId);
        stopListeningToChat(otherUserId);
        notifyListeners();
      }
    } catch (e) {
      // Silent fail for deletion
    }
  }
  
  // Clean up chats for users that are no longer nearby
  Future<void> cleanupChatsForUsers(List<User> currentNearbyUsers, List<String> previousNearbyUserIds) async {
    if (_currentUserId == null) return;
    
    final currentUserIds = currentNearbyUsers.map((user) => user.id).toList();
    final disappearedUserIds = previousNearbyUserIds.where((id) => !currentUserIds.contains(id)).toList();
    
    for (final userId in disappearedUserIds) {
      await deleteChatIfNotNearby(userId, false);
    }
  }
  
  // Get last message for a chat
  Message? getLastMessage(String otherUserId) {
    final messages = getMessagesForChat(otherUserId);
    return messages.isNotEmpty ? messages.last : null;
  }
  
  // Get formatted time for last message
  String getLastMessageTime(String otherUserId) {
    final lastMessage = getLastMessage(otherUserId);
    if (lastMessage == null) return '';
    
    final now = DateTime.now();
    final messageTime = lastMessage.timestamp.toDate();
    final difference = now.difference(messageTime);
    
    if (difference.inMinutes < 1) {
      return 'ora';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m fa';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h fa';
    } else {
      return '${difference.inDays}g fa';
    }
  }
  
  // Private methods
  void _updateUnreadStatus(String chatId, List<Message> messages) {
    if (_currentUserId == null || messages.isEmpty) return;
    
    final lastMessage = messages.last;
    _unreadMessages[chatId] = lastMessage.senderId != _currentUserId;
  }
  
  String _getHumanReadableError(String error) {
    if (error.contains('network')) {
      return AppConstants.networkError;
    } else if (error.contains('permission')) {
      return 'Unable to access chat. Please check permissions 💌';
    } else {
      return AppConstants.generalError;
    }
  }
  
  @override
  void dispose() {
    // Cancel all message subscriptions
    for (final subscription in _messageSubscriptions.values) {
      subscription.cancel();
    }
    _messageSubscriptions.clear();
    super.dispose();
  }
}