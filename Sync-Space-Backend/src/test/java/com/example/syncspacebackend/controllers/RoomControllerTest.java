package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.services.RoomService;
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
class RoomControllerTest {

    @Mock
    private RoomService roomService;

    @InjectMocks
    private RoomController roomController;

    private Room activeRoom;
    private Room endedRoom;
    private RoomRequest roomRequest;
    private UserRoomResponse userRoomResponse;

    @BeforeEach
    void setUp() {
        activeRoom = Room.builder()
                .id(1L)
                .name("Design Sprint")
                .description("Weekly design sync")
                .status(Room.RoomStatus.ACTIVE)
                .joinCode("abc12345")
                .build();

        endedRoom = Room.builder()
                .id(2L)
                .name("Old Room")
                .description("Archived")
                .status(Room.RoomStatus.ENDED)
                .joinCode("xyz99999")
                .build();

        roomRequest = new RoomRequest();
        roomRequest.setName("Design Sprint");
        roomRequest.setDescription("Weekly design sync");

        userRoomResponse = new UserRoomResponse(
                1L, "Design Sprint", "Weekly design sync",
                "ADMIN", "ACTIVE", "abc12345"
        );
    }

    // ─── getMyRooms ──────────────────────────────────────────────────────────

    @Test
    void getMyRooms_returnsListOf200() {
        when(roomService.getAuthenticatedUserRooms()).thenReturn(List.of(userRoomResponse));

        ResponseEntity<List<UserRoomResponse>> response = roomController.getMyRooms();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("Design Sprint");
    }

    @Test
    void getMyRooms_emptyList_returns200WithEmptyBody() {
        when(roomService.getAuthenticatedUserRooms()).thenReturn(List.of());

        ResponseEntity<List<UserRoomResponse>> response = roomController.getMyRooms();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void getMyRooms_unauthenticated_propagatesException() {
        when(roomService.getAuthenticatedUserRooms())
                .thenThrow(new RuntimeException("User not authenticated"));

        assertThatThrownBy(() -> roomController.getMyRooms())
                .isInstanceOf(RuntimeException.class)
                .hasMessage("User not authenticated");
    }

    // ─── createRoom ──────────────────────────────────────────────────────────

    @Test
    void createRoom_validRequest_returnsCreatedRoom() {
        when(roomService.createRoom("Design Sprint", "Weekly design sync")).thenReturn(activeRoom);

        ResponseEntity<Room> response = roomController.createRoom(roomRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Design Sprint");
        assertThat(response.getBody().getStatus()).isEqualTo(Room.RoomStatus.ACTIVE);
    }

    @Test
    void createRoom_serviceCalledWithCorrectArgs() {
        when(roomService.createRoom(anyString(), anyString())).thenReturn(activeRoom);

        roomController.createRoom(roomRequest);

        verify(roomService).createRoom("Design Sprint", "Weekly design sync");
    }

    @Test
    void createRoom_propagatesServiceException() {
        when(roomService.createRoom(any(), any()))
                .thenThrow(new RuntimeException("User not authenticated"));

        assertThatThrownBy(() -> roomController.createRoom(roomRequest))
                .isInstanceOf(RuntimeException.class);
    }

    // ─── joinRoomByCode ──────────────────────────────────────────────────────

    @Test
    void joinRoomByCode_validCode_returnsSuccessMessage() {
        when(roomService.joinRoom("abc12345")).thenReturn("Success: Design Sprint");

        ResponseEntity<String> response = roomController.joinRoomByCode("abc12345");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).startsWith("Success:");
    }

    @Test
    void joinRoomByCode_invalidCode_returnsErrorMessage() {
        when(roomService.joinRoom("badcode")).thenReturn("Error: Invalid Room Code!");

        ResponseEntity<String> response = roomController.joinRoomByCode("badcode");

        assertThat(response.getStatusCode().value()).isEqualTo(200);// controller returns 200 with error message in body
        assertThat(response.getBody()).startsWith("Error:");
    }

    @Test
    void joinRoomByCode_alreadyMember_returnsAlreadyJoinedMessage() {
        when(roomService.joinRoom("abc12345")).thenReturn("Already joined: You are already a member of this room.");

        ResponseEntity<String> response = roomController.joinRoomByCode("abc12345");

        assertThat(response.getBody()).startsWith("Already joined:");
    }

    @Test
    void joinRoomByCode_endedRoom_returnsErrorMessage() {
        when(roomService.joinRoom("xyz99999")).thenReturn("Error: This room is currently paused or ended.");

        ResponseEntity<String> response = roomController.joinRoomByCode("xyz99999");

        assertThat(response.getBody()).contains("paused or ended");
    }

    // ─── promoteUser ─────────────────────────────────────────────────────────

    @Test
    void promoteUser_validAdminRequest_returnsSuccessMessage() {
        doNothing().when(roomService).promoteToContributor(1L, 2L);

        ResponseEntity<String> response = roomController.promoteUser(1L, 2L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("CONTRIBUTOR");
        verify(roomService).promoteToContributor(1L, 2L);
    }

    @Test
    void promoteUser_unauthorized_propagatesException() {
        doThrow(new RuntimeException("Unauthorized"))
                .when(roomService).promoteToContributor(1L, 99L);

        assertThatThrownBy(() -> roomController.promoteUser(1L, 99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Unauthorized");
    }

    @Test
    void promoteUser_userNotInRoom_propagatesException() {
        doThrow(new RuntimeException("User not in room"))
                .when(roomService).promoteToContributor(1L, 55L);

        assertThatThrownBy(() -> roomController.promoteUser(1L, 55L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("User not in room");
    }

    // ─── endRoom ─────────────────────────────────────────────────────────────

    @Test
    void endRoom_activeRoom_returnsEndedRoom() {
        endedRoom.setId(1L);
        when(roomService.endRoom(1L)).thenReturn(endedRoom);

        ResponseEntity<Room> response = roomController.endRoom(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getStatus()).isEqualTo(Room.RoomStatus.ENDED);
    }

    @Test
    void endRoom_unauthorized_propagatesException() {
        when(roomService.endRoom(1L)).thenThrow(new RuntimeException("Unauthorized"));

        assertThatThrownBy(() -> roomController.endRoom(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Unauthorized");
    }

    @Test
    void endRoom_roomNotFound_propagatesException() {
        when(roomService.endRoom(999L)).thenThrow(new RuntimeException("Room not found"));

        assertThatThrownBy(() -> roomController.endRoom(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Room not found");
    }

    // ─── resumeRoom ──────────────────────────────────────────────────────────

    @Test
    void resumeRoom_endedRoom_returnsActiveRoom() {
        when(roomService.resumeRoom(1L)).thenReturn(activeRoom);

        ResponseEntity<Room> response = roomController.resumeRoom(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getStatus()).isEqualTo(Room.RoomStatus.ACTIVE);
    }

    @Test
    void resumeRoom_unauthorized_propagatesException() {
        when(roomService.resumeRoom(1L)).thenThrow(new RuntimeException("Unauthorized"));

        assertThatThrownBy(() -> roomController.resumeRoom(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Unauthorized");
    }

    // ─── getRoom ─────────────────────────────────────────────────────────────

    @Test
    void getRoom_existingRoom_returnsRoomDto() {
        RoomDto dto = new RoomDto(1L, 10L, "ACTIVE", "Design Sprint");
        when(roomService.getRoomDto(1L)).thenReturn(dto);

        RoomDto result = roomController.getRoom(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void getRoom_notFound_propagatesException() {
        when(roomService.getRoomDto(999L)).thenThrow(new RuntimeException("Room not found"));

        assertThatThrownBy(() -> roomController.getRoom(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Room not found");
    }
}