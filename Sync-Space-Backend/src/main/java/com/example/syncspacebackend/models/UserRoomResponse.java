package com.example.syncspacebackend.models;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserRoomResponse {

    private Long roomId;
    private String name;
    private String description;
    private String role;

    // ✅ NEW FIELDS
    private String status;
    private String joinCode;
}