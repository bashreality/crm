package com.crm.controller;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.service.ContactAutoCreationService;
import com.crm.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {
    
    private final ContactService contactService;
    private final ContactAutoCreationService contactAutoCreationService;
    
    @GetMapping
    public ResponseEntity<List<Contact>> getAllContacts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String company) {
        
        List<Contact> contacts;
        
        if (search != null && !search.isEmpty()) {
            contacts = contactService.searchContacts(search);
        } else if (company != null && !company.isEmpty()) {
            contacts = contactService.getContactsByCompany(company);
        } else {
            contacts = contactService.getAllContacts();
        }
        
        return ResponseEntity.ok(contacts);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Contact> getContactById(@PathVariable Long id) {
        return contactService.getContactById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Pobierz konwersację (wszystkie emaile) z danym kontaktem
     * GET /api/contacts/{id}/emails
     */
    @GetMapping("/{id}/emails")
    public ResponseEntity<Map<String, Object>> getContactEmails(@PathVariable Long id) {
        Optional<Contact> contactOpt = contactService.getContactById(id);
        
        if (contactOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Contact contact = contactOpt.get();
        List<Email> emails = contactService.getEmailsByContact(contact);
        
        Map<String, Object> response = new HashMap<>();
        response.put("contact", contact);
        response.put("emails", emails);
        response.put("totalEmails", emails.size());
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<Contact> createContact(@RequestBody Contact contact) {
        Contact created = contactService.createContact(contact);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Contact> updateContact(@PathVariable Long id, @RequestBody Contact contact) {
        try {
            Contact updated = contactService.updateContact(id, contact);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long id) {
        contactService.deleteContact(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Pobierz listę unikalnych firm z kontaktów
     * GET /api/contacts/companies
     */
    @GetMapping("/companies")
    public ResponseEntity<List<String>> getUniqueCompanies() {
        List<String> companies = contactService.getUniqueCompanies();
        return ResponseEntity.ok(companies);
    }
    
    /**
     * Wymuś synchronizację kontaktów ze wszystkich emaili
     * POST /api/contacts/sync-from-emails
     * Synchronizacja jest wykonywana asynchronicznie w tle
     */
    @PostMapping("/sync-from-emails")
    public ResponseEntity<Map<String, Object>> syncContactsFromEmails() {
        try {
            // Uruchom synchronizację asynchronicznie w osobnym wątku
            new Thread(() -> {
                try {
                    contactAutoCreationService.syncContactsFromAllEmails();
                } catch (Exception e) {
                    // Log błędu, ale nie przerywaj
                    e.printStackTrace();
                }
            }).start();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Synchronizacja kontaktów rozpoczęta w tle");
            response.put("status", "running");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Błąd: " + e.getMessage());

            return ResponseEntity.status(500).body(response);
        }
    }
}
