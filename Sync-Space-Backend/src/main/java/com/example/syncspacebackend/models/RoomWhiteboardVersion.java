package com.example.syncspacebackend.models;

import jakarta.persistence.*;
import lombok.Getter;

@Getter
@Entity
@Table(name = "room_whiteboard_version")
public class RoomWhiteboardVersion {

    // ── Primary key ───────────────────────────────────────────────────────────
    // room_id IS the PK — one row per room, no surrogate needed.
    // @MapsId ties this entity's PK to the Room FK so they share the same value.

    @Id
    private Long roomId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "room_id")
    private Room room;

    // ── Counter ───────────────────────────────────────────────────────────────
    // Incremented atomically via a native UPDATE...RETURNING query in the
    // repository — never set manually outside of that query.

    @Column(name = "current_version", nullable = false)
    private Long currentVersion = 0L;

    // ── Constructors ──────────────────────────────────────────────────────────

    public RoomWhiteboardVersion() {}

    public RoomWhiteboardVersion(Room room) {
        this.room = room;
        this.currentVersion = 0L;
    }

}