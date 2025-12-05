package com.crm.controller;

import com.crm.model.WorkflowExecution;
import com.crm.model.WorkflowRule;
import com.crm.repository.WorkflowExecutionRepository;
import com.crm.service.UserContextService;
import com.crm.service.WorkflowAutomationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Kontroler REST API dla zarządzania automatyzacjami workflow
 */
@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
@Slf4j
public class WorkflowController {

    private final WorkflowAutomationService workflowService;
    private final WorkflowExecutionRepository executionRepository;
    private final UserContextService userContextService;

    // ==================== RULES ====================

    /**
     * Pobierz wszystkie reguły użytkownika
     */
    @GetMapping("/rules")
    public ResponseEntity<List<WorkflowRule>> getAllRules() {
        Long userId = userContextService.getCurrentUserId();
        List<WorkflowRule> rules = workflowService.getAllRulesForUser(userId);
        return ResponseEntity.ok(rules);
    }

    /**
     * Pobierz regułę po ID
     */
    @GetMapping("/rules/{id}")
    public ResponseEntity<WorkflowRule> getRuleById(@PathVariable Long id) {
        return workflowService.getRuleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Utwórz nową regułę
     */
    @PostMapping("/rules")
    public ResponseEntity<WorkflowRule> createRule(@RequestBody WorkflowRule rule) {
        log.info("Creating workflow rule: {}", rule.getName());
        WorkflowRule created = workflowService.createRule(rule);
        return ResponseEntity.ok(created);
    }

    /**
     * Zaktualizuj regułę
     */
    @PutMapping("/rules/{id}")
    public ResponseEntity<WorkflowRule> updateRule(
            @PathVariable Long id, 
            @RequestBody WorkflowRule rule) {
        log.info("Updating workflow rule: {}", id);
        WorkflowRule updated = workflowService.updateRule(id, rule);
        return ResponseEntity.ok(updated);
    }

    /**
     * Usuń regułę
     */
    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        log.info("Deleting workflow rule: {}", id);
        workflowService.deleteRule(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Włącz/wyłącz regułę
     */
    @PostMapping("/rules/{id}/toggle")
    public ResponseEntity<WorkflowRule> toggleRule(@PathVariable Long id) {
        log.info("Toggling workflow rule: {}", id);
        WorkflowRule updated = workflowService.toggleRuleActive(id);
        return ResponseEntity.ok(updated);
    }

    // ==================== EXECUTIONS ====================

    /**
     * Pobierz wykonania dla reguły
     */
    @GetMapping("/rules/{ruleId}/executions")
    public ResponseEntity<Page<WorkflowExecution>> getExecutionsForRule(
            @PathVariable Long ruleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WorkflowExecution> executions = executionRepository
                .findByRuleIdOrderByCreatedAtDesc(ruleId, pageable);
        return ResponseEntity.ok(executions);
    }

    /**
     * Pobierz ostatnie wykonania użytkownika
     */
    @GetMapping("/executions")
    public ResponseEntity<Page<WorkflowExecution>> getRecentExecutions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = userContextService.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        Page<WorkflowExecution> executions = executionRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return ResponseEntity.ok(executions);
    }

    // ==================== DASHBOARD ====================

    /**
     * Pobierz statystyki dashboard
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Long userId = userContextService.getCurrentUserId();
        Map<String, Object> stats = workflowService.getDashboardStats(userId);
        return ResponseEntity.ok(stats);
    }

    // ==================== TRIGGER TYPES & ACTION TYPES ====================

    /**
     * Pobierz dostępne typy triggerów
     */
    @GetMapping("/trigger-types")
    public ResponseEntity<WorkflowRule.TriggerType[]> getTriggerTypes() {
        return ResponseEntity.ok(WorkflowRule.TriggerType.values());
    }

    /**
     * Pobierz dostępne typy akcji
     */
    @GetMapping("/action-types")
    public ResponseEntity<WorkflowRule.ActionType[]> getActionTypes() {
        return ResponseEntity.ok(WorkflowRule.ActionType.values());
    }
}

