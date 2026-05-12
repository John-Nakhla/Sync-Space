package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.repositories.ChatMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatRepository;
    // Note: It's often safer to use String, String for Redis if you are just sending JSON
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    public void handleMessage(Long roomId, ChatMessage message) {
        try {
            message.setRoomId(roomId);

            // 1. Save to MongoDB (source of truth)
            chatRepository.save(message);

            // 2. Write to Redis Stream FIRST (this generates the ID)
            String streamKey = "stream:room:" + roomId;

            String jsonMessage = objectMapper.writeValueAsString(message);

            ObjectRecord<String, String> record = StreamRecords.newRecord()
                    .in(streamKey)
                    .ofObject(jsonMessage);

            RecordId recordId = redisTemplate.opsForStream().add(record);

            // 3. Attach Redis Stream ID to message
            message.setRedisId(recordId.getValue());

            // 4. Serialize AGAIN so redisId is included
            String finalJson = objectMapper.writeValueAsString(message);
            System.out.println("in service");
            System.out.println(finalJson);

            // 5. Publish to WebSocket (or Redis pub/sub)
            redisTemplate.convertAndSend("chat.room." + roomId, finalJson);

            // 6. Optional: trim stream (keep last 100 messages)
            redisTemplate.opsForStream().trim(streamKey, 100);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}