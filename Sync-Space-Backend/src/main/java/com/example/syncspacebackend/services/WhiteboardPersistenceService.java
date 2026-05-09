package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.repositories.WhiteboardSnapshotRepository;
import com.example.syncspacebackend.repositories.WhiteboardUpdateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WhiteboardPersistenceService {

    @Autowired
    private WhiteboardUpdateRepository updateRepo;

    @Autowired
    private WhiteboardSnapshotRepository snapshotRepo;

    // 1. SAVE AN UPDATE: Call this when your WebSocket receives binary data from a user
    @Transactional
    public void saveUpdate(Room room, User user, byte[] updateData) {
        // Find the current highest version for this room to increment it
        // (In a highly concurrent production app, you might use a database sequence or Redis for this)
        Long nextVersion = getNextVersionNumberForRoom(room.getId()); 
        
        WhiteboardUpdate newUpdate = new WhiteboardUpdate(room, user, nextVersion, updateData);
        updateRepo.save(newUpdate);
        
        // Optional: If nextVersion reaches 50 or 100, trigger a background task to create a WhiteboardSnapshot
    }

    // 2. LOAD THE BOARD: Call this when a user first connects to the room
    @Transactional(readOnly = true)
    public byte[] getFullBoardState(Long roomId) {
        // Step A: Look for the latest snapshot
        var latestSnapshot = snapshotRepo.findTopByIdRoomIdOrderByIdVersionDesc(roomId);
        
        // Step B: Load the updates
        List<WhiteboardUpdate> recentUpdates;
        if (latestSnapshot.isPresent()) {
            // Load only updates that happened AFTER the snapshot
            recentUpdates = updateRepo.findByIdRoomIdAndIdVersionGreaterThanOrderByIdVersionAsc(
                roomId, 
                latestSnapshot.get().getVersion()
            );
            // NOTE: You will need to send the snapshot bytes AND the update bytes to your frontend
        } else {
            // No snapshot exists, load ALL updates since the room was created
            recentUpdates = updateRepo.findByIdRoomIdOrderByIdVersionAsc(roomId);
        }
        
        // At this point, you will serialize these byte[] arrays and send them over the WebSocket
        // so the React frontend can run Y.applyUpdate()
        return null; // Replace with actual combined byte array
    }
    
    private Long getNextVersionNumberForRoom(Long roomId) {
        // Implementation to safely get the next sequence number
        return System.currentTimeMillis(); // Placeholder
    }
}