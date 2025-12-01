package com.crm.controller;

import com.crm.dto.deals.AISequenceRequest;
import com.crm.dto.deals.AISequenceResponse;
import com.crm.service.AISequenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AISequenceController {

    private final AISequenceService aiSequenceService;

    @PostMapping("/generate-sequence")
    public ResponseEntity<AISequenceResponse> generateSequence(@RequestBody AISequenceRequest request) {
        try {
            log.info("Received AI sequence generation request for deal: {}", request.getDealId());
            AISequenceResponse response = aiSequenceService.generateSequence(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error generating AI sequence", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Ulepsza treść emaila - dodaje personalizację, poprawia styl
     */
    @PostMapping("/improve-email")
    public ResponseEntity<Map<String, String>> improveEmail(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String goal = request.getOrDefault("goal", "general");
            String tone = request.getOrDefault("tone", "professional");
            
            log.info("Improving email content, goal: {}, tone: {}", goal, tone);
            String improved = aiSequenceService.improveEmailContent(content, goal, tone);
            
            return ResponseEntity.ok(Map.of("content", improved));
        } catch (Exception e) {
            log.error("Error improving email", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Generuje temat emaila na podstawie treści
     */
    @PostMapping("/generate-subject")
    public ResponseEntity<Map<String, String>> generateSubject(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String style = request.getOrDefault("style", "professional");
            
            log.info("Generating email subject, style: {}", style);
            String subject = aiSequenceService.generateEmailSubject(content, style);
            
            return ResponseEntity.ok(Map.of("subject", subject));
        } catch (Exception e) {
            log.error("Error generating subject", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Personalizuje treść na podstawie danych kontaktu
     */
    @PostMapping("/personalize")
    public ResponseEntity<Map<String, String>> personalizeContent(@RequestBody Map<String, Object> request) {
        try {
            String content = (String) request.get("content");
            String contactName = (String) request.getOrDefault("contactName", "");
            String company = (String) request.getOrDefault("company", "");
            String position = (String) request.getOrDefault("position", "");
            
            log.info("Personalizing content for: {}, {}", contactName, company);
            String personalized = aiSequenceService.personalizeContent(content, contactName, company, position);
            
            return ResponseEntity.ok(Map.of("content", personalized));
        } catch (Exception e) {
            log.error("Error personalizing content", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Generuje warianty A/B dla treści emaila
     */
    @PostMapping("/generate-variants")
    public ResponseEntity<Map<String, Object>> generateVariants(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            int count = Integer.parseInt(request.getOrDefault("count", "2"));
            
            log.info("Generating {} variants for email", count);
            var variants = aiSequenceService.generateVariants(content, count);
            
            return ResponseEntity.ok(Map.of("variants", variants));
        } catch (Exception e) {
            log.error("Error generating variants", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}