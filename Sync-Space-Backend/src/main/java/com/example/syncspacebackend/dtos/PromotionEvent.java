package com.example.syncspacebackend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionEvent {
    private Long   userId;     // the user who was promoted
    private String username;   // their display name (frontend matches on this)
    private String newRole;    // "CONTRIBUTOR"
}