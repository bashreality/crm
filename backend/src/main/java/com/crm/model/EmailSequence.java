package com.crm.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Szablon sekwencji follow-up
 * Definiuje serię emaili do wysłania z określonymi interwałami
 */
@Entity
@Table(name = "email_sequences")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Nazwa sekwencji, np. "Onboarding Sequence"

    @Column(columnDefinition = "TEXT")
    private String description; // Opis sekwencji

    @Column(nullable = false)
    private Boolean active = true; // Czy sekwencja jest aktywna

    @Column(name = "timezone", nullable = false)
    private String timezone = "Europe/Warsaw"; // Strefa czasowa do harmonogramu

    @Column(name = "send_window_start")
    private LocalTime sendWindowStart = LocalTime.of(9, 0); // Domyślnie 09:00

    @Column(name = "send_window_end")
    private LocalTime sendWindowEnd = LocalTime.of(17, 0); // Domyślnie 17:00

    @Column(name = "send_on_weekends", nullable = false)
    private Boolean sendOnWeekends = false;

    @Column(name = "daily_sending_limit")
    private Integer dailySendingLimit; // Limit wysyłek dziennie (null = bez limitu)

    @Column(name = "throttle_per_hour")
    private Integer throttlePerHour; // Limit wysyłek na godzinę (null = bez limitu)

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "sequence", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stepOrder ASC")
    @JsonManagedReference
    private List<SequenceStep> steps; // Kroki w sekwencji

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
