package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "emails")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Email {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String sender;

    @Column
    private String recipient; // Odbiorca (dla wysłanych emaili)

    @Column(unique = true)
    private String messageId; // Unikalny identyfikator wiadomości

    @Column
    private String inReplyTo; // Message-ID wiadomości, na którą odpowiadamy

    @Column(columnDefinition = "TEXT")
    private String references; // Nagłówek References dla wątków

    @Column(nullable = false)
    private String company;
    
    @Column(nullable = false)
    private String subject;
    
    @Column(columnDefinition = "TEXT")
    private String preview;
    
    @Column(columnDefinition = "TEXT")
    private String content; // Pełna treść emaila dla wyciągania danych kontaktowych
    
    @Column(nullable = false)
    private String status; // positive, neutral, negative
    
    @Column(nullable = false)
    private LocalDateTime receivedAt;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
    }
}
