package com.example.syncspacebackend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "room_participants")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoomParticipant {

    @EmbeddedId
    private RoomParticipantId id;

    @ManyToOne
    @MapsId("userId") // Maps to userId in RoomParticipantId
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @MapsId("roomId") // Maps to roomId in RoomParticipantId
    @JoinColumn(name = "room_id")
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    public enum Role {
        ADMIN, MEMBER, CONTRIBUTOR
    }
}