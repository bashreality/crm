package com.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_contacts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContact {

    @EmbeddedId
    private UserContactId id;

    @Column(name = "added_at", nullable = false)
    private LocalDateTime addedAt;

    @Column(name = "source", nullable = false)
    private String source; // manual, email_positive, email_maybeLater, email_auto, email_negative

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private AdminUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("contactId")
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @PrePersist
    protected void onCreate() {
        if (addedAt == null) {
            addedAt = LocalDateTime.now();
        }
    }
}