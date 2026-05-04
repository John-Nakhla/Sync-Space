package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.ChatMessage;
import com.example.syncspacebackend.security.UserPrincipal;
import com.example.syncspacebackend.services.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;



    @MessageMapping("/chat/{roomId}")
    public void processMessage(
            @DestinationVariable Long roomId,
            ChatMessage message,
            Authentication authentication) {

        if (authentication == null) {
            throw new RuntimeException("Unauthenticated WebSocket user");
        }

        Long userId = ((UserPrincipal) authentication.getPrincipal()).getId();
        String sender = ((UserPrincipal) authentication.getPrincipal()).getUsername();
        message.setSender(sender);
        message.setSenderId(userId);

        chatService.handleMessage(roomId, message);
    }
}
