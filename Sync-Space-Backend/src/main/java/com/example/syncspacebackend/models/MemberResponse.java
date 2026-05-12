package com.example.syncspacebackend.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MemberResponse {
    private Long id;
    private String username;
    private String role;
}