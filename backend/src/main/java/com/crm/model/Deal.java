package com.crm.model;

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
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private Pipeline pipeline;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stage_id", nullable = false)
    private PipelineStage stage;

    @Column(nullable = false)
    private Double value = 0.0;

    @Column(nullable = false, length = 3)
    private String currency = "PLN";

    @Column(name = "expected_close_date")
    private LocalDateTime expectedCloseDate;

    @Column(nullable = false, length = 20)
    private String status = "open"; // open, won, lost

    @Column(nullable = false)
    private Integer priority = 3; // 1=High, 2=Medium, 3=Low

    @Column(name = "won_at")
    private LocalDateTime wonAt;

    @Column(name = "lost_at")
    private LocalDateTime lostAt;

    @Column(name = "lost_reason", columnDefinition = "TEXT")
    private String lostReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
