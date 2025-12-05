package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Klucz wykonania workflow - służy do zapobiegania wielokrotnym wykonaniom
 * tej samej reguły dla tego samego kontekstu.
 */
@Entity
@Table(name = "workflow_execution_keys", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"rule_id", "execution_key"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowExecutionKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    /**
     * Unikalny klucz wykonania, np.:
     * - "contact_5_email_123" dla triggera EMAIL_OPENED
     * - "contact_5_sequence_2" dla triggera NO_REPLY
     * - "contact_5" dla triggera TAG_ADDED (wykonaj raz per kontakt)
     */
    @Column(name = "execution_key", nullable = false, length = 255)
    private String executionKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Tworzy klucz dla kontaktu i emaila
     */
    public static String buildKey(Long contactId, Long emailId) {
        return "contact_" + contactId + "_email_" + emailId;
    }

    /**
     * Tworzy klucz dla kontaktu i sekwencji
     */
    public static String buildKeyForSequence(Long contactId, Long sequenceId) {
        return "contact_" + contactId + "_sequence_" + sequenceId;
    }

    /**
     * Tworzy klucz tylko dla kontaktu
     */
    public static String buildKeyForContact(Long contactId) {
        return "contact_" + contactId;
    }

    /**
     * Tworzy klucz dla kontaktu i tagu
     */
    public static String buildKeyForTag(Long contactId, Long tagId) {
        return "contact_" + contactId + "_tag_" + tagId;
    }

    /**
     * Tworzy klucz dla deala
     */
    public static String buildKeyForDeal(Long dealId) {
        return "deal_" + dealId;
    }

    /**
     * Tworzy klucz dla deala i etapu
     */
    public static String buildKeyForDealStage(Long dealId, Long stageId) {
        return "deal_" + dealId + "_stage_" + stageId;
    }
}

