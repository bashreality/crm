package com.crm.controller;

import com.crm.model.Contact;
import com.crm.service.ContactService;
import com.crm.service.WoodpeckerApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/woodpecker")
@RequiredArgsConstructor
@Slf4j
public class WoodpeckerController {
    
    private final WoodpeckerApiService woodpeckerApiService;
    private final ContactService contactService;
    
    /**
     * Pobierz informacje o koncie Woodpecker
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe() {
        try {
            Map<String, Object> userInfo = woodpeckerApiService.getMe();
            return ResponseEntity.ok(userInfo);
        } catch (Exception e) {
            log.error("Error fetching Woodpecker user info", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Pobierz listę kampanii
     */
    @GetMapping("/campaigns")
    public ResponseEntity<Map<String, Object>> getCampaigns() {
        try {
            Map<String, Object> campaigns = woodpeckerApiService.getCampaigns();
            // Zawsze zwracaj sukces, nawet jeśli lista jest pusta
            return ResponseEntity.ok(campaigns);
        } catch (RuntimeException e) {
            // Tylko błędy autoryzacji powinny być rzucane jako wyjątki
            log.error("Error fetching campaigns", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("campaigns", new ArrayList<>());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        } catch (Exception e) {
            log.error("Unexpected error fetching campaigns", e);
            // Dla innych błędów zwróć pustą listę
            Map<String, Object> response = new HashMap<>();
            response.put("campaigns", new ArrayList<>());
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * Pobierz szczegóły kampanii
     */
    @GetMapping("/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> getCampaign(@PathVariable Long id) {
        try {
            Map<String, Object> campaign = woodpeckerApiService.getCampaign(id);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            log.error("Error fetching campaign {}", id, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Pobierz prospectów z kampanii
     */
    @GetMapping("/campaigns/{id}/prospects")
    public ResponseEntity<Map<String, Object>> getCampaignProspects(@PathVariable Long id) {
        try {
            Map<String, Object> prospects = woodpeckerApiService.getCampaignProspects(id);
            return ResponseEntity.ok(prospects);
        } catch (Exception e) {
            log.error("Error fetching prospects for campaign {}", id, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Importuj kontakty z CRM do Woodpecker jako prospectów
     */
    @PostMapping("/campaigns/{campaignId}/import-contacts")
    public ResponseEntity<Map<String, Object>> importContactsToCampaign(
            @PathVariable Long campaignId,
            @RequestParam(required = false) String contactIds) {
        
        try {
            // Jeśli nie podano ID kontaktów, pobierz wszystkie
            List<Contact> contacts;
            if (contactIds == null || contactIds.isEmpty()) {
                contacts = contactService.getAllContacts();
            } else {
                contacts = new ArrayList<>();
                // Parsuj string z ID (np. "1,2,3") na listę Long
                String[] ids = contactIds.split(",");
                for (String idStr : ids) {
                    try {
                        Long id = Long.parseLong(idStr.trim());
                        contactService.getContactById(id).ifPresent(contacts::add);
                    } catch (NumberFormatException e) {
                        log.warn("Invalid contact ID: {}", idStr);
                    }
                }
            }
            
            // Konwertuj kontakty na format Woodpecker
            List<Map<String, Object>> prospects = new ArrayList<>();
            for (Contact contact : contacts) {
                Map<String, Object> prospect = new HashMap<>();
                prospect.put("email", contact.getEmail());
                
                // Podziel imię i nazwisko
                String name = contact.getName();
                if (name != null && !name.isEmpty()) {
                    String[] nameParts = name.split("\\s+", 2);
                    if (nameParts.length > 0) {
                        prospect.put("firstName", nameParts[0]);
                    }
                    if (nameParts.length > 1) {
                        prospect.put("lastName", nameParts[1]);
                    } else {
                        prospect.put("lastName", "");
                    }
                } else {
                    prospect.put("firstName", "");
                    prospect.put("lastName", "");
                }
                
                if (contact.getCompany() != null && !contact.getCompany().isEmpty()) {
                    prospect.put("company", contact.getCompany());
                }
                
                if (contact.getPhone() != null && !contact.getPhone().isEmpty()) {
                    prospect.put("phone", contact.getPhone());
                }
                
                if (contact.getPosition() != null && !contact.getPosition().isEmpty()) {
                    prospect.put("position", contact.getPosition());
                }
                
                prospects.add(prospect);
            }
            
            // Dodaj prospectów do kampanii
            Map<String, Object> result = woodpeckerApiService.addProspectsToCampaign(campaignId, prospects);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("imported", prospects.size());
            response.put("woodpeckerResponse", result);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error importing contacts to campaign {}", campaignId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Utwórz nową kampanię w Woodpecker
     */
    @PostMapping("/campaigns")
    public ResponseEntity<Map<String, Object>> createCampaign(@RequestBody Map<String, Object> campaignData) {
        try {
            Map<String, Object> campaign = woodpeckerApiService.createCampaign(campaignData);
            return ResponseEntity.ok(campaign);
        } catch (Exception e) {
            log.error("Error creating campaign", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Pobierz listę wszystkich prospectów
     */
    @GetMapping("/prospects")
    public ResponseEntity<Map<String, Object>> getAllProspects() {
        try {
            Map<String, Object> prospects = woodpeckerApiService.getAllProspects();
            return ResponseEntity.ok(prospects);
        } catch (Exception e) {
            log.error("Error fetching prospects", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Pobierz listę skrzynek pocztowych
     */
    @GetMapping("/mailboxes")
    public ResponseEntity<Map<String, Object>> getMailboxes() {
        try {
            Map<String, Object> mailboxes = woodpeckerApiService.getMailboxes();
            return ResponseEntity.ok(mailboxes);
        } catch (Exception e) {
            log.error("Error fetching mailboxes", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}

