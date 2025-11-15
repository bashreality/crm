package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
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

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "sequence", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
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
