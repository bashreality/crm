package com.crm.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "emails", indexes = {
    @Index(name = "idx_emails_user_id", columnList = "user_id"),
    @Index(name = "idx_emails_sender", columnList = "sender"),
    @Index(name = "idx_emails_company", columnList = "company"),
    @Index(name = "idx_emails_status", columnList = "status"),
    @Index(name = "idx_emails_received_at", columnList = "received_at"),
    @Index(name = "idx_emails_account_id", columnList = "account_id"),
    @Index(name = "idx_emails_tracking_id", columnList = "tracking_id"),
    @Index(name = "idx_emails_deleted_at", columnList = "deleted_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Email implements SoftDeletable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sender;

    @Column
    private String recipient; // Odbiorca (dla wysłanych emaili)

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "account_id")
    @JsonIgnoreProperties({"password", "imapHost", "imapPort", "imapProtocol", "smtpHost", "smtpPort", "createdAt", "updatedAt", "lastFetchAt", "emailCount"})
    private EmailAccount account; // Konto email, z którego pochodzi wiadomość

    @Column(unique = true)
    private String messageId; // Unikalny identyfikator wiadomości

    @Column
    private String inReplyTo; // Message-ID wiadomości, na którą odpowiadamy

    @Column(name = "references_header", columnDefinition = "TEXT")
    private String referencesHeader; // Nagłówek References dla wątków

    @Column(nullable = false)
    private String company;
    
    @Column(nullable = false)
    private String subject;
    
    @Column(columnDefinition = "TEXT")
    private String preview;
    
    @Column(columnDefinition = "TEXT")
    private String content; // Pełna treść emaila dla wyciągania danych kontaktowych
    
    @Column(nullable = false)
    private String status; // positive, neutral, negative, undelivered, maybeLater
    
    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @Column(name = "user_id")
    private Long userId; // ID użytkownika będącego właścicielem emaila

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // Tracking fields
    @Column(name = "tracking_id", unique = true)
    private String trackingId; // UUID for tracking pixel

    @Column(name = "is_opened")
    private Boolean isOpened = false;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "open_count")
    private Integer openCount = 0;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
    }
}
