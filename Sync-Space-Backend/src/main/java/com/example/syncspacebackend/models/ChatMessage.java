package com.example.syncspacebackend.models;

import lombok.Data;
import org.springframework.data.annotation.Id; // Use Spring Data Id
import org.springframework.data.mongodb.core.index.Indexed; // Correct import for MongoDB indexing
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;



@Data
@Document(collection = "chat_messages")
public class ChatMessage {
    @Id
    private String id;

    @Indexed
    private Long roomId;

    private Long senderId;
    private String sender;
    private String parentId;
    private String content;
    private String fileUrl;
    private Instant createdAt = Instant.now();
    private Boolean isDeleted = false;
    private String redisId;
}