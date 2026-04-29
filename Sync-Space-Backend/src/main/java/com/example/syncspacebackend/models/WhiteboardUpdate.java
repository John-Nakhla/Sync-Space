package com.example.syncspacebackend.models;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "whiteboard_updates")
public class WhiteboardUpdate {


    @EmbeddedId
    private WhiteboardUpdateId id;


    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId")                        // maps id.roomId → rooms.id
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;                       // contributor who produced this update

    @Lob
    @Column(name = "update_data", nullable = false, columnDefinition = "BYTEA")
    private byte[] updateData;              // raw YJS binary update (Y.encodeUpdate)



    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // ── Constructors ──────────────────────────────────────────────────────────

    public WhiteboardUpdate() {}

    public WhiteboardUpdate(Room room, User user, Long version, byte[] updateData) {
        this.id = new WhiteboardUpdateId(room.getId(), version);
        this.room = room;
        this.user = user;
        this.updateData = updateData;
    }


    public Long getVersion() {
        return id.getVersion();
    }

}