package com.example.syncspacebackend.models;

import com.example.syncspacebackend.models.RoomParticipant.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserRoomResponse {
    private Long roomId;
    private String roomName;
    private String roomDescription;
    private Role role;
}