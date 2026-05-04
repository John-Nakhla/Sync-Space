package com.example.syncspacebackend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomParticipantId implements Serializable {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "room_id")
    private Long roomId;
}