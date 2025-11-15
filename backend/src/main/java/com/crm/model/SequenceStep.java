package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Pojedynczy krok w sekwencji follow-up
 */
@Entity
@Table(name = "sequence_steps")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SequenceStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sequence_id", nullable = false)
    private EmailSequence sequence;

    @Column(nullable = false)
    private Integer stepOrder; // Kolejność kroku (1, 2, 3...)

    @Column(nullable = false)
    private String subject; // Temat emaila

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body; // Treść emaila (może zawierać zmienne jak {{name}}, {{company}})

    @Column(nullable = false)
    private Integer delayDays; // Opóźnienie w dniach od poprzedniego kroku (0 dla pierwszego)

    @Column(nullable = false)
    private Integer delayHours = 0; // Dodatkowe godziny opóźnienia

    @Column(nullable = false)
    private Integer delayMinutes = 0; // Dodatkowe minuty opóźnienia
}
