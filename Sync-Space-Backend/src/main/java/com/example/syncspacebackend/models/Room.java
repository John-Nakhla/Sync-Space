package com.example.syncspacebackend.models;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // NEW: Optional description for the room
    @Column(length = 500)
    private String description;

    // This acts as your "Created By" attribute
    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner; 

    // This acts as your "Join Token". The frontend will use this to build the URL (e.g., mysite.com/join/93d0ab83)
    @Column(nullable = false, unique = true)
    private String joinCode;

    // NEW: Tracks if the room is currently running or paused/ended
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // NEW: Tracks when the session was closed or paused
    @Column
    private LocalDateTime endedAt;

    // NEW: The Enum defining the possible states of a room
    public enum RoomStatus {
        ACTIVE,
        ENDED
    }
}