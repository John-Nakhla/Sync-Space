package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.repositories.ChatMessageRepository;
import com.example.syncspacebackend.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatRepository;
    private final SimpMessagingTemplate messagingTemplate;
    // Note: It's often safer to use String, String for Redis if you are just sending JSON
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    public void handleMessage(Long roomId, ChatMessage message) {
        try {
            message.setRoomId(roomId);

            // 1. Permanent Vault: Save to MongoDB\
            System.out.println(message);
            System.out.println("DEBUG: Attempting to save to MongoDB: " + message.getContent());
            chatRepository.save(message);
            System.out.println("DEBUG: Successfully saved to MongoDB!");

            // 2. Multi-Server Bridge: Publish JSON string to Redis
            String jsonMessage = objectMapper.writeValueAsString(message);
            System.out.println(jsonMessage);
            redisTemplate.convertAndSend("chat.room." + roomId, jsonMessage);

            ObjectRecord<String, String> record = StreamRecords.newRecord()
                    .in("stream:room:" + roomId)
                    .ofObject(jsonMessage);

            RecordId recordId = redisTemplate.opsForStream().add(record);
            message.setRedisId(recordId.getValue());
            redisTemplate.opsForStream().trim("stream:room:" + roomId, 100);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}