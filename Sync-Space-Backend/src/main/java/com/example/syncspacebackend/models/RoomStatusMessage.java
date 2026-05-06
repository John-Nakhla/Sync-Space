package com.example.syncspacebackend.models;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoomStatusMessage {
    private String status;
    private Long ownerId;
}