package com.crm.controller;

import com.crm.dto.EmailDto;
import com.crm.mapper.EmailMapper;
import com.crm.model.Contact;
import com.crm.repository.ContactRepository;
import com.crm.model.Email;
import com.crm.service.EmailService;
import com.crm.service.EmailSendingService;
import com.crm.service.AIReplyService;
import com.crm.service.AIClassificationService;
import jakarta.mail.MessagingException;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.crm.model.EmailAccount;
import com.crm.repository.EmailAccountRepository;

@RestController
@RequestMapping("/api/emails")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;
    private final EmailSendingService emailSendingService;
    private final AIReplyService aiReplyService;
    private final AIClassificationService aiClassificationService;
    private final EmailAccountRepository emailAccountRepository;
    private final ContactRepository contactRepository;
    private final com.crm.service.ContactService contactService;
    private final EmailMapper emailMapper;
    
    @GetMapping
    public ResponseEntity<List<EmailDto>> getAllEmails(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long accountId) {

        // Użyj zoptymalizowanego zapytania SQL zamiast filtrowania w Javie
        List<Email> emails = emailService.getEmailsByFilters(accountId, status, company, search);

        // Pobierz kontakty dla nadawców
        Set<String> senderEmails = new HashSet<>();
        for (Email email : emails) {
            // Extract email from "Name <email@example.com>"
            String sender = email.getSender();
            String emailAddress = extractEmail(sender);
            if (emailAddress != null) {
                senderEmails.add(emailAddress.toLowerCase()); // Convert to lowercase for case-insensitive matching
            }
        }

        List<Contact> contacts = contactRepository.findByEmailIn(senderEmails);
        Map<String, Contact> contactMap = contacts.stream()
                .collect(Collectors.toMap(c -> c.getEmail().toLowerCase(), c -> c));

        // Mapuj na DTO i dodaj tagi
        List<EmailDto> emailDtos = emails.stream().map(email -> {
            EmailDto dto = emailMapper.toDto(email);
            String emailAddress = extractEmail(email.getSender());
            if (emailAddress != null) {
                Contact contact = contactMap.get(emailAddress.toLowerCase());
                if (contact != null) {
                    dto.setSenderTags(contact.getTags());
                    dto.setSenderContactId(contact.getId());
                }
            }
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(emailDtos);
    }

    private String extractEmail(String sender) {
        if (sender == null) return null;
        if (sender.contains("<") && sender.contains(">")) {
            return sender.substring(sender.indexOf("<") + 1, sender.indexOf(">"));
        }
        return sender.trim();
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
     * Wysyła nowy email z wybranego konta
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendEmail(@RequestBody Map<String, Object> emailData) {
        try {
            String to = (String) emailData.get("to");
            String subject = (String) emailData.get("subject");
            String body = (String) emailData.get("body");
            Long accountId = emailData.get("accountId") != null ? ((Number) emailData.get("accountId")).longValue() : null;

            if (to == null || subject == null || body == null || accountId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "To, subject, body and accountId are required"));
            }

            EmailAccount account = emailAccountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Email account not found"));

            Long sentEmailId = emailSendingService.sendEmailFromAccount(account, to, subject, body);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sentEmailId", sentEmailId);
            response.put("message", "Email sent successfully");

            return ResponseEntity.ok(response);
        } catch (MessagingException e) {
            log.error("Failed to send email", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send email: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Error sending email", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    /**
     * Ponowna klasyfikacja wszystkich maili z użyciem aktualnej logiki AI.
     */
    @PostMapping("/reclassify")
    public ResponseEntity<Map<String, Integer>> reclassifyAllEmails() {
        try {
            Map<String, Integer> stats = emailService.reclassifyAllEmails();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Failed to reclassify emails", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", 0));
        }
    }

    /**
     * Generuje AI sugestię odpowiedzi na email
     */
    @PostMapping("/{id}/suggest-reply")
    public ResponseEntity<Map<String, String>> suggestReply(@PathVariable Long id) {
        try {
            Email originalEmail = emailService.getEmailById(id)
                    .orElseThrow(() -> new RuntimeException("Email not found"));

            // 1. Znajdź kontakt i historię
            String senderEmailAddress = extractEmail(originalEmail.getSender());
            Contact contact = null;
            List<Email> history = null;
            
            if (senderEmailAddress != null) {
                contact = contactRepository.findByEmail(senderEmailAddress).orElse(null);
                if (contact != null) {
                    history = contactService.getEmailsByContact(contact);
                }
            }

            // 2. Generuj odpowiedź z kontekstem
            String suggestion = aiReplyService.generateReplySuggestion(
                    originalEmail.getSubject(),
                    originalEmail.getContent(),
                    originalEmail.getSender(),
                    contact,
                    history
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

            // Wysyłamy odpowiedź - użyj konta z sygnaturą jeśli dostępne
            Long sentEmailId;
            if (originalEmail.getAccount() != null) {
                sentEmailId = emailSendingService.sendReplyFromAccount(
                        originalEmail.getAccount(),
                        originalEmail.getSender(),
                        subject,
                        body,
                        originalEmail.getMessageId(),
                        references
                );
            } else {
                sentEmailId = emailSendingService.sendReply(
                        originalEmail.getSender(),
                        subject,
                        body,
                        originalEmail.getMessageId(),
                        references
                );
            }

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
        String existingReferences = originalEmail.getReferencesHeader();

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
