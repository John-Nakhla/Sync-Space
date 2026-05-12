package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.PromotionEvent;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.services.PromotionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromotionControllerTest {

    @Mock
    private PromotionService promotionService;

    @InjectMocks
    private PromotionController promotionController;

    // ⚠️  NOTE: PromotionController uses @AuthenticationPrincipal User (not UserPrincipal).
    // This means Spring injects a raw User model, not UserPrincipal. If this causes
    // a ClassCastException at runtime, change the controller param to UserPrincipal
    // (matching your other controllers) and call principal.getId() instead.
    private User adminUser;
    private User memberUser;
    private PromotionEvent promotionEvent;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .email("admin@example.com")
                .hashedPassword("hashed")
                .build();

        memberUser = User.builder()
                .id(2L)
                .username("bob")
                .email("bob@example.com")
                .hashedPassword("hashed")
                .build();

        promotionEvent = PromotionEvent.builder()
                .userId(2L)
                .username("bob")
                .newRole("CONTRIBUTOR")
                .build();
    }

    // ─── promoteParticipant ──────────────────────────────────────────────────

    @Test
    void promoteParticipant_adminPromotesMember_returns200WithEvent() {
        when(promotionService.promote(1L, 1L, 2L)).thenReturn(promotionEvent);

        ResponseEntity<PromotionEvent> response =
                promotionController.promoteParticipant(1L, 2L, adminUser);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUserId()).isEqualTo(2L);
        assertThat(response.getBody().getUsername()).isEqualTo("bob");
        assertThat(response.getBody().getNewRole()).isEqualTo("CONTRIBUTOR");
    }

    @Test
    void promoteParticipant_serviceCalledWithCorrectArgs() {
        when(promotionService.promote(anyLong(), anyLong(), anyLong())).thenReturn(promotionEvent);

        promotionController.promoteParticipant(1L, 2L, adminUser);

        // Verifies that adminUser.getId() (1L) is passed as requesterId
        verify(promotionService).promote(1L, adminUser.getId(), 2L);
        verifyNoMoreInteractions(promotionService);
    }

    @Test
    void promoteParticipant_nonAdminRequester_propagatesException() {
        when(promotionService.promote(1L, 2L, 3L))
                .thenThrow(new RuntimeException("Only the admin can promote participants"));

        assertThatThrownBy(() ->
                promotionController.promoteParticipant(1L, 3L, memberUser))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Only the admin can promote participants");
    }

    @Test
    void promoteParticipant_requesterNotInRoom_propagatesException() {
        when(promotionService.promote(1L, 1L, 2L))
                .thenThrow(new RuntimeException("Requester not in room"));

        assertThatThrownBy(() ->
                promotionController.promoteParticipant(1L, 2L, adminUser))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Requester not in room");
    }

    @Test
    void promoteParticipant_targetNotInRoom_propagatesException() {
        when(promotionService.promote(1L, 1L, 99L))
                .thenThrow(new RuntimeException("Target user not in room"));

        User targetUser = User.builder().id(99L).build();

        assertThatThrownBy(() ->
                promotionController.promoteParticipant(1L, 99L, adminUser))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Target user not in room");
    }

    @Test
    void promoteParticipant_responseBodyContainsNewRole() {
        when(promotionService.promote(1L, 1L, 2L)).thenReturn(promotionEvent);

        ResponseEntity<PromotionEvent> response =
                promotionController.promoteParticipant(1L, 2L, adminUser);

        assertThat(response.getBody().getNewRole()).isEqualTo("CONTRIBUTOR");
    }
}