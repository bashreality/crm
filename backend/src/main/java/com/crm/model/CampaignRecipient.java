package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Odbiorca kampanii - śledzi status wysyłki dla każdego kontaktu.
 */
@Entity
@Table(name = "campaign_recipients", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"campaign_id", "contact_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CampaignRecipient {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", nullable = false)
    private Contact contact;
    
    /**
     * Status wysyłki: pending, sent, opened, clicked, bounced, unsubscribed
     */
    @Column(nullable = false, length = 30)
    private String status = "pending";
    
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    
    @Column(name = "opened_at")
    private LocalDateTime openedAt;
    
    @Column(name = "clicked_at")
    private LocalDateTime clickedAt;
    
    @Column(name = "unsubscribed_at")
    private LocalDateTime unsubscribedAt;
    
    @Column(name = "bounced_at")
    private LocalDateTime bouncedAt;
    
    @Column(name = "bounce_reason", columnDefinition = "TEXT")
    private String bounceReason;
    
    /**
     * Unikalny ID do trackingu (w pixelu/linkach)
     */
    @Column(name = "tracking_id", length = 64)
    private String trackingId;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "pending";
    }
    
    public void markSent() {
        this.status = "sent";
        this.sentAt = LocalDateTime.now();
    }
    
    public void markOpened() {
        if (!"clicked".equals(this.status) && !"unsubscribed".equals(this.status)) {
            this.status = "opened";
        }
        if (this.openedAt == null) {
            this.openedAt = LocalDateTime.now();
        }
    }
    
    public void markClicked() {
        if (!"unsubscribed".equals(this.status)) {
            this.status = "clicked";
        }
        if (this.clickedAt == null) {
            this.clickedAt = LocalDateTime.now();
        }
    }
    
    public void markBounced(String reason) {
        this.status = "bounced";
        this.bouncedAt = LocalDateTime.now();
        this.bounceReason = reason;
    }
    
    public void markUnsubscribed() {
        this.status = "unsubscribed";
        this.unsubscribedAt = LocalDateTime.now();
    }
}

