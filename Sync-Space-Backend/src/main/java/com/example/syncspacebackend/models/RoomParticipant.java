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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    public enum Role {
        ADMIN,
        MEMBER,
        CONTRIBUTOR
    }
}