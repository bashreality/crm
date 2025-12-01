package com.crm.controller;

import com.crm.dto.sequence.*;
import com.crm.model.SequenceExecution;
import com.crm.model.ScheduledEmail;
import com.crm.service.SequenceService;
import com.crm.service.ScheduledEmailService;
import com.crm.service.UserContextService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sequences")
@RequiredArgsConstructor
@Slf4j
public class SequenceController {

    private final SequenceService sequenceService;
    private final ScheduledEmailService scheduledEmailService;
    private final UserContextService userContextService;

    // ============ Sequence Management ============

    @GetMapping
    public ResponseEntity<List<SequenceSummaryDto>> getAllSequences() {
        Long userId = userContextService.getCurrentUserId();
        log.info("getAllSequences called for userId: {}", userId);
        return ResponseEntity.ok(sequenceService.getAllSequences());
    }

    @GetMapping("/active")
    public ResponseEntity<List<SequenceSummaryDto>> getActiveSequences() {
        return ResponseEntity.ok(sequenceService.getActiveSequences());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<SequenceDashboardDto> getDashboard() {
        return ResponseEntity.ok(sequenceService.getDashboard());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SequenceDetailsDto> getSequence(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(sequenceService.getSequenceDetails(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<SequenceDetailsDto> createSequence(@RequestBody SequenceRequestDto request) {
        Long userId = userContextService.getCurrentUserId();
        log.info("createSequence called for userId: {}, sequence name: {}", userId, request.getName());
        SequenceDetailsDto created = sequenceService.createSequence(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SequenceDetailsDto> updateSequence(@PathVariable Long id,
                                                             @RequestBody SequenceRequestDto request) {
        try {
            SequenceDetailsDto updated = sequenceService.updateSequence(id, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSequence(@PathVariable Long id) {
        sequenceService.deleteSequence(id);
        return ResponseEntity.noContent().build();
    }

    // ============ Step Management ============

    @GetMapping("/{sequenceId}/steps")
    public ResponseEntity<List<SequenceStepDto>> getSteps(@PathVariable Long sequenceId) {
        return ResponseEntity.ok(sequenceService.getStepsForSequence(sequenceId));
    }

    @PostMapping("/{sequenceId}/steps")
    public ResponseEntity<SequenceStepDto> addStep(@PathVariable Long sequenceId,
                                                   @RequestBody SequenceStepRequestDto request) {
        try {
            SequenceStepDto created = sequenceService.addStep(sequenceId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/steps/{stepId}")
    public ResponseEntity<SequenceStepDto> updateStep(@PathVariable Long stepId,
                                                      @RequestBody SequenceStepRequestDto request) {
        try {
            SequenceStepDto updated = sequenceService.updateStep(stepId, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable Long stepId) {
        sequenceService.deleteStep(stepId);
        return ResponseEntity.noContent().build();
    }

    // ============ Execution Management ============

    @PostMapping("/{sequenceId}/start")
    public ResponseEntity<Map<String, Object>> startSequence(@PathVariable Long sequenceId,
                                                             @RequestBody Map<String, Long> request) {
        log.info("=== REQUEST RECEIVED ===");
        log.info("Request body: {}", request);
        log.info("sequenceId: {}", sequenceId);
        log.info("contactId: {}", request.get("contactId"));
        log.info("dealId: {}", request.get("dealId"));

        try {
            Long contactId = request.get("contactId");
            Long dealId = request.get("dealId"); // Optional: ID szansy powiązanej z sekwencją

            if (contactId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "contactId is required"));
            }

            SequenceExecution execution = sequenceService.startSequenceForContact(sequenceId, contactId, dealId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("executionId", execution.getId());
            response.put("message", "Sequence started successfully");
            if (dealId != null) {
                response.put("dealId", dealId);
            }

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error starting sequence {}", sequenceId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/executions/{executionId}/pause")
    public ResponseEntity<SequenceExecution> pauseExecution(@PathVariable Long executionId) {
        try {
            return ResponseEntity.ok(sequenceService.pauseExecution(executionId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/executions/{executionId}/resume")
    public ResponseEntity<SequenceExecution> resumeExecution(@PathVariable Long executionId) {
        try {
            return ResponseEntity.ok(sequenceService.resumeExecution(executionId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{sequenceId}/executions")
    public ResponseEntity<List<SequenceExecution>> getExecutions(@PathVariable Long sequenceId) {
        return ResponseEntity.ok(sequenceService.getExecutionsForSequence(sequenceId));
    }

    @GetMapping("/executions/{executionId}/scheduled-emails")
    public ResponseEntity<List<ScheduledEmail>> getScheduledEmails(@PathVariable Long executionId) {
        return ResponseEntity.ok(scheduledEmailService.getScheduledEmailsForExecution(executionId));
    }

    // ============ Scheduled Email Management ============

    @PostMapping("/scheduled-emails/{scheduledEmailId}/cancel")
    public ResponseEntity<Map<String, String>> cancelScheduledEmail(@PathVariable Long scheduledEmailId) {
        try {
            scheduledEmailService.cancelScheduledEmail(scheduledEmailId);
            return ResponseEntity.ok(Map.of("message", "Scheduled email cancelled"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/scheduled-emails/{scheduledEmailId}/send-now")
    public ResponseEntity<Map<String, String>> sendNow(@PathVariable Long scheduledEmailId) {
        try {
            scheduledEmailService.sendNow(scheduledEmailId);
            return ResponseEntity.ok(Map.of("message", "Email sent successfully"));
        } catch (MessagingException e) {
            log.error("Failed to send scheduled email {}", scheduledEmailId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send email: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
