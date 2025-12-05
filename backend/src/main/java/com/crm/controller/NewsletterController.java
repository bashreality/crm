package com.crm.controller;

import com.crm.model.Campaign;
import com.crm.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Kontroler REST API dla newslettera i kampanii
 */
@RestController
@RequestMapping("/api/newsletter")
@RequiredArgsConstructor
@Slf4j
public class NewsletterController {

    private final NewsletterService newsletterService;

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

    // ==================== CAMPAIGNS ====================

    @GetMapping("/campaigns")
    public ResponseEntity<List<Campaign>> getAllCampaigns() {
        List<Campaign> campaigns = newsletterService.getAllCampaignsForUser();
        return ResponseEntity.ok(campaigns);
    }

    @GetMapping("/campaigns/{id}")
    public ResponseEntity<Campaign> getCampaign(@PathVariable Long id) {
        return newsletterService.getCampaignById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/campaigns")
    public ResponseEntity<Campaign> createCampaign(@RequestBody Campaign campaign) {
        log.info("Creating newsletter campaign: {}", campaign.getName());
        Campaign created = newsletterService.createCampaign(campaign);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/campaigns/{id}")
    public ResponseEntity<Campaign> updateCampaign(
            @PathVariable Long id, 
            @RequestBody Campaign campaign) {
        log.info("Updating newsletter campaign: {}", id);
        Campaign updated = newsletterService.updateCampaign(id, campaign);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/campaigns/{id}/prepare")
    public ResponseEntity<Campaign> prepareCampaign(@PathVariable Long id) {
        log.info("Preparing campaign for sending: {}", id);
        Campaign prepared = newsletterService.prepareCampaign(id);
        return ResponseEntity.ok(prepared);
    }

    @PostMapping("/campaigns/{id}/start")
    public ResponseEntity<Campaign> startCampaign(@PathVariable Long id) {
        log.info("Starting campaign: {}", id);
        Campaign started = newsletterService.startCampaign(id);
        return ResponseEntity.ok(started);
    }

    @PostMapping("/campaigns/{id}/pause")
    public ResponseEntity<Campaign> pauseCampaign(@PathVariable Long id) {
        log.info("Pausing campaign: {}", id);
        Campaign paused = newsletterService.pauseCampaign(id);
        return ResponseEntity.ok(paused);
    }

    @PostMapping("/campaigns/{id}/resume")
    public ResponseEntity<Campaign> resumeCampaign(@PathVariable Long id) {
        log.info("Resuming campaign: {}", id);
        Campaign resumed = newsletterService.resumeCampaign(id);
        return ResponseEntity.ok(resumed);
    }

    @PostMapping("/campaigns/{id}/test")
    public ResponseEntity<Map<String, String>> sendTestEmail(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String testEmail = request.get("email");
        if (testEmail == null || testEmail.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        
        log.info("Sending test email for campaign {} to {}", id, testEmail);
        newsletterService.sendTestEmail(id, testEmail);
        return ResponseEntity.ok(Map.of("message", "Test email sent to " + testEmail));
    }

    @GetMapping("/campaigns/{id}/stats")
    public ResponseEntity<Map<String, Object>> getCampaignStats(@PathVariable Long id) {
        Map<String, Object> stats = newsletterService.getCampaignStats(id);
        return ResponseEntity.ok(stats);
    }

    // ==================== TRACKING ====================

    @GetMapping("/track/open")
    public ResponseEntity<byte[]> trackOpen(@RequestParam String id) {
        try {
            newsletterService.trackOpen(id);
        } catch (Exception e) {
            log.debug("Error tracking open: {}", e.getMessage());
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(PIXEL_BYTES);
    }

    @GetMapping("/track/click")
    public ResponseEntity<Void> trackClick(
            @RequestParam String id,
            @RequestParam String url) {
        try {
            newsletterService.trackClick(id);
        } catch (Exception e) {
            log.debug("Error tracking click: {}", e.getMessage());
        }
        
        // Redirect to original URL
        return ResponseEntity.status(302)
                .header("Location", url)
                .build();
    }

    // ==================== UNSUBSCRIBE ====================

    @GetMapping("/unsubscribe")
    public ResponseEntity<String> showUnsubscribePage(@RequestParam String token) {
        // W produkcji to powinno zwracać stronę HTML
        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Wypisanie z listy mailingowej</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    h1 { color: #333; }
                    form { margin-top: 20px; }
                    textarea { width: 100%; padding: 10px; margin: 10px 0; }
                    button { background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
                    button:hover { background: #dc2626; }
                </style>
            </head>
            <body>
                <h1>Wypisanie z listy mailingowej</h1>
                <p>Czy na pewno chcesz wypisać się z naszej listy mailingowej?</p>
                <form action="/api/newsletter/unsubscribe" method="POST">
                    <input type="hidden" name="token" value="%s">
                    <label for="reason">Powód (opcjonalnie):</label>
                    <textarea name="reason" id="reason" rows="3" placeholder="Dlaczego się wypisujesz?"></textarea>
                    <button type="submit">Wypisz mnie</button>
                </form>
            </body>
            </html>
            """.formatted(token);
        
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<String> processUnsubscribe(
            @RequestParam String token,
            @RequestParam(required = false) String reason) {
        
        try {
            newsletterService.processUnsubscribe(token, reason);
            
            String html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Wypisano pomyślnie</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                        h1 { color: #10b981; }
                    </style>
                </head>
                <body>
                    <h1>✓ Wypisano pomyślnie</h1>
                    <p>Twój adres email został usunięty z naszej listy mailingowej.</p>
                    <p>Nie będziesz już otrzymywać od nas wiadomości.</p>
                </body>
                </html>
                """;
            
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
        } catch (Exception e) {
            log.error("Error processing unsubscribe: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body("Błąd podczas wypisywania: " + e.getMessage());
        }
    }

    @GetMapping("/check-unsubscribed")
    public ResponseEntity<Map<String, Boolean>> checkUnsubscribed(@RequestParam String email) {
        boolean isUnsubscribed = newsletterService.isUnsubscribed(email);
        return ResponseEntity.ok(Map.of("unsubscribed", isUnsubscribed));
    }

    @PostMapping("/resubscribe")
    public ResponseEntity<Map<String, String>> resubscribe(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        
        newsletterService.resubscribe(email);
        return ResponseEntity.ok(Map.of("message", "Email resubscribed successfully"));
    }
}

