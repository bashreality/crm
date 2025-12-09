package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Model przechowujący informacje o załącznikach
 */
@Entity
@Table(name = "attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename; // UUID-based unique filename on disk

    @Column(name = "original_name", nullable = false)
    private String originalName; // Original filename from user

    @Column(name = "content_type", nullable = false)
    private String contentType; // MIME type (application/pdf, image/png, etc.)

    @Column(nullable = false)
    private Long size; // File size in bytes

    @Column(nullable = false)
    private String path; // Relative path on server

    @Column(name = "user_id")
    private Long userId; // Owner of the attachment

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

