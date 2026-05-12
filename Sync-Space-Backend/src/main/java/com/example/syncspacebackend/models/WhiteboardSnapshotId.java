package com.example.syncspacebackend.models;

import jakarta.persistence.Embeddable;
import lombok.Getter;

import java.io.Serializable;
import java.util.Objects;

@Getter
// ── Snapshot composite key ────────────────────────────────────────────

@Embeddable
public class WhiteboardSnapshotId implements Serializable {

    private Long roomId;
    private Long version;

    public WhiteboardSnapshotId() {}

    public WhiteboardSnapshotId(Long roomId, Long version) {
        this.roomId = roomId;
        this.version = version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WhiteboardSnapshotId that)) return false;
        return Objects.equals(roomId, that.roomId) &&
                Objects.equals(version, that.version);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, version);
    }
}
