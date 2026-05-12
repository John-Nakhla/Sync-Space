package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.AuthResponse;
import com.example.syncspacebackend.dtos.LoginRequest;
import com.example.syncspacebackend.dtos.RegisterRequest;
import com.example.syncspacebackend.services.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("john");
        registerRequest.setEmail("john@example.com");
        registerRequest.setPassword("secret123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("john@example.com");
        loginRequest.setPassword("secret123");

        authResponse = new AuthResponse("mocked-jwt-token");
    }

    // ─── register ────────────────────────────────────────────────────────────

    @Test
    void register_validRequest_returns200WithToken() {
        when(authService.register(registerRequest)).thenReturn(authResponse);

        ResponseEntity<AuthResponse> response = authController.register(registerRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isEqualTo("mocked-jwt-token");
        verify(authService, times(1)).register(registerRequest);
    }

    @Test
    void register_duplicateEmail_propagatesException() {
        when(authService.register(registerRequest))
                .thenThrow(new RuntimeException("Email already exists"));

        assertThatThrownBy(() -> authController.register(registerRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Email already exists");
    }

    @Test
    void register_serviceCalledWithExactRequest() {
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        authController.register(registerRequest);

        verify(authService).register(registerRequest);
        verifyNoMoreInteractions(authService);
    }

    // ─── login ───────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returns200WithToken() {
        when(authService.login(loginRequest)).thenReturn(authResponse);

        ResponseEntity<AuthResponse> response = authController.login(loginRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isEqualTo("mocked-jwt-token");
        verify(authService, times(1)).login(loginRequest);
    }

    @Test
    void login_invalidCredentials_propagatesException() {
        when(authService.login(loginRequest))
                .thenThrow(new RuntimeException("Bad credentials"));

        assertThatThrownBy(() -> authController.login(loginRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Bad credentials");
    }

    @Test
    void login_serviceCalledWithExactRequest() {
        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        authController.login(loginRequest);

        verify(authService).login(loginRequest);
        verifyNoMoreInteractions(authService);
    }

    @Test
    void login_returnsNonNullBody() {
        when(authService.login(loginRequest)).thenReturn(new AuthResponse("another-token"));

        ResponseEntity<AuthResponse> response = authController.login(loginRequest);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotBlank();
    }
}