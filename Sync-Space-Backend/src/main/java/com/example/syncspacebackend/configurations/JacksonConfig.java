package com.example.syncspacebackend.configurations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // This is important because you are likely using LocalDateTime
        // for your chat message timestamps!
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}