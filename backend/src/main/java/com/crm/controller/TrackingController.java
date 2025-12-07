package com.crm.controller;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import com.crm.service.WorkflowAutomationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@RestController
@RequestMapping("/api/track")
@RequiredArgsConstructor
@Slf4j
public class TrackingController {

    private final EmailRepository emailRepository;
    private final ContactRepository contactRepository;
    private final WorkflowAutomationService workflowAutomationService;
    
    // 1x1 transparent PNG pixel
    private static final byte[] PIXEL_BYTES = {
        (byte)0x89, (byte)0x50, (byte)0x4E, (byte)0x47, (byte)0x0D, (byte)0x0A, (byte)0x1A, (byte)0x0A,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x0D, (byte)0x49, (byte)0x48, (byte)0x44, (byte)0x52,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x01, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x01,
        (byte)0x08, (byte)0x06, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x1F, (byte)0x15, (byte)0xC4,
        (byte)0x89, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x0A, (byte)0x49, (byte)0x44, (byte)0x41,
        (byte)0x54, (byte)0x78, (byte)0x9C, (byte)0x63, (byte)0x00, (byte)0x01, (byte)0x00, (byte)0x00,
        (byte)0x05, (byte)0x00, (byte)0x01, (byte)0x0D, (byte)0x0A, (byte)0x2D, (byte)0xB4, (byte)0x00,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x49, (byte)0x45, (byte)0x4E, (byte)0x44, (byte)0xAE,
        (byte)0x42, (byte)0x60, (byte)0x82
    };

    @GetMapping("/pixel.png")
    public ResponseEntity<byte[]> trackEmail(@RequestParam(required = false) String id) {
        if (id != null && !id.isEmpty()) {
            try {
                // Find email by tracking ID
                Optional<Email> emailOpt = emailRepository.findByTrackingId(id);
                if (emailOpt.isPresent()) {
                    Email email = emailOpt.get();
                    
                    // Update stats
                    boolean firstOpen = !Boolean.TRUE.equals(email.getIsOpened());
                    if (firstOpen) {
                        email.setIsOpened(true);
                        email.setOpenedAt(LocalDateTime.now());
                        log.info("Email opened for the first time: {} (Subject: {})", id, email.getSubject());
                    }
                    
                    email.setOpenCount(email.getOpenCount() == null ? 1 : email.getOpenCount() + 1);
                    emailRepository.save(email);
                    
                    // Trigger workflow automation on first open
                    if (firstOpen) {
                        triggerEmailOpenedWorkflow(email);
                    }
                }
            } catch (Exception e) {
                log.error("Error tracking email open: {}", id, e);
            }
        }

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(PIXEL_BYTES);
    }
    
    /**
     * Uruchamia workflow automation dla otwarcia emaila
     */
    private void triggerEmailOpenedWorkflow(Email email) {
        try {
            // Znajdź kontakt na podstawie odbiorcy emaila
            String recipient = email.getRecipient();
            if (recipient == null || recipient.isEmpty()) {
                log.debug("No recipient for email {}, skipping workflow trigger", email.getId());
                return;
            }
            
            // Wyciągnij adres email z formatu "Name <email@example.com>"
            String emailAddress = recipient;
            if (recipient.contains("<") && recipient.contains(">")) {
                emailAddress = recipient.substring(recipient.indexOf("<") + 1, recipient.indexOf(">"));
            }
            
            Optional<Contact> contactOpt = contactRepository.findByEmailIgnoreCase(emailAddress);
            if (contactOpt.isPresent()) {
                Contact contact = contactOpt.get();
                log.info("Triggering EMAIL_OPENED workflow for contact {} and email {}", 
                         contact.getId(), email.getId());
                workflowAutomationService.handleEmailOpened(email, contact);
            } else {
                log.debug("No contact found for email address {}", emailAddress);
            }
        } catch (Exception e) {
            log.error("Error triggering email opened workflow: {}", e.getMessage(), e);
        }
    }

    /**
     * Endpoint do śledzenia kliknięć linków w emailach.
     * Format: /api/track/click?id={trackingId}&url={base64EncodedUrl}
     * Przekierowuje użytkownika na docelowy URL po zarejestrowaniu kliknięcia.
     */
    @GetMapping("/click")
    public ResponseEntity<Void> trackClick(
            @RequestParam(required = false) String id,
            @RequestParam(required = false) String url) {
        
        String targetUrl = decodeTargetUrl(url);
        
        if (id != null && !id.isEmpty()) {
            try {
                Optional<Email> emailOpt = emailRepository.findByTrackingId(id);
                if (emailOpt.isPresent()) {
                    Email email = emailOpt.get();
                    
                    log.info("Link clicked in email: {} (Subject: {}), URL: {}", 
                             id, email.getSubject(), targetUrl);
                    
                    // Trigger workflow automation for click
                    triggerEmailClickedWorkflow(email, targetUrl);
                }
            } catch (Exception e) {
                log.error("Error tracking email click: {}", id, e);
            }
        }
        
        // Redirect to target URL or fallback
        if (targetUrl != null && !targetUrl.isEmpty()) {
            return ResponseEntity.status(302)
                    .location(URI.create(targetUrl))
                    .build();
        } else {
            // Fallback - return 204 No Content if no URL provided
            return ResponseEntity.noContent().build();
        }
    }
    
    /**
     * Dekoduje URL z Base64 lub URLEncoding
     */
    private String decodeTargetUrl(String encodedUrl) {
        if (encodedUrl == null || encodedUrl.isEmpty()) {
            return null;
        }
        
        try {
            // Najpierw spróbuj Base64
            try {
                byte[] decoded = Base64.getUrlDecoder().decode(encodedUrl);
                return new String(decoded, StandardCharsets.UTF_8);
            } catch (IllegalArgumentException e) {
                // Nie jest Base64, spróbuj URL decode
                return URLDecoder.decode(encodedUrl, StandardCharsets.UTF_8.name());
            }
        } catch (UnsupportedEncodingException e) {
            log.warn("Failed to decode URL: {}", encodedUrl);
            return encodedUrl;
        }
    }
    
    /**
     * Uruchamia workflow automation dla kliknięcia linku w emailu
     */
    private void triggerEmailClickedWorkflow(Email email, String clickedUrl) {
        try {
            // Znajdź kontakt na podstawie odbiorcy emaila
            String recipient = email.getRecipient();
            if (recipient == null || recipient.isEmpty()) {
                log.debug("No recipient for email {}, skipping click workflow trigger", email.getId());
                return;
            }
            
            // Wyciągnij adres email z formatu "Name <email@example.com>"
            String emailAddress = recipient;
            if (recipient.contains("<") && recipient.contains(">")) {
                emailAddress = recipient.substring(recipient.indexOf("<") + 1, recipient.indexOf(">"));
            }
            
            Optional<Contact> contactOpt = contactRepository.findByEmailIgnoreCase(emailAddress);
            if (contactOpt.isPresent()) {
                Contact contact = contactOpt.get();
                log.info("Triggering EMAIL_CLICKED workflow for contact {} and email {}, URL: {}", 
                         contact.getId(), email.getId(), clickedUrl);
                workflowAutomationService.handleEmailClicked(email, contact, clickedUrl);
            } else {
                log.debug("No contact found for email address {}", emailAddress);
            }
        } catch (Exception e) {
            log.error("Error triggering email clicked workflow: {}", e.getMessage(), e);
        }
    }
}
