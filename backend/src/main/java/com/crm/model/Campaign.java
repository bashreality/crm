package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Model kampanii emailowej / newslettera.
 * Obsługuje wysyłkę masową emaili z throttlingiem i trackingiem.
 */
@Entity
@Table(name = "campaigns")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    /**
     * Status kampanii: draft, scheduled, sending, paused, completed, cancelled
     */
    @Column(nullable = false)
    private String status = "draft";
    
    /**
     * Typ kampanii: newsletter, promotional, transactional, followup
     */
    @Column(name = "campaign_type", length = 30)
    private String campaignType = "newsletter";
    
    // === Powiązania ===
    
    /**
     * Szablon email użyty w kampanii
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private EmailTemplate template;
    
    /**
     * Konto email do wysyłki
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_account_id")
    private EmailAccount emailAccount;
    
    /**
     * Tag docelowy - kampania będzie wysłana do kontaktów z tym tagiem
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_tag_id")
    private Tag targetTag;
    
    /**
     * ID użytkownika właściciela kampanii
     */
    @Column(name = "user_id")
    private Long userId;
    
    // === Treść (jeśli bez szablonu) ===
    
    @Column(name = "subject", length = 255)
    private String subject;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    // === Planowanie ===
    
    /**
     * Data i godzina zaplanowanej wysyłki
     */
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;
    
    /**
     * Strefa czasowa dla planowania
     */
    @Column(name = "timezone", length = 50)
    private String timezone = "Europe/Warsaw";
    
    // === Throttling ===
    
    /**
     * Maksymalna liczba emaili na godzinę
     */
    @Column(name = "throttle_per_hour")
    private Integer throttlePerHour = 100;
    
    /**
     * Maksymalna liczba emaili na dzień
     */
    @Column(name = "daily_limit")
    private Integer dailyLimit = 1000;
    
    /**
     * Opóźnienie między emailami w sekundach
     */
    @Column(name = "delay_seconds")
    private Integer delaySeconds = 5;
    
    // === Statystyki ===
    
    @Column(nullable = false)
    private Integer totalContacts = 0;
    
    @Column(nullable = false)
    private Integer sentCount = 0;
    
    /**
     * Liczba otwartych emaili
     */
    @Column(name = "opened_count", nullable = false)
    private Integer openedCount = 0;
    
    /**
     * Liczba kliknięć
     */
    @Column(name = "clicked_count", nullable = false)
    private Integer clickedCount = 0;
    
    /**
     * Liczba wypisań (unsubscribe)
     */
    @Column(name = "unsubscribed_count", nullable = false)
    private Integer unsubscribedCount = 0;
    
    /**
     * Liczba błędów/bounces
     */
    @Column(name = "bounced_count", nullable = false)
    private Integer bouncedCount = 0;
    
    /**
     * Liczba skarg spam
     */
    @Column(name = "spam_count", nullable = false)
    private Integer spamCount = 0;
    
    // === Daty ===
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "paused_at")
    private LocalDateTime pausedAt;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // === GDPR ===
    
    /**
     * Czy wymaga potwierdzenia subskrypcji (double opt-in)
     */
    @Column(name = "require_opt_in")
    private Boolean requireOptIn = false;
    
    /**
     * Stopka z linkiem do wypisania
     */
    @Column(name = "unsubscribe_footer", columnDefinition = "TEXT")
    private String unsubscribeFooter;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "draft";
        if (totalContacts == null) totalContacts = 0;
        if (sentCount == null) sentCount = 0;
        if (openedCount == null) openedCount = 0;
        if (clickedCount == null) clickedCount = 0;
        if (unsubscribedCount == null) unsubscribedCount = 0;
        if (bouncedCount == null) bouncedCount = 0;
        if (spamCount == null) spamCount = 0;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // === Metody pomocnicze ===
    
    public double getOpenRate() {
        if (sentCount == null || sentCount == 0) return 0.0;
        return (openedCount != null ? openedCount : 0) * 100.0 / sentCount;
    }
    
    public double getClickRate() {
        if (sentCount == null || sentCount == 0) return 0.0;
        return (clickedCount != null ? clickedCount : 0) * 100.0 / sentCount;
    }
    
    public double getUnsubscribeRate() {
        if (sentCount == null || sentCount == 0) return 0.0;
        return (unsubscribedCount != null ? unsubscribedCount : 0) * 100.0 / sentCount;
    }
    
    public double getBounceRate() {
        if (sentCount == null || sentCount == 0) return 0.0;
        return (bouncedCount != null ? bouncedCount : 0) * 100.0 / sentCount;
    }
    
    public boolean isEditable() {
        return "draft".equals(status);
    }
    
    public boolean canStart() {
        return "draft".equals(status) || "scheduled".equals(status);
    }
    
    public boolean canPause() {
        return "sending".equals(status);
    }
    
    public boolean canResume() {
        return "paused".equals(status);
    }
}
