import 'package:luma/models/chat/message.dart';

abstract class ChatInterface {
  Future<void> sendMessage(String chatId, Message message);
  Stream<List<Message>> getMessagesStream(String chatId);
  Future<void> deleteChatIfNotNearby(String currentUserId, String otherUserId, bool isNearby);
  Future<bool> hasUnreadMessages(String chatId, String currentUserId);
}