package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Email zaplanowany do wysłania
 */
@Entity
@Table(name = "scheduled_emails")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "execution_id")
    private SequenceExecution execution; // Null jeśli to standalone email

    @ManyToOne
    @JoinColumn(name = "step_id")
    private SequenceStep step; // Null jeśli to standalone email

    @Column(nullable = false)
    private String recipientEmail;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(nullable = false)
    private LocalDateTime scheduledFor; // Kiedy wysłać

    @Column(nullable = false)
    private String status; // pending, sent, failed, cancelled

    @Column
    private LocalDateTime sentAt;

    @Column
    private LocalDateTime failedAt;

    @Column(columnDefinition = "TEXT")
    private String errorMessage; // Jeśli wysłanie się nie powiodło

    @Column
    private Long sentEmailId; // ID wysłanego emaila w tabeli emails

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = "pending";
        }
    }
}
