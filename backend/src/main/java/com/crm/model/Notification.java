package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Model powiadomienia w systemie CRM.
 * Powiadomienia są generowane przez automatyzacje workflow.
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String type = "info"; // info, success, warning, error

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "contact_id")
    private Long contactId;

    @Column(name = "deal_id")
    private Long dealId;

    @Column(name = "email_id")
    private Long emailId;

    @Column(name = "workflow_rule_id")
    private Long workflowRuleId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}

