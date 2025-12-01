package com.crm.service;

import com.crm.model.Email;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Transactional
public class EmailService {

    private final EmailRepository emailRepository;
    private final AIClassificationService aiClassificationService;
    private final UserContextService userContextService;
    
    public List<Email> getAllEmails() {
        return emailRepository.findAll();
    }
    
    public Optional<Email> getEmailById(Long id) {
        return emailRepository.findById(id);
    }
    
    public Email createEmail(Email email) {
        return emailRepository.save(email);
    }
    
    public Email updateEmail(Long id, Email emailDetails) {
        Email email = emailRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Email not found with id: " + id));
        
        // Aktualizuj tylko pola, które nie są null (częściowa aktualizacja)
        if (emailDetails.getSender() != null) {
            email.setSender(emailDetails.getSender());
        }
        if (emailDetails.getCompany() != null) {
            email.setCompany(emailDetails.getCompany());
        }
        if (emailDetails.getSubject() != null) {
            email.setSubject(emailDetails.getSubject());
        }
        if (emailDetails.getPreview() != null) {
            email.setPreview(emailDetails.getPreview());
        }
        if (emailDetails.getContent() != null) {
            email.setContent(emailDetails.getContent());
        }
        if (emailDetails.getStatus() != null) {
            email.setStatus(emailDetails.getStatus());
        }
        
        return emailRepository.save(email);
    }
    
    public void deleteEmail(Long id) {
        emailRepository.deleteById(id);
    }
    
    public List<Email> searchEmails(String query) {
        return emailRepository.findBySenderContainingIgnoreCaseOrSubjectContainingIgnoreCase(query, query);
    }
    
    public List<Email> getEmailsByCompany(String company) {
        return emailRepository.findByCompanyContainingIgnoreCase(company);
    }
    
    public List<Email> getEmailsByStatus(String status) {
        return emailRepository.findByStatus(status);
    }
    
    public List<Email> getEmailsByCompanyAndStatus(String company, String status) {
        return emailRepository.findByCompanyContainingIgnoreCaseAndStatus(company, status);
    }
    
    public List<String> getUniqueCompanies() {
        return emailRepository.findDistinctCompanies();
    }

    public List<Email> getEmailsByAccountId(Long accountId) {
        return emailRepository.findByAccountId(accountId);
    }

    /**
     * Pobiera emaile z zastosowaniem wszystkich filtrów na poziomie bazy danych.
     * Zoptymalizowana metoda - filtrowanie w SQL zamiast w Javie.
     * Automatycznie filtruje według aktualnie zalogowanego użytkownika.
     */
    public List<Email> getEmailsByFilters(Long accountId, String status, String company, String search) {
        Long currentUserId = userContextService.getCurrentUserId();
        Long userIdFilter = userContextService.isCurrentUserAdmin() ? null : currentUserId;
        return emailRepository.findByFilters(userIdFilter, accountId, status, company, search);
    }

    /**
     * Ponownie klasyfikuje wszystkie zapisane maile z użyciem aktualnej logiki AI/fallback.
     * Zwraca statystyki przebiegu.
     */
    public Map<String, Integer> reclassifyAllEmails() {
        List<Email> emails = emailRepository.findAll();
        int processed = 0;
        int updated = 0;

        for (Email email : emails) {
            processed++;
            String subject = email.getSubject() != null ? email.getSubject() : "";
            String content = email.getContent() != null ? email.getContent() : "";
            String newStatus = aiClassificationService.classifyEmail(subject, content);

            if (newStatus != null && !newStatus.equals(email.getStatus())) {
                email.setStatus(newStatus);
                updated++;
            }
        }

        emailRepository.saveAll(emails);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("processed", processed);
        stats.put("updated", updated);
        return stats;
    }
}
