package com.crm.controller;

import com.crm.model.*;
import com.crm.service.SequenceService;
import com.crm.service.ScheduledEmailService;
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

    // ============ Sequence Management ============

    @GetMapping
    public ResponseEntity<List<EmailSequence>> getAllSequences() {
        return ResponseEntity.ok(sequenceService.getAllSequences());
    }

    @GetMapping("/active")
    public ResponseEntity<List<EmailSequence>> getActiveSequences() {
        return ResponseEntity.ok(sequenceService.getActiveSequences());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailSequence> getSequence(@PathVariable Long id) {
        return sequenceService.getSequenceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EmailSequence> createSequence(@RequestBody EmailSequence sequence) {
        EmailSequence created = sequenceService.createSequence(sequence);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailSequence> updateSequence(
            @PathVariable Long id,
            @RequestBody EmailSequence sequence) {
        try {
            EmailSequence updated = sequenceService.updateSequence(id, sequence);
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
    public ResponseEntity<List<SequenceStep>> getSteps(@PathVariable Long sequenceId) {
        return ResponseEntity.ok(sequenceService.getStepsForSequence(sequenceId));
    }

    @PostMapping("/{sequenceId}/steps")
    public ResponseEntity<SequenceStep> addStep(
            @PathVariable Long sequenceId,
            @RequestBody SequenceStep step) {
        try {
            SequenceStep created = sequenceService.addStep(sequenceId, step);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/steps/{stepId}")
    public ResponseEntity<SequenceStep> updateStep(
            @PathVariable Long stepId,
            @RequestBody SequenceStep step) {
        try {
            SequenceStep updated = sequenceService.updateStep(stepId, step);
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
    public ResponseEntity<Map<String, Object>> startSequence(
            @PathVariable Long sequenceId,
            @RequestBody Map<String, Long> request) {
        try {
            Long contactId = request.get("contactId");
            if (contactId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "contactId is required"));
            }

            SequenceExecution execution = sequenceService.startSequenceForContact(sequenceId, contactId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("executionId", execution.getId());
            response.put("message", "Sequence started successfully");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error starting sequence {}", sequenceId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/executions/{executionId}/pause")
    public ResponseEntity<SequenceExecution> pauseExecution(@PathVariable Long executionId) {
        try {
            SequenceExecution paused = sequenceService.pauseExecution(executionId);
            return ResponseEntity.ok(paused);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/executions/{executionId}/resume")
    public ResponseEntity<SequenceExecution> resumeExecution(@PathVariable Long executionId) {
        try {
            SequenceExecution resumed = sequenceService.resumeExecution(executionId);
            return ResponseEntity.ok(resumed);
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
