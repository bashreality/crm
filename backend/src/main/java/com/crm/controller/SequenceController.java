package com.crm.controller;

import com.crm.dto.sequence.*;
import com.crm.model.AdminUser;
import com.crm.model.EmailSequence;
import com.crm.model.SequenceExecution;
import com.crm.model.ScheduledEmail;
import com.crm.repository.AdminUserRepository;
import com.crm.repository.EmailSequenceRepository;
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
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sequences")
@RequiredArgsConstructor
@Slf4j
public class SequenceController {

    private final SequenceService sequenceService;
    private final ScheduledEmailService scheduledEmailService;
    private final UserContextService userContextService;
    private final EmailSequenceRepository emailSequenceRepository;
    private final AdminUserRepository adminUserRepository;

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

    @PostMapping("/{sequenceId}/test")
    public ResponseEntity<Map<String, Object>> testSequence(@PathVariable Long sequenceId,
                                                            @RequestBody Map<String, String> request) {
        log.info("Testing sequence {} with email: {}", sequenceId, request.get("testEmail"));

        try {
            String testEmail = request.get("testEmail");
            if (testEmail == null || testEmail.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "testEmail is required"));
            }

            // Prosta walidacja email
            if (!testEmail.contains("@")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid email address"));
            }

            sequenceService.testSequence(sequenceId, testEmail.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test emails sent successfully to " + testEmail);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to test sequence {}: {}", sequenceId, e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

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

    // ============ Sharing Management ============

    @GetMapping("/{id}/shared-users")
    public ResponseEntity<Map<String, Object>> getSharedUsers(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        EmailSequence sequence = emailSequenceRepository.findById(id).orElse(null);
        if (sequence == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can see shared users list
        if (sequence.getUserId() == null || !sequence.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sharedWithAll", sequence.getSharedWithAll() != null ? sequence.getSharedWithAll() : false);
        result.put("sharedUsers", sequence.getSharedWithUsers().stream()
                .map(u -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", u.getId());
                    userInfo.put("username", u.getUsername());
                    userInfo.put("email", u.getEmail());
                    userInfo.put("firstName", u.getFirstName());
                    userInfo.put("lastName", u.getLastName());
                    return userInfo;
                })
                .collect(Collectors.toList()));

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<Map<String, String>> shareSequence(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        EmailSequence sequence = emailSequenceRepository.findById(id).orElse(null);
        if (sequence == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can share
        if (sequence.getUserId() == null || !sequence.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Handle sharing with all users
        if (request.containsKey("sharedWithAll")) {
            Boolean sharedWithAll = (Boolean) request.get("sharedWithAll");
            sequence.setSharedWithAll(sharedWithAll);
        }

        // Handle sharing with specific users
        if (request.containsKey("userIds")) {
            @SuppressWarnings("unchecked")
            List<Integer> userIds = (List<Integer>) request.get("userIds");
            Set<AdminUser> users = userIds.stream()
                    .map(uid -> adminUserRepository.findById(uid.longValue()).orElse(null))
                    .filter(u -> u != null)
                    .collect(Collectors.toSet());
            sequence.setSharedWithUsers(users);
        }

        emailSequenceRepository.save(sequence);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Sequence sharing updated successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/share/{targetUserId}")
    public ResponseEntity<Map<String, String>> unshareSequence(
            @PathVariable Long id,
            @PathVariable Long targetUserId) {

        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        EmailSequence sequence = emailSequenceRepository.findById(id).orElse(null);
        if (sequence == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can unshare
        if (sequence.getUserId() == null || !sequence.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Remove user from shared users
        sequence.getSharedWithUsers().removeIf(u -> u.getId().equals(targetUserId));
        emailSequenceRepository.save(sequence);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User removed from sequence sharing");
        return ResponseEntity.ok(response);
    }
}
