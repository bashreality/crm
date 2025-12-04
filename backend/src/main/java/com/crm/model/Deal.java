package com.crm.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "deals")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Deal implements SoftDeletable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    @JsonIgnoreProperties({"deals", "emails", "tasks", "notes", "activities"}) // Avoid infinite recursion if relationships exist
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    @JsonIgnoreProperties({"stages"})
    private Pipeline pipeline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private PipelineStage stage;

    @Column(nullable = false)
    private Double value = 0.0;

    @Column(nullable = false)
    private String currency = "PLN";

    private LocalDateTime expectedCloseDate;

    @Column(nullable = false)
    private String status = "open"; // open, won, lost

    @Column(nullable = false)
    private Integer priority = 3; // 1=High, 2=Medium, 3=Low

    private LocalDateTime wonAt;
    private LocalDateTime lostAt;
    private String lostReason;

    @Column(name = "user_id")
    private Long userId; // ID użytkownika będącego właścicielem deal'a

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

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
