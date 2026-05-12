package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.repositories.ChatMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatHistoryControllerTest {

    @Mock
    private ChatMessageRepository chatRepository;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private StreamOperations<String, Object, Object> streamOperations;

    @InjectMocks
    private ChatHistoryController chatHistoryController;

    private ChatMessage msg1;
    private ChatMessage msg2;

    @BeforeEach
    void setUp() {
        msg1 = new ChatMessage();
        msg1.setRoomId(1L);
        msg1.setSender("alice");
        msg1.setContent("Hello!");

        msg2 = new ChatMessage();
        msg2.setRoomId(1L);
        msg2.setSender("bob");
        msg2.setContent("Hi there!");
    }

    // ─── getOlderMessages ────────────────────────────────────────────────────

    @Test
    void getOlderMessages_validParams_returnsMessageList() {
        String before = Instant.now().toString();
        Instant instant = Instant.parse(before);

        when(chatRepository.findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                eq(1L), any(Instant.class), any(PageRequest.class)))
                .thenReturn(List.of(msg1, msg2));

        List<ChatMessage> result = chatHistoryController.getOlderMessages(1L, before, 20);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSender()).isEqualTo("alice");
        verify(chatRepository).findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                eq(1L), any(Instant.class), any(PageRequest.class));
    }

    @Test
    void getOlderMessages_noResults_returnsEmptyList() {
        when(chatRepository.findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                any(), any(), any()))
                .thenReturn(List.of());

        List<ChatMessage> result = chatHistoryController.getOlderMessages(1L, Instant.now().toString(), 20);

        assertThat(result).isEmpty();
    }

    @Test
    void getOlderMessages_customSize_passesCorrectPageRequest() {
        when(chatRepository.findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                eq(1L), any(Instant.class), eq(PageRequest.of(0, 5))))
                .thenReturn(List.of(msg1));

        List<ChatMessage> result = chatHistoryController.getOlderMessages(1L, Instant.now().toString(), 5);

        assertThat(result).hasSize(1);
    }

    @Test
    void getOlderMessages_correctRoomIdPassedToRepo() {
        when(chatRepository.findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                eq(42L), any(), any()))
                .thenReturn(List.of(msg1));

        chatHistoryController.getOlderMessages(42L, Instant.now().toString(), 20);

        verify(chatRepository).findByRoomIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                eq(42L), any(Instant.class), any(PageRequest.class));
    }

    // ─── getRecentHistory ────────────────────────────────────────────────────

    @Test
    void getRecentHistory_defaultSize_returnsMessages() {
        when(chatRepository.findByRoomIdOrderByCreatedAtDesc(eq(1L), any(PageRequest.class)))
                .thenReturn(List.of(msg1, msg2));

        List<ChatMessage> result = chatHistoryController.getRecentHistory(1L, 20);

        assertThat(result).hasSize(2);
        verify(chatRepository).findByRoomIdOrderByCreatedAtDesc(eq(1L), eq(PageRequest.of(0, 20)));
    }

    @Test
    void getRecentHistory_emptyRoom_returnsEmptyList() {
        when(chatRepository.findByRoomIdOrderByCreatedAtDesc(eq(99L), any()))
                .thenReturn(List.of());

        List<ChatMessage> result = chatHistoryController.getRecentHistory(99L, 20);

        assertThat(result).isEmpty();
    }

    @Test
    void getRecentHistory_customSize_usesCorrectPageRequest() {
        when(chatRepository.findByRoomIdOrderByCreatedAtDesc(eq(1L), eq(PageRequest.of(0, 10))))
                .thenReturn(List.of(msg1));

        List<ChatMessage> result = chatHistoryController.getRecentHistory(1L, 10);

        assertThat(result).hasSize(1);
    }

    // ─── getCatchUp ──────────────────────────────────────────────────────────

    @Test
    void getCatchUp_validRedisRecords_returnsParsedMessages() throws Exception {
        String lastSeenId = "1700000000000-0";
        String json = "{\"roomId\":1,\"sender\":\"alice\",\"content\":\"Hello!\"}";

        // Build a mock ObjectRecord
        @SuppressWarnings("unchecked")
        ObjectRecord<String, String> record = mock(ObjectRecord.class);
        RecordId recordId = RecordId.of("1700000000001-0");
        when(record.getId()).thenReturn(recordId);
        when(record.getValue()).thenReturn(json);

        when(redisTemplate.opsForStream()).thenReturn(
                (StreamOperations) streamOperations);
        when(streamOperations.read(eq(String.class), any(StreamOffset.class)))
                .thenReturn(List.of(record));
        when(objectMapper.readValue(json, ChatMessage.class)).thenReturn(msg1);

        List<ChatMessage> result = chatHistoryController.getCatchUp(1L, lastSeenId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSender()).isEqualTo("alice");
        // Verify redisId is set on the returned message
        assertThat(result.get(0).getRedisId()).isEqualTo("1700000000001-0");
    }

    @Test
    void getCatchUp_noNewMessages_returnsEmptyList() {
        when(redisTemplate.opsForStream()).thenReturn(
                (StreamOperations) streamOperations);
        when(streamOperations.read(eq(String.class), any(StreamOffset.class)))
                .thenReturn(List.of());

        List<ChatMessage> result = chatHistoryController.getCatchUp(1L, "1700000000000-0");

        assertThat(result).isEmpty();
    }

    @Test
    void getCatchUp_malformedJson_filtersOutNullResults() {
        // objectMapper is a @Mock — readValue returns null by default for unknown calls.
        // The controller's try/catch treats any parse failure (including null) as a
        // filtered-out entry, so no explicit stub is needed here.
        @SuppressWarnings("unchecked")
        ObjectRecord<String, String> record = mock(ObjectRecord.class);
        RecordId recordId = RecordId.of("1700000000001-0");
        when(record.getId()).thenReturn(recordId);
        when(record.getValue()).thenReturn("NOT_JSON");

        when(redisTemplate.opsForStream()).thenReturn(
                (StreamOperations) streamOperations);
        when(streamOperations.read(eq(String.class), any(StreamOffset.class)))
                .thenReturn(List.of(record));

        List<ChatMessage> result = chatHistoryController.getCatchUp(1L, "1700000000000-0");

        // null result from objectMapper mock is filtered out by Objects::nonNull
        assertThat(result).isEmpty();
    }
}