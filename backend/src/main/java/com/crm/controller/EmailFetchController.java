package com.crm.controller;

import com.crm.service.EmailFetchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/email-fetch")
@RequiredArgsConstructor
public class EmailFetchController {
    
    private final EmailFetchService emailFetchService;
    
    /**
     * Ręczne pobieranie maili
     * POST http://localhost:8080/api/email-fetch/fetch
     */
    @PostMapping("/fetch")
    public ResponseEntity<Map<String, Object>> fetchEmails() {
        try {
            int newEmails = emailFetchService.fetchEmailsManually();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Email fetch completed");
            response.put("newEmails", newEmails);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            response.put("newEmails", 0);
            
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Status połączenia z serwerem email
     * GET http://localhost:8080/api/email-fetch/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("emailServer", "mail.q-prospect.pl");
        response.put("emailAccount", "crm@qprospect.pl");
        response.put("autoFetchEnabled", true);
        response.put("fetchInterval", "5 minutes");
        
        return ResponseEntity.ok(response);
    }
}
