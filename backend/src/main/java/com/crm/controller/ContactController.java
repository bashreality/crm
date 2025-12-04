package com.crm.controller;

import com.crm.dto.ContactDto;
import com.crm.mapper.ContactMapper;
import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.service.ContactAutoCreationService;
import com.crm.service.ContactService;
import com.crm.model.enums.EmailStatus;
import com.crm.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;
    private final ContactAutoCreationService contactAutoCreationService;
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
}
