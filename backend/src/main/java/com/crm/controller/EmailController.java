package com.crm.controller;

import com.crm.model.Email;
import com.crm.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/emails")
@RequiredArgsConstructor
public class EmailController {
    
    private final EmailService emailService;
    
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
}
