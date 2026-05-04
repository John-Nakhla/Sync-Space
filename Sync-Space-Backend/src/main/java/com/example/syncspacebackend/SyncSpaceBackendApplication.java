package com.example.syncspacebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.example.syncspacebackend.repositories")
// Scans only for MongoDB repositories
@EnableMongoRepositories(basePackages = "com.example.syncspacebackend.repositories")// This is the fix for @CreatedDate
public class SyncSpaceBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SyncSpaceBackendApplication.class, args);
    }

}