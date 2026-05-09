package com.example.syncspacebackend.configurations;

import com.example.syncspacebackend.websocket.WhiteboardWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WhiteboardWebSocketConfig implements WebSocketConfigurer {

    private final WhiteboardWebSocketHandler whiteboardWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
                // The frontend will connect to: ws://localhost:8080/ws/whiteboard/42
                // where 42 is the roomId. We extract it from the URI inside the handler.
                .addHandler(whiteboardWebSocketHandler, "/ws/whiteboard/*")

                // Allow all origins in development.
                // In production replace "*" with your actual frontend domain.
                .setAllowedOrigins("*");
    }
}