package com.example.syncspacebackend.services;

import org.springframework.stereotype.Service;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomSessionService {

    // Tracks which rooms currently have the admin present
    private final Set<Long> adminPresentRooms = ConcurrentHashMap.newKeySet();

    public void adminEntered(Long roomId) { adminPresentRooms.add(roomId); }
    public void adminLeft(Long roomId)    { adminPresentRooms.remove(roomId); }
    public boolean isAdminPresent(Long roomId) { return adminPresentRooms.contains(roomId); }
}