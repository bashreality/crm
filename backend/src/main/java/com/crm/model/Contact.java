package com.crm.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "contacts", indexes = {
    @Index(name = "idx_contacts_user_id", columnList = "user_id"),
    @Index(name = "idx_contacts_email", columnList = "email"),
    @Index(name = "idx_contacts_company", columnList = "company"),
    @Index(name = "idx_contacts_score", columnList = "score"),
    @Index(name = "idx_contacts_deleted_at", columnList = "deleted_at"),
    @Index(name = "idx_contacts_created_at", columnList = "created_at")
})
@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
public class Contact implements SoftDeletable {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String company;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    private String phone;
    
    private String position; // Stanowisko
    
    @Column(nullable = false)
    private Integer emailCount = 0;

    @Column(nullable = false)
    private Integer meetingCount = 0;

    @Column(nullable = false)
    private Integer dealCount = 0;

    @Column(nullable = false)
    private Integer score = 0; // Lead Score (0-100+)

    @Column(name = "user_id")
    private Long userId; // ID użytkownika będącego właścicielem kontaktu

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "contact_tags",
        joinColumns = @JoinColumn(name = "contact_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @JsonIgnoreProperties("contacts")
    private Set<Tag> tags = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_contacts",
        joinColumns = @JoinColumn(name = "contact_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @JsonIgnoreProperties("contacts")
    private Set<AdminUser> sharedWithUsers = new HashSet<>();

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
