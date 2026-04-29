package com.example.syncspacebackend.models;

import jakarta.persistence.*;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "whiteboard_snapshots")
public class WhiteboardSnapshot {

    @EmbeddedId
    private WhiteboardSnapshotId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId")
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Lob
    @Column(name = "snapshot_data", nullable = false, columnDefinition = "BYTEA")
    private byte[] snapshotData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public WhiteboardSnapshot() {}

    public WhiteboardSnapshot(Room room, byte[] snapshotData, Long version) {
        this.id = new WhiteboardSnapshotId(room.getId(), version);
        this.room = room;
        this.snapshotData = snapshotData;
    }

    public Long getVersion()        { return id.getVersion(); }

}