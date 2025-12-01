package com.crm.controller;

import com.crm.service.EmailFetchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/email-fetch")
@RequiredArgsConstructor
@Slf4j
public class EmailFetchController {

    private final EmailFetchService emailFetchService;

    /**
     * Ręczne uruchomienie pobierania maili ze wszystkich aktywnych kont.
     * Działa asynchronicznie aby uniknąć timeoutu.
     */
    @PostMapping("/fetch")
    public ResponseEntity<Map<String, Object>> fetchEmails() {
        log.info("Manual email fetch triggered via API");

        Map<String, Object> response = new HashMap<>();

        try {
            // Pobieraj synchronicznie, żeby użytkownik od razu zobaczył nowe maile
            int newEmails = emailFetchService.fetchEmailsManually();

            response.put("success", true);
            response.put("message", "Pobrano maile");
            response.put("newEmails", newEmails);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to start email fetch", e);
            response.put("success", false);
            response.put("message", "Błąd podczas uruchamiania pobierania: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
