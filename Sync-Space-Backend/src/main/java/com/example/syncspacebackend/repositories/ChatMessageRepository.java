package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    List<ChatMessage> findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
            Long roomId,
            LocalDateTime before,
            Pageable pageable
    );
    List<ChatMessage> findByRoomIdOrderByCreatedAtDesc(Long roomId , Pageable pageable);
}