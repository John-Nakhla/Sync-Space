package com.example.syncspacebackend.integration;

import com.example.syncspacebackend.dtos.LoginRequest;
import com.example.syncspacebackend.dtos.RegisterRequest;
import com.example.syncspacebackend.models.RoomRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class RoomApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndLogin(String username, String email, String password) throws Exception {
        RegisterRequest reg = new RegisterRequest();
        reg.setUsername(username);
        reg.setEmail(email);
        reg.setPassword(password);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setEmail(email);
        login.setPassword(password);
        MvcResult r = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(r.getResponse().getContentAsString());
        return body.get("token").asText();
    }

    @Test
    @DisplayName("Authenticated user can create a room and fetch it by id")
    void createRoom_thenGetRoom_returnsDto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = registerAndLogin("roomowner_" + suffix, "room_" + suffix + "@test.local", "RoomPass1!");

        RoomRequest roomReq = new RoomRequest();
        roomReq.setName("Integration Room " + suffix);
        roomReq.setDescription("Created by IT");

        MvcResult createResult = mockMvc.perform(post("/api/rooms/create")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(roomReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(roomReq.getName()))
                .andReturn();

        long roomId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(get("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roomId))
                .andExpect(jsonPath("$.name").value(roomReq.getName()))
                .andExpect(jsonPath("$.joinCode").isString());

        assertThat(roomId).isPositive();
    }
}
