package com.example.syncspacebackend.configurations;

import com.example.syncspacebackend.services.RedisReceiver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class RedisConfig {

    // This container manages the connection to Redis and listens for broadcasts
    @Bean
    RedisMessageListenerContainer container(RedisConnectionFactory connectionFactory,
                                            RedisReceiver receiver) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        container.addMessageListener(receiver, new PatternTopic("chat.room.*"));

        return container;
    }

}
