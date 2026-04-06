package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.AuthResponse;
import com.example.syncspacebackend.dtos.LoginRequest;
import com.example.syncspacebackend.dtos.RegisterRequest;
import com.example.syncspacebackend.services.AuthService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        System.out.println("REGISTER HIT"); // <-- add this for testing
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        System.out.println("LOGIN HIT"); // <-- add this for testing
        return ResponseEntity.ok(authService.login(request));
    }
}