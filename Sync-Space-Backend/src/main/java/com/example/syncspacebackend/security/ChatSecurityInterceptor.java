package com.example.syncspacebackend.security;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.repositories.RoomParticipantRepository;
import com.example.syncspacebackend.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatSecurityInterceptor implements ChannelInterceptor {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final JwtService jwtService; // You likely already have this for your Filter
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        // --- PHASE 1: AUTHENTICATION (CONNECT) ---
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String username = jwtService.extractUsername(token);
                    if (username != null) {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        if (jwtService.isTokenValid(token, userDetails)) {
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());

                            // Critical: Set the user into the STOMP accessor
                            accessor.setUser(auth);
                            log.info("WebSocket Authenticated user: {}", username);
                        }
                    }
                } catch (Exception e) {
                    log.error("WebSocket Auth Error: {}", e.getMessage());
                    throw new MessagingException("Authentication failed");
                }
            }
        }

        // --- PHASE 2: AUTHORIZATION (SEND) ---
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null) return message;

            Long roomId = extractRoomId(destination);

            // Validate User
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) accessor.getUser();
            if (auth == null) {
                throw new MessagingException("Unauthorized: No session user found");
            }

            // Custom UserDetails logic to get ID
            UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
            Long userId = principal.getId();

            // Check Room Membership
            boolean isMember = participantRepository.existsByUserIdAndRoomId(userId, roomId);
            if (!isMember) {
                throw new MessagingException("User is not a member of this room");
            }

            // Check Room Status
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new MessagingException("Room not found"));

            if (room.getStatus() != Room.RoomStatus.ACTIVE) {
                throw new MessagingException("Room is not active");
            }
        }

        return message;
    }

    private Long extractRoomId(String destination) {
        try {
            // ✅ Use lastIndexOf("/") for standard URL compatibility
            String idString = destination.substring(destination.lastIndexOf("/") + 1);
            return Long.parseLong(idString);
        } catch (Exception e) {
            // This log helps you see exactly what the backend received
            log.error("Failed to parse roomId from destination: {}", destination);
            throw new MessagingException("Invalid destination format");
        }
    }
}