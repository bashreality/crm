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
 * Model reguly automatyzacji workflow.
 * Definuje trigger (warunek) i akcję do wykonania gdy warunek jest spełniony.
 * 
 * Przykładowe triggery:
 * - EMAIL_OPENED: Kontakt otworzył email
 * - NO_REPLY: Brak odpowiedzi przez X dni
 * - POSITIVE_REPLY: Pozytywna odpowiedź od kontaktu
 * - TAG_ADDED: Dodano tag do kontaktu
 * - DEAL_STAGE_CHANGED: Zmiana etapu szansy
 * - CONTACT_CREATED: Utworzono nowy kontakt
 * 
 * Przykładowe akcje:
 * - START_SEQUENCE: Uruchom sekwencję email
 * - CREATE_TASK: Utwórz zadanie
 * - MOVE_DEAL: Przenieś szansę do innego etapu
 * - ADD_TAG: Dodaj tag do kontaktu
 * - SEND_NOTIFICATION: Wyślij powiadomienie
 * - UPDATE_LEAD_SCORE: Zaktualizuj scoring leada
 */
@Entity
@Table(name = "workflow_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "trigger_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TriggerType triggerType;

    /**
     * Konfiguracja triggera w formacie JSON.
     * Przykłady:
     * - EMAIL_OPENED: {"sequenceId": 1} - reaguj tylko na otwarcia z tej sekwencji
     * - NO_REPLY: {"days": 3, "sequenceId": 1} - brak odpowiedzi przez 3 dni w sekwencji
     * - TAG_ADDED: {"tagId": 5} - reaguj gdy dodano konkretny tag
     * - POSITIVE_REPLY: {} - reaguj na wszystkie pozytywne odpowiedzi
     */
    @Type(JsonType.class)
    @Column(name = "trigger_config", columnDefinition = "jsonb")
    private Map<String, Object> triggerConfig;

    @Column(name = "action_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ActionType actionType;

    /**
     * Konfiguracja akcji w formacie JSON.
     * Przykłady:
     * - START_SEQUENCE: {"sequenceId": 2}
     * - CREATE_TASK: {"title": "Follow-up call", "type": "call", "priority": 1, "dueDays": 1}
     * - MOVE_DEAL: {"stageId": 3}
     * - ADD_TAG: {"tagId": 7}
     * - SEND_NOTIFICATION: {"message": "Nowa pozytywna odpowiedź!", "notifyUserId": 1}
     */
    @Type(JsonType.class)
    @Column(name = "action_config", columnDefinition = "jsonb")
    private Map<String, Object> actionConfig;

    @Column(nullable = false)
    private Boolean active = true;

    /**
     * Priorytet wykonania (niższa wartość = wyższy priorytet).
     * Ważne gdy wiele reguł może być uruchomionych jednocześnie.
     */
    @Column(nullable = false)
    private Integer priority = 100;

    /**
     * Czy reguła może być wykonana wielokrotnie dla tego samego kontaktu/emaila.
     * Domyślnie false - reguła wykonuje się tylko raz.
     */
    @Column(name = "allow_multiple_executions", nullable = false)
    private Boolean allowMultipleExecutions = false;

    /**
     * ID użytkownika będącego właścicielem reguły (dla multi-tenancy).
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * Licznik wykonań reguły.
     */
    @Column(name = "execution_count", nullable = false)
    private Long executionCount = 0L;

    /**
     * Data ostatniego wykonania.
     */
    @Column(name = "last_executed_at")
    private LocalDateTime lastExecutedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (executionCount == null) {
            executionCount = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Typy triggerów (warunków) workflow
     */
    public enum TriggerType {
        EMAIL_OPENED,       // Email został otwarty
        EMAIL_CLICKED,      // Link w emailu został kliknięty
        NO_REPLY,           // Brak odpowiedzi przez X dni
        POSITIVE_REPLY,     // Pozytywna odpowiedź
        NEGATIVE_REPLY,     // Negatywna odpowiedź
        ANY_REPLY,          // Jakakolwiek odpowiedź
        TAG_ADDED,          // Dodano tag do kontaktu
        TAG_REMOVED,        // Usunięto tag z kontaktu
        DEAL_STAGE_CHANGED, // Zmiana etapu szansy
        DEAL_WON,           // Szansa wygrana
        DEAL_LOST,          // Szansa przegrana
        CONTACT_CREATED,    // Utworzono nowy kontakt
        LEAD_SCORE_CHANGED, // Zmiana scoringu leada
        SEQUENCE_COMPLETED, // Zakończono sekwencję
        SEQUENCE_STEP_SENT  // Wysłano krok sekwencji
    }

    /**
     * Typy akcji workflow
     */
    public enum ActionType {
        START_SEQUENCE,     // Uruchom sekwencję email
        STOP_SEQUENCE,      // Zatrzymaj sekwencję
        CREATE_TASK,        // Utwórz zadanie
        MOVE_DEAL,          // Przenieś szansę do innego etapu
        CREATE_DEAL,        // Utwórz nową szansę
        ADD_TAG,            // Dodaj tag do kontaktu
        REMOVE_TAG,         // Usuń tag z kontaktu
        UPDATE_LEAD_SCORE,  // Zaktualizuj scoring (+/- punkty)
        SEND_NOTIFICATION,  // Wyślij powiadomienie do użytkownika
        SEND_EMAIL,         // Wyślij pojedynczy email
        WEBHOOK             // Wywołaj zewnętrzny webhook
    }
}

