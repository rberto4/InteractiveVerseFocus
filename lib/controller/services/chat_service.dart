import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:luma/controller/interfaces/chat_interface.dart';
import 'package:luma/models/chat/message.dart';

class ChatService implements ChatInterface {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String _generateChatId(String user1, String user2) {
    return user1.compareTo(user2) < 0 ? '${user1}_$user2' : '${user2}_$user1';
  }

  @override
  Future<void> sendMessage(String chatId, Message message) async {
    await _firestore.collection('chats').doc(chatId).collection('messages').add(message.toJson());
  }

  @override
  Stream<List<Message>> getMessagesStream(String chatId) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Message.fromJson(doc.data())).toList());
  }

  @override
  Future<bool> hasUnreadMessages(String chatId, String currentUserId) async {
    QuerySnapshot snapshot = await _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .limit(1)
        .get();

    if (snapshot.docs.isNotEmpty) {
      Message lastMessage = Message.fromJson(snapshot.docs.first.data() as Map<String, dynamic>);
      return lastMessage.senderId != currentUserId;
    }
    return false;
  }

  @override
  Future<void> deleteChatIfNotNearby(String currentUserId, String otherUserId, bool isNearby) async {
    if (!isNearby) {
      String chatId = _generateChatId(currentUserId, otherUserId);
      await _firestore.collection('chats').doc(chatId).delete();
    }
  }
}