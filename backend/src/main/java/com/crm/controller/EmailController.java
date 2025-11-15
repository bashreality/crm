package com.crm.controller;

import com.crm.model.Email;
import com.crm.service.EmailService;
import com.crm.service.EmailSendingService;
import com.crm.service.AIReplyService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/emails")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;
    private final EmailSendingService emailSendingService;
    private final AIReplyService aiReplyService;
    
    @GetMapping
    public ResponseEntity<List<Email>> getAllEmails(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String status) {
        
        List<Email> emails;
        
        // Obsługa kombinacji filtrów
        if (search != null && !search.isEmpty()) {
            // Jeśli jest search, użyj search i zastosuj dodatkowe filtry manualnie
            emails = emailService.searchEmails(search);
            if (company != null && !company.isEmpty()) {
                emails = emails.stream()
                    .filter(e -> e.getCompany().toLowerCase().contains(company.toLowerCase()))
                    .collect(Collectors.toList());
            }
            if (status != null && !status.isEmpty()) {
                emails = emails.stream()
                    .filter(e -> e.getStatus().equals(status))
                    .collect(Collectors.toList());
            }
        } else if (company != null && !company.isEmpty() && status != null && !status.isEmpty()) {
            // Oba filtry: company i status
            emails = emailService.getEmailsByCompanyAndStatus(company, status);
        } else if (company != null && !company.isEmpty()) {
            // Tylko company
            emails = emailService.getEmailsByCompany(company);
        } else if (status != null && !status.isEmpty()) {
            // Tylko status
            emails = emailService.getEmailsByStatus(status);
        } else {
            // Brak filtrów
            emails = emailService.getAllEmails();
        }
        
        return ResponseEntity.ok(emails);
    }
    
    @GetMapping("/companies")
    public ResponseEntity<List<String>> getUniqueCompanies() {
        List<String> companies = emailService.getUniqueCompanies();
        return ResponseEntity.ok(companies);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Email> getEmailById(@PathVariable Long id) {
        return emailService.getEmailById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Email> createEmail(@RequestBody Email email) {
        Email created = emailService.createEmail(email);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Email> updateEmail(@PathVariable Long id, @RequestBody Email email) {
        try {
            Email updated = emailService.updateEmail(id, email);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmail(@PathVariable Long id) {
        emailService.deleteEmail(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Generuje AI sugestię odpowiedzi na email
     */
    @PostMapping("/{id}/suggest-reply")
    public ResponseEntity<Map<String, String>> suggestReply(@PathVariable Long id) {
        try {
            Email originalEmail = emailService.getEmailById(id)
                    .orElseThrow(() -> new RuntimeException("Email not found"));

            String suggestion = aiReplyService.generateReplySuggestion(
                    originalEmail.getSubject(),
                    originalEmail.getContent(),
                    originalEmail.getSender()
            );

            Map<String, String> response = new HashMap<>();
            response.put("suggestion", suggestion);
            response.put("subject", "Re: " + originalEmail.getSubject());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error generating reply suggestion for email {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate reply suggestion"));
        }
    }

    /**
     * Wysyła odpowiedź na email
     */
    @PostMapping("/{id}/reply")
    public ResponseEntity<Map<String, Object>> sendReply(
            @PathVariable Long id,
            @RequestBody Map<String, String> replyData) {
        try {
            Email originalEmail = emailService.getEmailById(id)
                    .orElseThrow(() -> new RuntimeException("Email not found"));

            String subject = replyData.get("subject");
            String body = replyData.get("body");

            if (subject == null || body == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Subject and body are required"));
            }

            // Budujemy nagłówek References dla wątku
            String references = buildReferences(originalEmail);

            // Wysyłamy odpowiedź
            Long sentEmailId = emailSendingService.sendReply(
                    originalEmail.getSender(),
                    subject,
                    body,
                    originalEmail.getMessageId(),
                    references
            );

            // Opcjonalnie: aktualizuj status oryginalnego emaila
            originalEmail.setStatus("replied");
            emailService.updateEmail(id, originalEmail);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sentEmailId", sentEmailId);
            response.put("message", "Reply sent successfully");

            return ResponseEntity.ok(response);
        } catch (MessagingException e) {
            log.error("Failed to send reply for email {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send email: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Error sending reply for email {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error"));
        }
    }

    /**
     * Buduje nagłówek References dla wątku email
     */
    private String buildReferences(Email originalEmail) {
        String messageId = originalEmail.getMessageId();
        String existingReferences = originalEmail.getReferences();

        if (messageId == null) {
            return existingReferences;
        }

        if (existingReferences == null || existingReferences.isEmpty()) {
            return messageId;
        }

        // Dodaj messageId do istniejących references
        return existingReferences + " " + messageId;
    }
}
