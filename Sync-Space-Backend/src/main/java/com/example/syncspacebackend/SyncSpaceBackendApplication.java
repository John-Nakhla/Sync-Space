package com.example.syncspacebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing // This is the fix for @CreatedDate
public class SyncSpaceBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SyncSpaceBackendApplication.class, args);
    }

}