package com.crm.service;

import com.crm.model.*;
import com.crm.model.WorkflowExecution.ExecutionStatus;
import com.crm.model.WorkflowRule.ActionType;
import com.crm.model.WorkflowRule.TriggerType;
import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Główny serwis automatyzacji workflow.
 * Obsługuje triggery i wykonuje odpowiednie akcje.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowAutomationService {

    private final WorkflowRuleRepository ruleRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowExecutionKeyRepository executionKeyRepository;
    private final SequenceExecutionRepository sequenceExecutionRepository;
    private final ContactRepository contactRepository;
    private final TaskRepository taskRepository;
    private final DealRepository dealRepository;
    private final TagRepository tagRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final SequenceService sequenceService;
    private final UserContextService userContextService;

    // ==================== TRIGGER HANDLERS ====================

    /**
     * Obsługa triggera: Email został otwarty
     */
    @Async
    @Transactional
    public void handleEmailOpened(Email email, Contact contact) {
        if (email == null || contact == null) {
            log.warn("handleEmailOpened called with null email or contact");
            return;
        }

        log.info("Processing EMAIL_OPENED trigger for email {} and contact {}", 
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("subject", email.getSubject());
        triggerData.put("openedAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.EMAIL_OPENED, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Link w emailu został kliknięty
     */
    @Async
    @Transactional
    public void handleEmailClicked(Email email, Contact contact, String clickedUrl) {
        if (email == null || contact == null) {
            return;
        }

        log.info("Processing EMAIL_CLICKED trigger for email {} and contact {}", 
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("clickedUrl", clickedUrl);
        triggerData.put("clickedAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.EMAIL_CLICKED, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Pozytywna odpowiedź
     */
    @Async
    @Transactional
    public void handlePositiveReply(Email email, Contact contact) {
        if (email == null || contact == null) {
            return;
        }

        log.info("Processing POSITIVE_REPLY trigger for email {} and contact {}", 
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("subject", email.getSubject());
        triggerData.put("repliedAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.POSITIVE_REPLY, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Negatywna odpowiedź
     */
    @Async
    @Transactional
    public void handleNegativeReply(Email email, Contact contact) {
        if (email == null || contact == null) {
            return;
        }

        log.info("Processing NEGATIVE_REPLY trigger for email {} and contact {}", 
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("subject", email.getSubject());

        processTriggeredRules(TriggerType.NEGATIVE_REPLY, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Jakakolwiek odpowiedź
     */
    @Async
    @Transactional
    public void handleAnyReply(Email email, Contact contact) {
        if (email == null || contact == null) {
            return;
        }

        log.info("Processing ANY_REPLY trigger for email {} and contact {}", 
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("status", email.getStatus());

        processTriggeredRules(TriggerType.ANY_REPLY, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Tag dodany do kontaktu
     */
    @Async
    @Transactional
    public void handleTagAdded(Contact contact, Tag tag) {
        if (contact == null || tag == null) {
            return;
        }

        log.info("Processing TAG_ADDED trigger for contact {} and tag {}", 
                 contact.getId(), tag.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("contactId", contact.getId());
        triggerData.put("tagId", tag.getId());
        triggerData.put("tagName", tag.getName());
        triggerData.put("addedAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.TAG_ADDED, contact, null, null, triggerData);
    }

    /**
     * Obsługa triggera: Tag usunięty z kontaktu
     */
    @Async
    @Transactional
    public void handleTagRemoved(Contact contact, Tag tag) {
        if (contact == null || tag == null) {
            return;
        }

        log.info("Processing TAG_REMOVED trigger for contact {} and tag {}", 
                 contact.getId(), tag.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("contactId", contact.getId());
        triggerData.put("tagId", tag.getId());
        triggerData.put("tagName", tag.getName());

        processTriggeredRules(TriggerType.TAG_REMOVED, contact, null, null, triggerData);
    }

    /**
     * Obsługa triggera: Zmiana etapu szansy
     */
    @Async
    @Transactional
    public void handleDealStageChanged(Deal deal, PipelineStage oldStage, PipelineStage newStage) {
        if (deal == null || newStage == null) {
            return;
        }

        log.info("Processing DEAL_STAGE_CHANGED trigger for deal {} from {} to {}", 
                 deal.getId(), 
                 oldStage != null ? oldStage.getName() : "null", 
                 newStage.getName());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("dealId", deal.getId());
        triggerData.put("oldStageId", oldStage != null ? oldStage.getId() : null);
        triggerData.put("oldStageName", oldStage != null ? oldStage.getName() : null);
        triggerData.put("newStageId", newStage.getId());
        triggerData.put("newStageName", newStage.getName());

        Contact contact = deal.getContact();
        processTriggeredRules(TriggerType.DEAL_STAGE_CHANGED, contact, null, deal, triggerData);
    }

    /**
     * Obsługa triggera: Szansa wygrana
     */
    @Async
    @Transactional
    public void handleDealWon(Deal deal) {
        if (deal == null) {
            return;
        }

        log.info("Processing DEAL_WON trigger for deal {}", deal.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("dealId", deal.getId());
        triggerData.put("dealTitle", deal.getTitle());
        triggerData.put("dealValue", deal.getValue());

        Contact contact = deal.getContact();
        processTriggeredRules(TriggerType.DEAL_WON, contact, null, deal, triggerData);
    }

    /**
     * Obsługa triggera: Szansa przegrana
     */
    @Async
    @Transactional
    public void handleDealLost(Deal deal) {
        if (deal == null) {
            return;
        }

        log.info("Processing DEAL_LOST trigger for deal {}", deal.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("dealId", deal.getId());
        triggerData.put("dealTitle", deal.getTitle());

        Contact contact = deal.getContact();
        processTriggeredRules(TriggerType.DEAL_LOST, contact, null, deal, triggerData);
    }

    /**
     * Obsługa triggera: Utworzono nowy kontakt
     */
    @Async
    @Transactional
    public void handleContactCreated(Contact contact) {
        if (contact == null) {
            return;
        }

        log.info("Processing CONTACT_CREATED trigger for contact {}", contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("contactId", contact.getId());
        triggerData.put("contactName", contact.getName());
        triggerData.put("contactEmail", contact.getEmail());
        triggerData.put("createdAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.CONTACT_CREATED, contact, null, null, triggerData);
    }

    /**
     * Obsługa triggera: Sekwencja zakończona
     */
    @Async
    @Transactional
    public void handleSequenceCompleted(SequenceExecution execution) {
        if (execution == null || execution.getContact() == null) {
            return;
        }

        log.info("Processing SEQUENCE_COMPLETED trigger for execution {}", execution.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("executionId", execution.getId());
        triggerData.put("sequenceId", execution.getSequence().getId());
        triggerData.put("sequenceName", execution.getSequence().getName());
        triggerData.put("contactId", execution.getContact().getId());

        processTriggeredRules(TriggerType.SEQUENCE_COMPLETED, execution.getContact(), null, null, triggerData);
    }

    /**
     * Obsługa triggera: Brak odpowiedzi (dla wybranej liczby dni)
     */
    @Async
    @Transactional
    public void handleNoReply(Contact contact, Email email, int daysSinceEmail) {
        if (contact == null || email == null) {
            log.warn("handleNoReply called with null contact or email");
            return;
        }

        log.info("Processing NO_REPLY trigger for email {} and contact {}",
                 email.getId(), contact.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("emailId", email.getId());
        triggerData.put("contactId", contact.getId());
        triggerData.put("subject", email.getSubject());
        triggerData.put("daysSinceEmail", daysSinceEmail);
        triggerData.put("triggeredAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.NO_REPLY, contact, email, null, triggerData);
    }

    /**
     * Obsługa triggera: Zmiana scoring leada
     */
    @Async
    @Transactional
    public void handleLeadScoreChanged(Contact contact, int oldScore, int newScore) {
        if (contact == null) {
            log.warn("handleLeadScoreChanged called with null contact");
            return;
        }

        log.info("Processing LEAD_SCORE_CHANGED trigger for contact {} (old: {}, new: {})",
                 contact.getId(), oldScore, newScore);

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("contactId", contact.getId());
        triggerData.put("oldScore", oldScore);
        triggerData.put("newScore", newScore);
        triggerData.put("scoreDifference", newScore - oldScore);
        triggerData.put("changedAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.LEAD_SCORE_CHANGED, contact, null, null, triggerData);
    }

    /**
     * Obsługa triggera: Krok sekwencji został wysłany
     */
    @Async
    @Transactional
    public void handleSequenceStepSent(SequenceExecution execution, SequenceStep step, Email email) {
        if (execution == null || execution.getContact() == null || step == null) {
            log.warn("handleSequenceStepSent called with null parameters");
            return;
        }

        log.info("Processing SEQUENCE_STEP_SENT trigger for execution {} and step {}",
                 execution.getId(), step.getId());

        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("executionId", execution.getId());
        triggerData.put("sequenceId", execution.getSequence().getId());
        triggerData.put("sequenceName", execution.getSequence().getName());
        triggerData.put("stepId", step.getId());
        triggerData.put("contactId", execution.getContact().getId());
        if (email != null) {
            triggerData.put("emailId", email.getId());
            triggerData.put("emailSubject", email.getSubject());
        }
        triggerData.put("sentAt", LocalDateTime.now().toString());

        processTriggeredRules(TriggerType.SEQUENCE_STEP_SENT, execution.getContact(), email, null, triggerData);
    }

    // ==================== CORE PROCESSING ====================

    /**
     * Przetwarza reguły dla danego triggera
     */
    private void processTriggeredRules(TriggerType triggerType, Contact contact, 
                                        Email email, Deal deal, Map<String, Object> triggerData) {
        Long userId = contact != null ? contact.getUserId() : null;

        List<WorkflowRule> rules = ruleRepository.findActiveRulesForTrigger(triggerType, userId);
        log.debug("Found {} active rules for trigger {} and user {}", rules.size(), triggerType, userId);

        for (WorkflowRule rule : rules) {
            try {
                if (shouldExecuteRule(rule, contact, email, deal, triggerData)) {
                    executeRule(rule, contact, email, deal, triggerData);
                }
            } catch (Exception e) {
                log.error("Error processing rule {} for trigger {}: {}", 
                         rule.getId(), triggerType, e.getMessage(), e);
            }
        }
    }

    /**
     * Sprawdza czy reguła powinna być wykonana
     */
    private boolean shouldExecuteRule(WorkflowRule rule, Contact contact, 
                                      Email email, Deal deal, Map<String, Object> triggerData) {
        // Sprawdź warunki z konfiguracji triggera
        Map<String, Object> config = rule.getTriggerConfig();
        if (config != null && !config.isEmpty()) {
            // Sprawdź filtr tagId
            if (config.containsKey("tagId") && triggerData.containsKey("tagId")) {
                Long configTagId = ((Number) config.get("tagId")).longValue();
                Long actualTagId = ((Number) triggerData.get("tagId")).longValue();
                if (!configTagId.equals(actualTagId)) {
                    log.debug("Rule {} skipped - tagId mismatch: {} vs {}", 
                             rule.getId(), configTagId, actualTagId);
                    return false;
                }
            }

            // Sprawdź filtr sequenceId
            if (config.containsKey("sequenceId") && email != null) {
                // Sprawdź czy email jest z danej sekwencji
                // To wymaga dodatkowej logiki powiązania emaila z sekwencją
            }
        }

        // Sprawdź czy nie wykonano już dla tego kontekstu (jeśli nie pozwalamy na wielokrotne)
        if (!Boolean.TRUE.equals(rule.getAllowMultipleExecutions())) {
            String executionKey = buildExecutionKey(rule, contact, email, deal);
            if (executionKeyRepository.existsByRuleIdAndExecutionKey(rule.getId(), executionKey)) {
                log.debug("Rule {} already executed for key {}", rule.getId(), executionKey);
                return false;
            }
        }

        return true;
    }

    /**
     * Buduje klucz wykonania dla deduplikacji
     */
    private String buildExecutionKey(WorkflowRule rule, Contact contact, Email email, Deal deal) {
        StringBuilder key = new StringBuilder();
        
        if (contact != null) {
            key.append("c").append(contact.getId());
        }
        if (email != null) {
            key.append("_e").append(email.getId());
        }
        if (deal != null) {
            key.append("_d").append(deal.getId());
        }
        
        return key.toString();
    }

    /**
     * Wykonuje regułę workflow
     */
    @Transactional
    public void executeRule(WorkflowRule rule, Contact contact, Email email, 
                           Deal deal, Map<String, Object> triggerData) {
        log.info("Executing rule {} ({}) for contact {}", 
                 rule.getId(), rule.getName(), contact != null ? contact.getId() : "null");

        // Utwórz wpis wykonania
        WorkflowExecution execution = new WorkflowExecution();
        execution.setRule(rule);
        execution.setContact(contact);
        execution.setEmail(email);
        execution.setDeal(deal);
        execution.setTriggerData(triggerData);
        execution.setStatus(ExecutionStatus.RUNNING);
        execution = executionRepository.save(execution);

        try {
            // Zapisz klucz wykonania
            String executionKey = buildExecutionKey(rule, contact, email, deal);
            WorkflowExecutionKey keyEntity = new WorkflowExecutionKey();
            keyEntity.setRuleId(rule.getId());
            keyEntity.setExecutionKey(executionKey);
            executionKeyRepository.save(keyEntity);

            // Wykonaj akcję
            Map<String, Object> result = executeAction(rule, contact, email, deal);
            
            // Zaktualizuj wykonanie
            execution.setActionResult(result);
            execution.markCompleted();
            executionRepository.save(execution);

            // Zaktualizuj licznik reguły
            ruleRepository.incrementExecutionCount(rule.getId(), LocalDateTime.now());

            log.info("Rule {} executed successfully for contact {}", rule.getId(), 
                     contact != null ? contact.getId() : "null");

        } catch (Exception e) {
            log.error("Error executing rule {}: {}", rule.getId(), e.getMessage(), e);
            execution.markFailed(e.getMessage());
            executionRepository.save(execution);
        }
    }

    // ==================== ACTION HANDLERS ====================

    /**
     * Wykonuje akcję zdefiniowaną w regule
     */
    private Map<String, Object> executeAction(WorkflowRule rule, Contact contact, 
                                               Email email, Deal deal) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> config = rule.getActionConfig();
        ActionType actionType = rule.getActionType();

        switch (actionType) {
            case START_SEQUENCE:
                result = executeStartSequence(config, contact, deal);
                break;
            case STOP_SEQUENCE:
                result = executeStopSequence(config, contact);
                break;
            case CREATE_TASK:
                result = executeCreateTask(config, contact);
                break;
            case MOVE_DEAL:
                result = executeMoveDeal(config, deal);
                break;
            case CREATE_DEAL:
                result = executeCreateDeal(config, contact);
                break;
            case ADD_TAG:
                result = executeAddTag(config, contact);
                break;
            case REMOVE_TAG:
                result = executeRemoveTag(config, contact);
                break;
            case UPDATE_LEAD_SCORE:
                result = executeUpdateLeadScore(config, contact);
                break;
            case SEND_NOTIFICATION:
                result = executeSendNotification(config, contact, email);
                break;
            default:
                log.warn("Unknown action type: {}", actionType);
                result.put("error", "Unknown action type: " + actionType);
        }

        return result;
    }

    private Map<String, Object> executeStartSequence(Map<String, Object> config, Contact contact, Deal deal) {
        Map<String, Object> result = new HashMap<>();
        
        if (config == null || !config.containsKey("sequenceId")) {
            result.put("error", "Missing sequenceId in config");
            return result;
        }

        Long sequenceId = ((Number) config.get("sequenceId")).longValue();
        Long dealId = deal != null ? deal.getId() : null;

        try {
            SequenceExecution execution = sequenceService.startSequenceForContact(
                    sequenceId, contact.getId(), dealId);
            result.put("success", true);
            result.put("executionId", execution.getId());
            result.put("sequenceId", sequenceId);
            log.info("Started sequence {} for contact {}", sequenceId, contact.getId());
        } catch (Exception e) {
            result.put("error", e.getMessage());
            log.error("Failed to start sequence {} for contact {}: {}", 
                     sequenceId, contact.getId(), e.getMessage());
        }

        return result;
    }

    private Map<String, Object> executeStopSequence(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        if (contact == null) {
            result.put("error", "No contact associated with this trigger");
            return result;
        }

        try {
            // Find all executions for this contact
            List<SequenceExecution> executions = sequenceExecutionRepository.findByContactId(contact.getId());

            // Filter by status="active" and optionally by sequenceId if specified in config
            List<SequenceExecution> activeExecutions = new java.util.ArrayList<>();
            for (SequenceExecution exec : executions) {
                if ("active".equals(exec.getStatus())) {
                    // If sequenceId is specified, only pause that one
                    if (config != null && config.containsKey("sequenceId")) {
                        Long specifiedSequenceId = ((Number) config.get("sequenceId")).longValue();
                        if (exec.getSequence().getId().equals(specifiedSequenceId)) {
                            activeExecutions.add(exec);
                        }
                    } else {
                        // Otherwise pause all active sequences
                        activeExecutions.add(exec);
                    }
                }
            }

            if (activeExecutions.isEmpty()) {
                result.put("message", "No active sequences found for contact");
                return result;
            }

            // Pause all matching executions
            for (SequenceExecution execution : activeExecutions) {
                execution.setStatus("paused");
                execution.setPausedAt(LocalDateTime.now());
                sequenceExecutionRepository.save(execution);
                log.info("Paused sequence execution {} for contact {}",
                         execution.getId(), contact.getId());
            }

            result.put("success", true);
            result.put("message", activeExecutions.size() + " sequence(s) paused for contact");
            result.put("executionsPaused", activeExecutions.size());
        } catch (Exception e) {
            result.put("error", e.getMessage());
            log.error("Failed to stop sequences for contact {}: {}",
                     contact.getId(), e.getMessage());
        }

        return result;
    }

    private Map<String, Object> executeCreateTask(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        String title = (String) config.getOrDefault("title", "Automatyczne zadanie");
        String description = (String) config.get("description");
        String type = (String) config.getOrDefault("type", "todo");
        Integer priority = config.containsKey("priority") ? 
                ((Number) config.get("priority")).intValue() : 2;
        Integer dueDays = config.containsKey("dueDays") ? 
                ((Number) config.get("dueDays")).intValue() : 1;

        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setType(type);
        task.setPriority(priority);
        task.setDueDate(LocalDateTime.now().plusDays(dueDays));
        task.setContact(contact);
        task.setCompleted(false);
        
        if (contact != null && contact.getUserId() != null) {
            task.setUserId(contact.getUserId());
        }

        task = taskRepository.save(task);
        
        result.put("success", true);
        result.put("taskId", task.getId());
        result.put("taskTitle", title);
        log.info("Created task '{}' for contact {}", title, contact.getId());

        return result;
    }

    private Map<String, Object> executeMoveDeal(Map<String, Object> config, Deal deal) {
        Map<String, Object> result = new HashMap<>();

        if (deal == null) {
            result.put("error", "No deal associated with this trigger");
            return result;
        }

        if (!config.containsKey("stageId")) {
            result.put("error", "Missing stageId in config");
            return result;
        }

        Long stageId = ((Number) config.get("stageId")).longValue();
        Optional<PipelineStage> stageOpt = pipelineStageRepository.findById(stageId);

        if (stageOpt.isEmpty()) {
            result.put("error", "Stage not found: " + stageId);
            return result;
        }

        PipelineStage oldStage = deal.getStage();
        deal.setStage(stageOpt.get());
        deal.setUpdatedAt(LocalDateTime.now());
        dealRepository.save(deal);

        result.put("success", true);
        result.put("dealId", deal.getId());
        result.put("oldStageId", oldStage != null ? oldStage.getId() : null);
        result.put("newStageId", stageId);
        log.info("Moved deal {} to stage {}", deal.getId(), stageId);

        return result;
    }

    private Map<String, Object> executeCreateDeal(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        String title = (String) config.getOrDefault("title", "Nowa szansa");
        Double value = config.containsKey("value") ? 
                ((Number) config.get("value")).doubleValue() : 0.0;

        Deal deal = new Deal();
        deal.setTitle(title);
        deal.setValue(value);
        deal.setContact(contact);
        deal.setStatus("open");
        deal.setCurrency("PLN");
        
        if (contact != null && contact.getUserId() != null) {
            deal.setUserId(contact.getUserId());
        }

        // Ustaw pierwszy etap domyślnego pipeline'a
        if (config.containsKey("pipelineId")) {
            Long pipelineId = ((Number) config.get("pipelineId")).longValue();
            List<PipelineStage> stages = pipelineStageRepository.findByPipelineIdOrderByPosition(pipelineId);
            if (!stages.isEmpty()) {
                deal.setStage(stages.get(0));
            }
        }

        deal = dealRepository.save(deal);

        result.put("success", true);
        result.put("dealId", deal.getId());
        result.put("dealTitle", title);
        log.info("Created deal '{}' for contact {}", title, contact.getId());

        return result;
    }

    private Map<String, Object> executeAddTag(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        if (!config.containsKey("tagId")) {
            result.put("error", "Missing tagId in config");
            return result;
        }

        Long tagId = ((Number) config.get("tagId")).longValue();
        Optional<Tag> tagOpt = tagRepository.findById(tagId);

        if (tagOpt.isEmpty()) {
            result.put("error", "Tag not found: " + tagId);
            return result;
        }

        Tag tag = tagOpt.get();
        if (contact.getTags() == null || !contact.getTags().contains(tag)) {
            contact.getTags().add(tag);
            contactRepository.save(contact);
        }

        result.put("success", true);
        result.put("tagId", tagId);
        result.put("tagName", tag.getName());
        log.info("Added tag '{}' to contact {}", tag.getName(), contact.getId());

        return result;
    }

    private Map<String, Object> executeRemoveTag(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        if (!config.containsKey("tagId")) {
            result.put("error", "Missing tagId in config");
            return result;
        }

        Long tagId = ((Number) config.get("tagId")).longValue();
        
        if (contact.getTags() != null) {
            contact.getTags().removeIf(t -> t.getId().equals(tagId));
            contactRepository.save(contact);
        }

        result.put("success", true);
        result.put("tagId", tagId);
        log.info("Removed tag {} from contact {}", tagId, contact.getId());

        return result;
    }

    private Map<String, Object> executeUpdateLeadScore(Map<String, Object> config, Contact contact) {
        Map<String, Object> result = new HashMap<>();

        int scoreChange = config.containsKey("scoreChange") ? 
                ((Number) config.get("scoreChange")).intValue() : 0;

        int oldScore = contact.getScore() != null ? contact.getScore() : 0;
        int newScore = Math.max(0, Math.min(100, oldScore + scoreChange));
        
        contact.setScore(newScore);
        contactRepository.save(contact);

        result.put("success", true);
        result.put("oldScore", oldScore);
        result.put("newScore", newScore);
        result.put("change", scoreChange);
        log.info("Updated lead score for contact {}: {} -> {}", contact.getId(), oldScore, newScore);

        return result;
    }

    private Map<String, Object> executeSendNotification(Map<String, Object> config, 
                                                         Contact contact, Email email) {
        Map<String, Object> result = new HashMap<>();

        String message = (String) config.getOrDefault("message", "Nowe zdarzenie workflow");
        // TODO: Implementacja systemu powiadomień (websocket, email do użytkownika, etc.)

        result.put("success", true);
        result.put("message", message);
        result.put("notificationType", "log"); // Na razie tylko logujemy
        log.info("Notification: {} (contact: {}, email: {})", message, 
                 contact != null ? contact.getId() : null,
                 email != null ? email.getId() : null);

        return result;
    }

    // ==================== CRUD OPERATIONS ====================

    public List<WorkflowRule> getAllRulesForUser(Long userId) {
        return ruleRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Optional<WorkflowRule> getRuleById(Long id) {
        return ruleRepository.findById(id);
    }

    @Transactional
    public WorkflowRule createRule(WorkflowRule rule) {
        Long userId = userContextService.getCurrentUserId();
        rule.setUserId(userId);
        return ruleRepository.save(rule);
    }

    @Transactional
    public WorkflowRule updateRule(Long id, WorkflowRule ruleDetails) {
        WorkflowRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));

        rule.setName(ruleDetails.getName());
        rule.setDescription(ruleDetails.getDescription());
        rule.setTriggerType(ruleDetails.getTriggerType());
        rule.setTriggerConfig(ruleDetails.getTriggerConfig());
        rule.setActionType(ruleDetails.getActionType());
        rule.setActionConfig(ruleDetails.getActionConfig());
        rule.setActive(ruleDetails.getActive());
        rule.setPriority(ruleDetails.getPriority());
        rule.setAllowMultipleExecutions(ruleDetails.getAllowMultipleExecutions());

        return ruleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Long id) {
        executionKeyRepository.deleteByRuleId(id);
        ruleRepository.deleteById(id);
    }

    @Transactional
    public WorkflowRule toggleRuleActive(Long id) {
        WorkflowRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));
        rule.setActive(!rule.getActive());
        return ruleRepository.save(rule);
    }

    // ==================== STATISTICS ====================

    public Map<String, Object> getDashboardStats(Long userId) {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalRules", ruleRepository.countByUserIdAndActiveTrue(userId));
        stats.put("totalExecutions", ruleRepository.sumExecutionCountByUserId(userId));
        stats.put("recentExecutions", executionRepository.findTop20ByOrderByCreatedAtDesc());

        return stats;
    }
}

