package com.example.syncspacebackend.services;
import org.springframework.data.redis.connection.Message;
import com.example.syncspacebackend.models.ChatMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisReceiver implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            System.out.println("🔥 RedisReceiver triggered!");

            String messageJson = new String(message.getBody());
            String channel = new String(message.getChannel());

            String roomId = channel.substring(channel.lastIndexOf(".") + 1);

            ChatMessage chatMessage = objectMapper.readValue(messageJson, ChatMessage.class);

            messagingTemplate.convertAndSend("/topic/room." + roomId, chatMessage);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}