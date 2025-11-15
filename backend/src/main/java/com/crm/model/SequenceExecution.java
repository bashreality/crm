package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Wykonanie sekwencji dla konkretnego kontaktu
 * Śledzi postęp wysyłania sekwencji do danego odbiorcy
 */
@Entity
@Table(name = "sequence_executions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SequenceExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sequence_id", nullable = false)
    private EmailSequence sequence;

    @ManyToOne
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    @Column(nullable = false)
    private String recipientEmail; // Email odbiorcy

    @Column(nullable = false)
    private String status; // active, paused, completed, cancelled

    @Column(nullable = false)
    private Integer currentStep = 0; // Aktualny krok (0 = przed rozpoczęciem)

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime completedAt;

    @Column
    private LocalDateTime pausedAt;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "active";
        }
    }
}
