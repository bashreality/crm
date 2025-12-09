package com.crm.controller;

import com.crm.model.Attachment;
import com.crm.security.UserPrincipal;
import com.crm.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
@Slf4j
public class AttachmentController {

    private final AttachmentService attachmentService;

    /**
     * Upload a single file
     */
    @PostMapping("/upload")
    public ResponseEntity<Attachment> uploadFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            Long userId = userPrincipal != null ? userPrincipal.getId() : null;
            Attachment attachment = attachmentService.uploadFile(file, userId);
            return ResponseEntity.ok(attachment);
        } catch (IllegalArgumentException e) {
            log.warn("Upload validation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Upload failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Upload multiple files
     */
    @PostMapping("/upload-multiple")
    public ResponseEntity<List<Attachment>> uploadMultipleFiles(
            @RequestParam("files") MultipartFile[] files,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            Long userId = userPrincipal != null ? userPrincipal.getId() : null;
            List<Attachment> attachments = new java.util.ArrayList<>();
            
            for (MultipartFile file : files) {
                Attachment attachment = attachmentService.uploadFile(file, userId);
                attachments.add(attachment);
            }
            
            return ResponseEntity.ok(attachments);
        } catch (IllegalArgumentException e) {
            log.warn("Upload validation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Upload failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Download attachment by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id) {
        try {
            Attachment attachment = attachmentService.getById(id);
            byte[] fileBytes = attachmentService.getFileBytes(attachment);
            
            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            
            String encodedFilename = URLEncoder.encode(attachment.getOriginalName(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(attachment.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename*=UTF-8''" + encodedFilename)
                    .contentLength(attachment.getSize())
                    .body(resource);
        } catch (IOException e) {
            log.error("Download failed for attachment {}", id, e);
            return ResponseEntity.internalServerError().build();
        } catch (RuntimeException e) {
            log.warn("Attachment not found: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get attachment metadata by ID
     */
    @GetMapping("/{id}/info")
    public ResponseEntity<Attachment> getAttachmentInfo(@PathVariable Long id) {
        try {
            Attachment attachment = attachmentService.getById(id);
            return ResponseEntity.ok(attachment);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all attachments for current user
     */
    @GetMapping("/my")
    public ResponseEntity<List<Attachment>> getMyAttachments(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.ok(List.of());
        }
        List<Attachment> attachments = attachmentService.getByUserId(userPrincipal.getId());
        return ResponseEntity.ok(attachments);
    }

    /**
     * Delete attachment
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAttachment(@PathVariable Long id) {
        try {
            attachmentService.delete(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Załącznik usunięty");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.warn("Delete failed for attachment {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}

