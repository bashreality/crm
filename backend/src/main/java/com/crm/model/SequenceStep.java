package com.crm.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sequence_id", nullable = false)
    @JsonBackReference
    private EmailSequence sequence;

    @Column(nullable = false)
    private Integer stepOrder; // Kolejność kroku (1, 2, 3...)

    @Column(name = "step_type", nullable = false, length = 32)
    private String stepType = "email"; // email, task, call, linkedin etc.

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

    @Column(name = "wait_for_reply_hours")
    private Integer waitForReplyHours = 0; // Ile godzin czekać na odpowiedź zanim przejdziemy dalej

    @Column(name = "skip_if_replied", nullable = false)
    private Boolean skipIfReplied = true; // Pomijaj krok jeśli odbiorca już odpisał

    @Column(name = "track_opens", nullable = false)
    private Boolean trackOpens = false;

    @Column(name = "track_clicks", nullable = false)
    private Boolean trackClicks = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private EmailTemplate template; // Optional: Use template instead of manual subject/body

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "sequence_step_attachments",
        joinColumns = @JoinColumn(name = "sequence_step_id"),
        inverseJoinColumns = @JoinColumn(name = "attachment_id")
    )
    private List<Attachment> attachments = new ArrayList<>();
}
