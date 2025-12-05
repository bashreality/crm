package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Model dla wypisań z list mailingowych (GDPR compliance).
 */
@Entity
@Table(name = "unsubscribes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Unsubscribe {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;
    
    @Column(nullable = false)
    private String email;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private Campaign campaign;
    
    @Column(columnDefinition = "TEXT")
    private String reason;
    
    @Column(name = "unsubscribed_at", nullable = false)
    private LocalDateTime unsubscribedAt;
    
    /**
     * Token do potwierdzenia wypisania (w linkach)
     */
    @Column(unique = true, length = 64)
    private String token;
    
    @PrePersist
    protected void onCreate() {
        unsubscribedAt = LocalDateTime.now();
        if (token == null) {
            token = UUID.randomUUID().toString().replace("-", "");
        }
    }
    
    /**
     * Tworzy nowy unsubscribe dla kontaktu
     */
    public static Unsubscribe create(Contact contact, Campaign campaign, String reason) {
        Unsubscribe unsubscribe = new Unsubscribe();
        unsubscribe.setContact(contact);
        unsubscribe.setEmail(contact.getEmail());
        unsubscribe.setCampaign(campaign);
        unsubscribe.setReason(reason);
        return unsubscribe;
    }
    
    /**
     * Tworzy unsubscribe dla emaila bez kontaktu
     */
    public static Unsubscribe createForEmail(String email, Campaign campaign, String reason) {
        Unsubscribe unsubscribe = new Unsubscribe();
        unsubscribe.setEmail(email);
        unsubscribe.setCampaign(campaign);
        unsubscribe.setReason(reason);
        return unsubscribe;
    }
}

