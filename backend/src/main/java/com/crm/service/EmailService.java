package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EmailService {

    private final EmailRepository emailRepository;
    private final ContactRepository contactRepository;
    private final AIClassificationService aiClassificationService;
    private final UserContextService userContextService;
    @Lazy
    private final WorkflowAutomationService workflowAutomationService;
    
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
        
        String oldStatus = email.getStatus();
        
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
        
        Email savedEmail = emailRepository.save(email);
        
        // Trigger workflow automation przy zmianie statusu
        if (emailDetails.getStatus() != null && !emailDetails.getStatus().equals(oldStatus)) {
            triggerStatusChangeWorkflow(savedEmail, oldStatus, emailDetails.getStatus());
        }
        
        return savedEmail;
    }
    
    /**
     * Uruchamia workflow automation przy zmianie statusu emaila
     */
    private void triggerStatusChangeWorkflow(Email email, String oldStatus, String newStatus) {
        try {
            // Znajdź kontakt na podstawie nadawcy emaila
            String sender = email.getSender();
            if (sender == null || sender.isEmpty()) {
                return;
            }
            
            // Wyciągnij adres email z formatu "Name <email@example.com>"
            String emailAddress = sender;
            if (sender.contains("<") && sender.contains(">")) {
                emailAddress = sender.substring(sender.indexOf("<") + 1, sender.indexOf(">"));
            }
            
            Optional<Contact> contactOpt = contactRepository.findByEmailIgnoreCase(emailAddress);
            if (contactOpt.isEmpty()) {
                log.debug("No contact found for email address {}", emailAddress);
                return;
            }
            
            Contact contact = contactOpt.get();
            log.info("Status changed from {} to {} for email {} - triggering workflow", 
                     oldStatus, newStatus, email.getId());
            
            // Trigger odpowiedni workflow w zależności od nowego statusu
            switch (newStatus) {
                case "positive":
                    workflowAutomationService.handlePositiveReply(email, contact);
                    workflowAutomationService.handleAnyReply(email, contact);
                    break;
                case "negative":
                    workflowAutomationService.handleNegativeReply(email, contact);
                    workflowAutomationService.handleAnyReply(email, contact);
                    break;
                case "neutral":
                case "maybeLater":
                    workflowAutomationService.handleAnyReply(email, contact);
                    break;
                default:
                    // Dla innych statusów nie uruchamiamy workflow
                    break;
            }
        } catch (Exception e) {
            log.error("Error triggering status change workflow: {}", e.getMessage(), e);
        }
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
    public List<Email> getEmailsByFilters(Long accountId, String status, String company, String search, String direction) {
        Long currentUserId = userContextService.getCurrentUserId();
        Long userIdFilter = userContextService.isCurrentUserAdmin() ? null : currentUserId;
        return emailRepository.findByFilters(userIdFilter, accountId, status, company, search, direction);
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
