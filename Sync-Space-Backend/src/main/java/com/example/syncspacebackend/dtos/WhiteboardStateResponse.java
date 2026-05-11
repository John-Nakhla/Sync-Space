package com.example.syncspacebackend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WhiteboardStateResponse {

    // The version this state represents — the highest update version
    // included in this response. The client stores this and uses it
    // to request only newer deltas in future sync calls.
    private Long version;

    // Base64-encoded YJS snapshot bytes (Y.encodeStateAsUpdate output).
    // Null if the room has never had a snapshot yet (brand new room).
    // The client calls Y.applyUpdate(ydoc, base64Decode(snapshotData))
    private String snapshotData;

    // Base64-encoded YJS update bytes for each delta after the snapshot.
    // Applied in order on top of the snapshot to reach the current state.
    // Empty list if the snapshot is already fully up to date.
    private List<String> deltaUpdates;

    // True when room status is ENDED — frontend must disable all drawing
    // tools and make the canvas pointer-events: none.
    private boolean readOnly;
}