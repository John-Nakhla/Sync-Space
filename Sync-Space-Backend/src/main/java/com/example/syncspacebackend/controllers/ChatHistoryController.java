package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.repositories.ChatMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatMessageRepository chatRepository;
    // Missing Injection:
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @GetMapping("/history/{roomId}/more")
    public List<ChatMessage> getOlderMessages(
            @PathVariable Long roomId,
            @RequestParam String before,
            @RequestParam(defaultValue = "20") int size
    ) {
        Instant lastTimestamp = Instant.parse(before);

        return chatRepository.findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                roomId,
                lastTimestamp,
                PageRequest.of(0, size)
        );
    }
    @GetMapping("/history/{roomId}")
    public List<ChatMessage> getRecentHistory(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "20") int size
    ) {
        // Fetch only the most recent 'size' messages
        PageRequest limit = PageRequest.of(0, size);
        return chatRepository.findByRoomIdOrderByCreatedAtDesc(roomId, limit);
    }
    @GetMapping("/catchup/{roomId}")
    public List<ChatMessage> getCatchUp(@PathVariable Long roomId, @RequestParam String lastSeenId) {

        String streamKey = "stream:room:" + roomId;

        // We use ReadOffset.from(lastSeenId) to tell Redis to start
        // reading immediately AFTER that specific ID.
        List<ObjectRecord<String, String>> records = redisTemplate.opsForStream()
                .read(String.class, StreamOffset.create(streamKey, ReadOffset.from(lastSeenId)));

        return records.stream()
                .map(record -> {
                    try {
                        ChatMessage msg = objectMapper.readValue(record.getValue(), ChatMessage.class);
                        // Crucial: Set the ID so the frontend can update its "Last Seen" again
                        msg.setRedisId(record.getId().getValue());
                        return msg;
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}