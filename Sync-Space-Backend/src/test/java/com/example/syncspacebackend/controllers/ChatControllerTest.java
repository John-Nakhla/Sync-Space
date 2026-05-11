package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.security.UserPrincipal;
import com.example.syncspacebackend.services.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatService chatService;

    @InjectMocks
    private ChatController chatController;

    private ChatMessage message;
    private UserPrincipal userPrincipal;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        User aliceUser = User.builder()
                .id(42L)
                .username("alice")
                .email("alice@example.com")
                .hashedPassword("hashed")
                .build();
        userPrincipal = new UserPrincipal(aliceUser);

        authentication = new UsernamePasswordAuthenticationToken(
                userPrincipal, null, userPrincipal.getAuthorities()
        );

        message = new ChatMessage();
        message.setContent("Hello room!");
    }

    // ─── processMessage ──────────────────────────────────────────────────────

    @Test
    void processMessage_authenticatedUser_setsSenderOnMessage() {
        chatController.processMessage(1L, message, authentication);

        assertThat(message.getSender()).isEqualTo("alice@example.com"); // getUsername() returns email
        assertThat(message.getSenderId()).isEqualTo(42L);
    }

    @Test
    void processMessage_authenticatedUser_delegatesToChatService() {
        chatController.processMessage(1L, message, authentication);

        verify(chatService, times(1)).handleMessage(1L, message);
    }

    @Test
    void processMessage_passesCorrectRoomId() {
        chatController.processMessage(99L, message, authentication);

        verify(chatService).handleMessage(eq(99L), any(ChatMessage.class));
    }

    @Test
    void processMessage_nullAuthentication_throwsRuntimeException() {
        assertThatThrownBy(() -> chatController.processMessage(1L, message, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Unauthenticated WebSocket user");

        verifyNoInteractions(chatService);
    }

    @Test
    void processMessage_senderIdExtractedFromPrincipal() {
        User bobUser = User.builder()
                .id(7L)
                .username("bob")
                .email("bob@example.com")
                .hashedPassword("hashed")
                .build();
        UserPrincipal anotherUser = new UserPrincipal(bobUser);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                anotherUser, null, anotherUser.getAuthorities()
        );
        ChatMessage msg = new ChatMessage();

        chatController.processMessage(1L, msg, auth);

        assertThat(msg.getSenderId()).isEqualTo(7L);
        assertThat(msg.getSender()).isEqualTo("bob@example.com"); // getUsername() returns email
    }

    @Test
    void processMessage_chatServiceReceivesEnrichedMessage() {
        // Before processing, sender is not set
        assertThat(message.getSender()).isNull();

        chatController.processMessage(1L, message, authentication);

        // Verify service received the message WITH sender info already set
        verify(chatService).handleMessage(1L, message);
        assertThat(message.getSender()).isNotNull();
    }

    @Test
    void processMessage_serviceThrows_propagatesException() {
        doThrow(new RuntimeException("Redis unavailable"))
                .when(chatService).handleMessage(anyLong(), any());

        assertThatThrownBy(() -> chatController.processMessage(1L, message, authentication))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Redis unavailable");
    }
}