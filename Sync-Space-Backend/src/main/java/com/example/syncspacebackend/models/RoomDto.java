package com.example.syncspacebackend.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {

    private Long id;
    private Long ownerId;
    private String status;
    private String name;

    public static RoomDto from(Room room) {
        return new RoomDto(
                room.getId(),
                room.getOwner().getId(),
                room.getStatus().name(),
                room.getName()
        );
    }
}