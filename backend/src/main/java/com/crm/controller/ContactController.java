package com.crm.controller;

import com.crm.dto.ContactDto;
import com.crm.mapper.ContactMapper;
import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.service.ContactAutoCreationService;
import com.crm.service.ContactService;
import com.crm.service.DuplicateDetectionService;
import com.crm.service.LeadScoringService;
import com.crm.model.enums.EmailStatus;
import com.crm.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
@Slf4j
public class ContactController {

    private final ContactService contactService;
    private final ContactAutoCreationService contactAutoCreationService;
    private final LeadScoringService leadScoringService;
    private final DuplicateDetectionService duplicateDetectionService;
    private final ContactMapper contactMapper;
    private final com.crm.mapper.EmailMapper emailMapper;
    private final com.crm.service.UserContextService userContextService;
    
    @GetMapping
    public ResponseEntity<List<ContactDto>> getAllContacts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String company,
            @RequestParam(required = false, defaultValue = "false") Boolean showAll) {

        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }

        List<Contact> contacts;

        if (search != null && !search.isEmpty()) {
            contacts = contactService.searchContactsForUser(userId, search);
        } else if (company != null && !company.isEmpty()) {
            contacts = contactService.getContactsByCompanyForUser(userId, company);
        } else if (showAll) {
            contacts = contactService.getAllContactsForUser(userId);
        } else {
            contacts = contactService.getContactsWithEmailStatusForUser(userId, EmailStatus.POSITIVE.getValue());
        }

        List<ContactDto> contactDtos = contacts.stream()
                .map(contactMapper::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(contactDtos);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ContactDto> getContactById(@PathVariable Long id) {
        return contactService.getContactById(id)
                .map(contactMapper::toDto)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + id));
    }
    
    @GetMapping("/{id}/emails")
    public ResponseEntity<Map<String, Object>> getContactEmails(@PathVariable Long id) {
        Contact contact = contactService.getContactById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + id));
        
        List<Email> emails = contactService.getEmailsByContact(contact);
        List<com.crm.dto.EmailDto> emailDtos = emails.stream()
                .map(emailMapper::toDto)
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("contact", contactMapper.toDto(contact));
        response.put("emails", emailDtos);
        response.put("totalEmails", emails.size());
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<ContactDto> createContact(@Valid @RequestBody ContactDto contactDto) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Contact contact = contactMapper.toEntity(contactDto);
        contact.setUserId(userId);
        Contact created = contactService.createContact(contact);
        return ResponseEntity.status(HttpStatus.CREATED).body(contactMapper.toDto(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContactDto> updateContact(@PathVariable Long id, @Valid @RequestBody ContactDto contactDto) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        // Check if user owns this contact
        Contact existing = contactService.getContactById(id).orElse(null);
        if (existing == null || !userId.equals(existing.getUserId())) {
            return ResponseEntity.status(403).build();
        }

        Contact contactDetails = contactMapper.toEntity(contactDto);
        contactDetails.setUserId(userId);
        Contact updated = contactService.updateContact(id, contactDetails);
        return ResponseEntity.ok(contactMapper.toDto(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        // Check if user owns this contact
        Contact contact = contactService.getContactById(id).orElse(null);
        if (contact == null || !userId.equals(contact.getUserId())) {
            return ResponseEntity.status(403).build();
        }

        contactService.deleteContact(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/companies")
    public ResponseEntity<List<String>> getUniqueCompanies() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }

        List<String> companies = contactService.getUniqueCompaniesForUser(userId);
        return ResponseEntity.ok(companies);
    }
    
    @PostMapping("/sync-from-emails")
    public ResponseEntity<Map<String, Object>> syncContactsFromEmails() {
        contactAutoCreationService.syncContactsFromAllEmails();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Synchronizacja kontaktów rozpoczęta w tle");
        response.put("status", "running");

        return ResponseEntity.ok(response);
    }

    /**
     * Update lead score for a single contact
     */
    @PostMapping("/{id}/update-score")
    public ResponseEntity<ContactDto> updateContactScore(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Contact updated = leadScoringService.updateContactScore(id);
        return ResponseEntity.ok(contactMapper.toDto(updated));
    }

    /**
     * Get score breakdown for a contact
     */
    @GetMapping("/{id}/score-breakdown")
    public ResponseEntity<LeadScoringService.ScoreBreakdown> getScoreBreakdown(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        LeadScoringService.ScoreBreakdown breakdown = leadScoringService.getScoreBreakdown(id);
        return ResponseEntity.ok(breakdown);
    }

    /**
     * Import contacts from CSV file
     * Expected CSV format: name,email,company,phone,position
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> importContacts(@RequestParam("file") MultipartFile file) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        if (file.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Plik jest pusty");
            return ResponseEntity.badRequest().body(error);
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".csv") && !filename.endsWith(".txt"))) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Akceptowane są tylko pliki CSV");
            return ResponseEntity.badRequest().body(error);
        }

        List<String> errors = new ArrayList<>();
        int imported = 0;
        int duplicates = 0;
        int lineNumber = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            
            String line;
            boolean headerSkipped = false;
            
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                
                // Skip empty lines
                if (line.trim().isEmpty()) {
                    continue;
                }
                
                // Skip header row (first non-empty line)
                if (!headerSkipped) {
                    String lowerLine = line.toLowerCase();
                    if (lowerLine.contains("name") || lowerLine.contains("email") || 
                        lowerLine.contains("nazwa") || lowerLine.contains("imię")) {
                        headerSkipped = true;
                        continue;
                    }
                    headerSkipped = true;
                }
                
                try {
                    // Parse CSV line (handle both comma and semicolon separators)
                    String[] parts = line.contains(";") ? line.split(";") : line.split(",");
                    
                    if (parts.length < 2) {
                        errors.add("Linia " + lineNumber + ": za mało kolumn (wymagane: nazwa, email)");
                        continue;
                    }
                    
                    String name = parts[0].trim().replaceAll("^\"|\"$", "");
                    String email = parts[1].trim().replaceAll("^\"|\"$", "");
                    String company = parts.length > 2 ? parts[2].trim().replaceAll("^\"|\"$", "") : "";
                    String phone = parts.length > 3 ? parts[3].trim().replaceAll("^\"|\"$", "") : "";
                    String position = parts.length > 4 ? parts[4].trim().replaceAll("^\"|\"$", "") : "";
                    
                    // Validate required fields
                    if (name.isEmpty() || name.length() < 2) {
                        errors.add("Linia " + lineNumber + ": nieprawidłowa nazwa");
                        continue;
                    }
                    if (email.isEmpty() || !email.contains("@")) {
                        errors.add("Linia " + lineNumber + ": nieprawidłowy email");
                        continue;
                    }
                    
                    // Create contact
                    Contact contact = new Contact();
                    contact.setName(name);
                    contact.setEmail(email);
                    contact.setCompany(company.isEmpty() ? "Nieznana" : company);
                    contact.setPhone(phone);
                    contact.setPosition(position);
                    contact.setUserId(userId);
                    
                    Contact created = contactService.createContact(contact);
                    
                    // Check if it was a duplicate (createContact returns existing if duplicate)
                    if (created.getId() != null && created.getCreatedAt() != null) {
                        imported++;
                    } else {
                        duplicates++;
                    }
                    
                } catch (Exception e) {
                    errors.add("Linia " + lineNumber + ": " + e.getMessage());
                    log.warn("Error importing contact at line {}: {}", lineNumber, e.getMessage());
                }
            }
            
        } catch (Exception e) {
            log.error("Error reading CSV file: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Błąd odczytu pliku: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("imported", imported);
        response.put("duplicates", duplicates);
        response.put("errors", errors);
        response.put("totalProcessed", lineNumber);
        response.put("message", String.format("Zaimportowano %d kontaktów (%d duplikatów pominięto)", imported, duplicates));

        return ResponseEntity.ok(response);
    }

    /**
     * Export contacts to CSV format
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportContacts() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<Contact> contacts = contactService.getAllContactsForUser(userId);
        
        StringBuilder csv = new StringBuilder();
        // BOM for Excel UTF-8 compatibility
        csv.append('\uFEFF');
        csv.append("Nazwa;Email;Firma;Telefon;Stanowisko;Score;Liczba emaili;Liczba spotkań\n");
        
        for (Contact contact : contacts) {
            csv.append(escapeCSV(contact.getName())).append(";");
            csv.append(escapeCSV(contact.getEmail())).append(";");
            csv.append(escapeCSV(contact.getCompany())).append(";");
            csv.append(escapeCSV(contact.getPhone())).append(";");
            csv.append(escapeCSV(contact.getPosition())).append(";");
            csv.append(contact.getScore() != null ? contact.getScore() : 0).append(";");
            csv.append(contact.getEmailCount() != null ? contact.getEmailCount() : 0).append(";");
            csv.append(contact.getMeetingCount() != null ? contact.getMeetingCount() : 0).append("\n");
        }

        byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=kontakty.csv")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csvBytes);
    }

    private String escapeCSV(String value) {
        if (value == null) return "";
        // Escape quotes and wrap in quotes if contains special chars
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * Find all duplicate contact groups
     */
    @GetMapping("/duplicates")
    public ResponseEntity<List<DuplicateDetectionService.DuplicateGroup>> findDuplicates() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<DuplicateDetectionService.DuplicateGroup> duplicates = duplicateDetectionService.findAllDuplicates();
        return ResponseEntity.ok(duplicates);
    }

    /**
     * Find duplicates for a specific contact
     */
    @GetMapping("/{id}/duplicates")
    public ResponseEntity<List<DuplicateDetectionService.ContactSummary>> findDuplicatesForContact(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<DuplicateDetectionService.ContactSummary> duplicates = duplicateDetectionService.findDuplicatesForContact(id);
        return ResponseEntity.ok(duplicates);
    }

    /**
     * Merge two contacts
     */
    @PostMapping("/merge")
    public ResponseEntity<ContactDto> mergeContacts(
            @RequestParam Long primaryId,
            @RequestParam Long secondaryId) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Contact merged = duplicateDetectionService.mergeContacts(primaryId, secondaryId);
        return ResponseEntity.ok(contactMapper.toDto(merged));
    }

    /**
     * Restore a soft-deleted contact
     */
    @PostMapping("/{id}/restore")
    public ResponseEntity<ContactDto> restoreContact(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Contact restored = contactService.restoreContact(id);
        return ResponseEntity.ok(contactMapper.toDto(restored));
    }

    /**
     * Get deleted contacts (trash)
     */
    @GetMapping("/deleted")
    public ResponseEntity<List<ContactDto>> getDeletedContacts() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        // For now return empty - would need to implement proper deleted contacts query
        return ResponseEntity.ok(List.of());
    }

    /**
     * Permanently delete a contact (hard delete)
     */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteContact(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        contactService.hardDeleteContact(id);
        return ResponseEntity.noContent().build();
    }
}
