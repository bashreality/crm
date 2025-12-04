package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_template_themes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailTemplateTheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "html_structure", columnDefinition = "TEXT", nullable = false)
    private String htmlStructure; // Base HTML with placeholders like {{CONTENT}}, {{LOGO}}

    @Column(name = "css_styles", columnDefinition = "TEXT", nullable = false)
    private String cssStyles; // CSS for the theme

    @Column(name = "is_system", nullable = false)
    private Boolean isSystem = false; // System themes cannot be deleted

    @Column(name = "user_id")
    private Long userId; // null for system themes

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isSystem == null) {
            isSystem = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}