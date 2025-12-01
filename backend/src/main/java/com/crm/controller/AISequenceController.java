package com.crm.controller;

import com.crm.dto.deals.AISequenceRequest;
import com.crm.dto.deals.AISequenceResponse;
import com.crm.service.AISequenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}