package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.WhiteboardStateResponse;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.security.UserPrincipal;
import com.example.syncspacebackend.services.WhiteboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhiteboardControllerTest {

    @Mock
    private WhiteboardService whiteboardService;

    @InjectMocks
    private WhiteboardController whiteboardController;

    private UserPrincipal principal;
    private WhiteboardStateResponse activeState;
    private WhiteboardStateResponse readOnlyState;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id(1L)
                .username("alice")
                .email("alice@example.com")
                .hashedPassword("hashed")
                .build();
        principal = new UserPrincipal(user);

        activeState = WhiteboardStateResponse.builder()
                .version(5L)
                .snapshotData("base64snapshot==")
                .deltaUpdates(List.of("delta1", "delta2"))
                .readOnly(false)
                .build();

        readOnlyState = WhiteboardStateResponse.builder()
                .version(10L)
                .snapshotData("base64snapshot==")
                .deltaUpdates(List.of())
                .readOnly(true)
                .build();
    }

    // ─── getWhiteboardState ──────────────────────────────────────────────────

    @Test
    void getWhiteboardState_validParticipant_returns200WithState() {
        when(whiteboardService.getWhiteboardState(1L, 1L)).thenReturn(activeState);

        ResponseEntity<WhiteboardStateResponse> response =
                whiteboardController.getWhiteboardState(1L, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getVersion()).isEqualTo(5L);
        assertThat(response.getBody().isReadOnly()).isFalse();
        verify(whiteboardService).getWhiteboardState(1L, 1L);
    }

    @Test
    void getWhiteboardState_endedRoom_returnsReadOnlyState() {
        when(whiteboardService.getWhiteboardState(2L, 1L)).thenReturn(readOnlyState);

        ResponseEntity<WhiteboardStateResponse> response =
                whiteboardController.getWhiteboardState(2L, principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().isReadOnly()).isTrue();
    }

    @Test
    void getWhiteboardState_withDeltaUpdates_returnsThemInBody() {
        when(whiteboardService.getWhiteboardState(1L, 1L)).thenReturn(activeState);

        ResponseEntity<WhiteboardStateResponse> response =
                whiteboardController.getWhiteboardState(1L, principal);

        assertThat(response.getBody().getDeltaUpdates()).hasSize(2);
        assertThat(response.getBody().getDeltaUpdates()).containsExactly("delta1", "delta2");
    }

    @Test
    void getWhiteboardState_noSnapshot_returnsNullSnapshotData() {
        WhiteboardStateResponse noSnapshot = WhiteboardStateResponse.builder()
                .version(0L)
                .snapshotData(null)
                .deltaUpdates(List.of())
                .readOnly(false)
                .build();
        when(whiteboardService.getWhiteboardState(1L, 1L)).thenReturn(noSnapshot);

        ResponseEntity<WhiteboardStateResponse> response =
                whiteboardController.getWhiteboardState(1L, principal);

        assertThat(response.getBody().getSnapshotData()).isNull();
        assertThat(response.getBody().getVersion()).isEqualTo(0L);
    }

    @Test
    void getWhiteboardState_userNotInRoom_propagatesException() {
        when(whiteboardService.getWhiteboardState(99L, 1L))
                .thenThrow(new RuntimeException("User 1 is not a participant of room 99"));

        assertThatThrownBy(() -> whiteboardController.getWhiteboardState(99L, principal))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void getWhiteboardState_roomNotFound_propagatesException() {
        when(whiteboardService.getWhiteboardState(999L, 1L))
                .thenThrow(new RuntimeException("Room not found: 999"));

        assertThatThrownBy(() -> whiteboardController.getWhiteboardState(999L, principal))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Room not found: 999");
    }

    @Test
    void getWhiteboardState_serviceCalledWithPrincipalId() {
        when(whiteboardService.getWhiteboardState(anyLong(), anyLong())).thenReturn(activeState);

        whiteboardController.getWhiteboardState(1L, principal);

        // Must use the principal's id (1L), not a hardcoded value
        verify(whiteboardService).getWhiteboardState(1L, principal.getId());
        verifyNoMoreInteractions(whiteboardService);
    }

    // ─── saveWhiteboardUpdate ────────────────────────────────────────────────

    @Test
    void saveWhiteboardUpdate_validData_returns200() {
        byte[] updateData = "yjs-binary-update".getBytes();
        doNothing().when(whiteboardService).saveWhiteboardUpdate(1L, 1L, updateData);

        ResponseEntity<Void> response =
                whiteboardController.saveWhiteboardUpdate(1L, principal, updateData);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(whiteboardService).saveWhiteboardUpdate(1L, 1L, updateData);
    }

    @Test
    void saveWhiteboardUpdate_serviceCalledWithCorrectArgs() {
        byte[] updateData = new byte[]{0x01, 0x02, 0x03};
        doNothing().when(whiteboardService).saveWhiteboardUpdate(anyLong(), anyLong(), any());

        whiteboardController.saveWhiteboardUpdate(1L, principal, updateData);

        verify(whiteboardService).saveWhiteboardUpdate(1L, principal.getId(), updateData);
        verifyNoMoreInteractions(whiteboardService);
    }

    @Test
    void saveWhiteboardUpdate_endedRoom_propagatesException() {
        byte[] updateData = "update".getBytes();
        doThrow(new RuntimeException("Cannot update whiteboard in an ended room"))
                .when(whiteboardService).saveWhiteboardUpdate(2L, 1L, updateData);

        assertThatThrownBy(() ->
                whiteboardController.saveWhiteboardUpdate(2L, principal, updateData))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Cannot update whiteboard in an ended room");
    }

    @Test
    void saveWhiteboardUpdate_userNotInRoom_propagatesException() {
        byte[] updateData = "update".getBytes();
        doThrow(new RuntimeException("User 1 is not a participant of room 99"))
                .when(whiteboardService).saveWhiteboardUpdate(99L, 1L, updateData);

        assertThatThrownBy(() ->
                whiteboardController.saveWhiteboardUpdate(99L, principal, updateData))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void saveWhiteboardUpdate_emptyByteArray_stillDelegatestoService() {
        byte[] emptyUpdate = new byte[0];
        doNothing().when(whiteboardService).saveWhiteboardUpdate(1L, 1L, emptyUpdate);

        ResponseEntity<Void> response =
                whiteboardController.saveWhiteboardUpdate(1L, principal, emptyUpdate);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(whiteboardService).saveWhiteboardUpdate(1L, 1L, emptyUpdate);
    }
}