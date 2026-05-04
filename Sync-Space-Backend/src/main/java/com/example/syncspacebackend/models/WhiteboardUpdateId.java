package com.example.syncspacebackend.models;

import jakarta.persistence.Embeddable;
import lombok.Getter;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Embeddable
public class WhiteboardUpdateId implements Serializable {

    private Long roomId;
    private Long version;

    public WhiteboardUpdateId() {}

    public WhiteboardUpdateId(Long roomId, Long version) {
        this.roomId = roomId;
        this.version = version;
    }


    // ── equals & hashCode (mandatory for JPA composite keys) ─────────────────

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WhiteboardUpdateId that)) return false;
        return Objects.equals(roomId, that.roomId) &&
                Objects.equals(version, that.version);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, version);
    }
}