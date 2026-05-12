package com.example.syncspacebackend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for receiving whiteboard update requests from the frontend.
 *
 * Note: The actual binary update data is sent as raw octet-stream in the request body,
 * not as JSON. Spring Boot's @RequestBody with byte[] automatically reads the raw bytes.
 *
 * This DTO can be extended later if you need additional metadata (e.g., client ID,
 * checksum, compression info, etc.). For now, the bytes themselves are the payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhiteboardUpdateRequest {
    // The binary YJS update data (Y.encodeStateAsUpdate output)
    // When sent as octet-stream, Spring automatically maps this
    // However, we can also use this DTO if we later want to send JSON with metadata
    private byte[] updateData;
}