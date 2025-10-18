import 'package:luma/models/chat/message.dart';

class Chat {
  final List<Message>? messages;
  final String chatId;

  Chat({this.messages, required this.chatId});
  factory Chat.fromJson(Map<String, dynamic> json) {
    return Chat(
      chatId: json['chatId'],
      messages: json['messages'] != null
          ? List<Message>.from(
              (json['messages'] as List).map((msg) => Message.fromJson(msg)),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'chatId': chatId,
      'messages': messages?.map((msg) => msg.toJson()).toList(),
    };
  }
}