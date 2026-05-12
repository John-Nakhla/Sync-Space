package com.example.syncspacebackend.integration;

import com.example.syncspacebackend.dtos.LoginRequest;
import com.example.syncspacebackend.dtos.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/auth/register persists user and returns JWT")
    void register_returnsToken() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest req = new RegisterRequest();
        req.setUsername("intuser_" + suffix);
        req.setEmail("int_" + suffix + "@test.local");
        req.setPassword("SecurePass1!");

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.get("token").asText()).isNotBlank();
    }

    @Test
    @DisplayName("POST /api/auth/login returns JWT for registered user")
    void login_afterRegister_returnsToken() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "login_" + suffix + "@test.local";
        String password = "LoginPass1!";

        RegisterRequest reg = new RegisterRequest();
        reg.setUsername("loginuser_" + suffix);
        reg.setEmail(email);
        reg.setPassword(password);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setEmail(email);
        login.setPassword(password);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andReturn();

        JsonNode body = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        assertThat(body.get("token").asText()).isNotBlank();
    }
}
