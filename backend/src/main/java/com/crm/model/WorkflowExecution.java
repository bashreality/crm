package com.crm.model;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Log wykonania reguły workflow.
 * Służy do audytu i debugowania automatyzacji.
 */
@Entity
@Table(name = "workflow_executions", indexes = {
    @Index(name = "idx_workflow_exec_rule", columnList = "rule_id"),
    @Index(name = "idx_workflow_exec_contact", columnList = "contact_id"),
    @Index(name = "idx_workflow_exec_status", columnList = "status"),
    @Index(name = "idx_workflow_exec_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private WorkflowRule rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_id")
    private Email email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id")
    private Deal deal;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status = ExecutionStatus.PENDING;

    /**
     * Dane kontekstowe triggera - co spowodowało uruchomienie
     */
    @Type(JsonType.class)
    @Column(name = "trigger_data", columnDefinition = "jsonb")
    private Map<String, Object> triggerData;

    /**
     * Dane wynikowe akcji - co zostało wykonane
     */
    @Type(JsonType.class)
    @Column(name = "action_result", columnDefinition = "jsonb")
    private Map<String, Object> actionResult;

    /**
     * Komunikat błędu (jeśli wykonanie się nie powiodło)
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Czas wykonania w milisekundach
     */
    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void markCompleted() {
        this.status = ExecutionStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        if (createdAt != null) {
            this.executionTimeMs = java.time.Duration.between(createdAt, completedAt).toMillis();
        }
    }

    public void markFailed(String errorMessage) {
        this.status = ExecutionStatus.FAILED;
        this.errorMessage = errorMessage;
        this.completedAt = LocalDateTime.now();
        if (createdAt != null) {
            this.executionTimeMs = java.time.Duration.between(createdAt, completedAt).toMillis();
        }
    }

    public void markSkipped(String reason) {
        this.status = ExecutionStatus.SKIPPED;
        this.errorMessage = reason;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Statusy wykonania workflow
     */
    public enum ExecutionStatus {
        PENDING,    // Oczekuje na wykonanie
        RUNNING,    // W trakcie wykonywania
        COMPLETED,  // Wykonano pomyślnie
        FAILED,     // Błąd podczas wykonywania
        SKIPPED     // Pominięto (np. warunek nie spełniony, już wykonano wcześniej)
    }
}

