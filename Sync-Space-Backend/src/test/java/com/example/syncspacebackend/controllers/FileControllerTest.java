package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileControllerTest {

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private FileController fileController;

    private MultipartFile mockFile;

    @BeforeEach
    void setUp() {
        mockFile = new MockMultipartFile(
                "file",
                "test-image.png",
                "image/png",
                "fake-image-bytes".getBytes()
        );
    }

    // ─── upload ──────────────────────────────────────────────────────────────

    @Test
    void upload_validFile_returnsFileUrlMap() {
        when(fileStorageService.saveFile(mockFile)).thenReturn("/uploads/uuid_test-image.png");

        Map<String, String> result = fileController.upload(mockFile);

        assertThat(result).containsKey("fileUrl");
        assertThat(result.get("fileUrl")).isEqualTo("/uploads/uuid_test-image.png");
    }

    @Test
    void upload_serviceCalledOnce() {
        when(fileStorageService.saveFile(any())).thenReturn("/uploads/some-file.png");

        fileController.upload(mockFile);

        verify(fileStorageService, times(1)).saveFile(mockFile);
        verifyNoMoreInteractions(fileStorageService);
    }

    @Test
    void upload_serviceThrows_propagatesException() {
        when(fileStorageService.saveFile(any()))
                .thenThrow(new RuntimeException("File upload failed"));

        assertThatThrownBy(() -> fileController.upload(mockFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("File upload failed");
    }

    @Test
    void upload_returnedUrlStartsWithUploadsPrefix() {
        when(fileStorageService.saveFile(any())).thenReturn("/uploads/abc123_doc.pdf");

        Map<String, String> result = fileController.upload(mockFile);

        assertThat(result.get("fileUrl")).startsWith("/uploads/");
    }

    @Test
    void upload_responseMapHasExactlyOneKey() {
        when(fileStorageService.saveFile(any())).thenReturn("/uploads/file.txt");

        Map<String, String> result = fileController.upload(mockFile);

        assertThat(result).hasSize(1);
        assertThat(result).containsOnlyKeys("fileUrl");
    }

    @Test
    void upload_emptyFile_stillDelegatesToService() {
        MultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.txt", "text/plain", new byte[0]
        );
        when(fileStorageService.saveFile(emptyFile)).thenReturn("/uploads/uuid_empty.txt");

        Map<String, String> result = fileController.upload(emptyFile);

        assertThat(result.get("fileUrl")).isNotBlank();
        verify(fileStorageService).saveFile(emptyFile);
    }

    @Test
    void upload_pdfFile_returnsCorrectUrl() {
        MultipartFile pdfFile = new MockMultipartFile(
                "file", "report.pdf", "application/pdf", "pdf-content".getBytes()
        );
        when(fileStorageService.saveFile(pdfFile)).thenReturn("/uploads/uuid_report.pdf");

        Map<String, String> result = fileController.upload(pdfFile);

        assertThat(result.get("fileUrl")).endsWith(".pdf");
    }
}