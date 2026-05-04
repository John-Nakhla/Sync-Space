package com.example.syncspacebackend.services;

import com.example.syncspacebackend.dtos.AuthResponse;
import com.example.syncspacebackend.dtos.LoginRequest;
import com.example.syncspacebackend.dtos.RegisterRequest;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.repositories.UserRepository;
import com.example.syncspacebackend.security.CustomUserDetailsService;
import com.example.syncspacebackend.security.JwtService;
import com.example.syncspacebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .hashedPassword(passwordEncoder.encode(request.getPassword()))
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        UserPrincipal userPrincipal = (UserPrincipal)
                userDetailsService.loadUserByUsername(user.getEmail());

        String token = jwtService.generateToken(userPrincipal);

        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        UserPrincipal userPrincipal = (UserPrincipal)
                userDetailsService.loadUserByUsername(request.getEmail());

        String token = jwtService.generateToken(userPrincipal);

        return new AuthResponse(token);
    }
}
