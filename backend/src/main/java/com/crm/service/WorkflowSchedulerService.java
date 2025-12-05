package com.crm.service;

import com.crm.model.*;
import com.crm.model.WorkflowRule.TriggerType;
import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Scheduler do obsługi triggerów czasowych (NO_REPLY, itp.)
 * Uruchamia się cyklicznie i sprawdza warunki dla reguł workflow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowSchedulerService {

    private final WorkflowRuleRepository ruleRepository;
    private final WorkflowExecutionKeyRepository executionKeyRepository;
    private final ScheduledEmailRepository scheduledEmailRepository;
    private final SequenceExecutionRepository sequenceExecutionRepository;
    private final EmailRepository emailRepository;
    private final ContactRepository contactRepository;
    private final WorkflowAutomationService workflowAutomationService;

    /**
     * Sprawdza reguły NO_REPLY co godzinę.
     * Szuka kontaktów, którzy nie odpowiedzieli na emaile w określonym czasie.
     */
    @Scheduled(cron = "0 0 * * * ?") // Co godzinę
    @Transactional
    public void processNoReplyRules() {
        log.info("Starting NO_REPLY workflow check...");

        List<WorkflowRule> noReplyRules = ruleRepository
                .findByTriggerTypeAndActiveTrueOrderByPriorityAsc(TriggerType.NO_REPLY);

        if (noReplyRules.isEmpty()) {
            log.debug("No active NO_REPLY rules found");
            return;
        }

        int processed = 0;
        int triggered = 0;

        for (WorkflowRule rule : noReplyRules) {
            try {
                int ruleTriggered = processNoReplyRule(rule);
                triggered += ruleTriggered;
                processed++;
            } catch (Exception e) {
                log.error("Error processing NO_REPLY rule {}: {}", rule.getId(), e.getMessage(), e);
            }
        }

        log.info("NO_REPLY workflow check completed. Processed {} rules, triggered {} executions", 
                 processed, triggered);
    }

    /**
     * Przetwarza pojedynczą regułę NO_REPLY
     */
    private int processNoReplyRule(WorkflowRule rule) {
        Map<String, Object> config = rule.getTriggerConfig();
        if (config == null) {
            config = new HashMap<>();
        }

        // Pobierz konfigurację - ile dni bez odpowiedzi
        int days = config.containsKey("days") ? ((Number) config.get("days")).intValue() : 3;
        Long sequenceId = config.containsKey("sequenceId") ? 
                ((Number) config.get("sequenceId")).longValue() : null;

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);
        int triggered = 0;

        // Znajdź wysłane emaile bez odpowiedzi
        List<ScheduledEmail> sentEmails;
        if (sequenceId != null) {
            // Filtruj po konkretnej sekwencji
            sentEmails = scheduledEmailRepository.findSentEmailsWithoutReply(sequenceId, cutoffDate);
        } else {
            // Wszystkie sekwencje
            sentEmails = scheduledEmailRepository.findAllSentEmailsWithoutReply(cutoffDate);
        }

        log.debug("Found {} sent emails without reply (cutoff: {}, sequenceId: {})", 
                 sentEmails.size(), cutoffDate, sequenceId);

        for (ScheduledEmail scheduledEmail : sentEmails) {
            try {
                // Sprawdź czy już uruchomiono dla tego kontaktu/sekwencji
                Contact contact = scheduledEmail.getExecution().getContact();
                Long execSequenceId = scheduledEmail.getExecution().getSequence().getId();
                
                String executionKey = WorkflowExecutionKey.buildKeyForSequence(
                        contact.getId(), execSequenceId);

                if (executionKeyRepository.existsByRuleIdAndExecutionKey(rule.getId(), executionKey)) {
                    log.debug("Rule {} already executed for contact {} in sequence {}", 
                             rule.getId(), contact.getId(), execSequenceId);
                    continue;
                }

                // Sprawdź czy kontakt odpowiedział na jakikolwiek email z tej sekwencji
                if (hasContactReplied(contact, scheduledEmail.getExecution())) {
                    log.debug("Contact {} has replied in sequence {}, skipping NO_REPLY trigger", 
                             contact.getId(), execSequenceId);
                    continue;
                }

                // Uruchom workflow
                Map<String, Object> triggerData = new HashMap<>();
                triggerData.put("contactId", contact.getId());
                triggerData.put("sequenceId", execSequenceId);
                triggerData.put("scheduledEmailId", scheduledEmail.getId());
                triggerData.put("daysSinceSent", days);
                triggerData.put("sentAt", scheduledEmail.getSentAt().toString());

                workflowAutomationService.executeRule(rule, contact, null, null, triggerData);
                triggered++;

            } catch (Exception e) {
                log.error("Error processing NO_REPLY for scheduled email {}: {}", 
                         scheduledEmail.getId(), e.getMessage());
            }
        }

        return triggered;
    }

    /**
     * Sprawdza czy kontakt odpowiedział na emaile z danej sekwencji
     */
    private boolean hasContactReplied(Contact contact, SequenceExecution execution) {
        // Sprawdź czy są emaile od kontaktu po rozpoczęciu sekwencji
        LocalDateTime sequenceStartDate = execution.getCreatedAt();
        if (sequenceStartDate == null) {
            return false;
        }

        // Znajdź emaile od kontaktu po tej dacie
        List<Email> repliesFromContact = emailRepository
                .findBySenderContainingIgnoreCaseAndReceivedAtAfter(
                        contact.getEmail(), sequenceStartDate);

        return !repliesFromContact.isEmpty();
    }

    /**
     * Czyści stare klucze wykonań (starsze niż 90 dni)
     * Uruchamia się codziennie o 3:00
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupOldExecutionKeys() {
        log.info("Cleaning up old workflow execution keys...");
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90);
        int deleted = executionKeyRepository.deleteOlderThan(cutoffDate);
        log.info("Deleted {} old execution keys", deleted);
    }

    /**
     * Przetwarza reguły LEAD_SCORE_CHANGED - uruchamia się po aktualizacji scoringu
     * Ta metoda jest wywoływana przez LeadScoringService
     */
    @Transactional
    public void processLeadScoreChange(Contact contact, int oldScore, int newScore) {
        if (contact == null) {
            return;
        }

        log.debug("Processing LEAD_SCORE_CHANGED for contact {} ({} -> {})", 
                 contact.getId(), oldScore, newScore);

        List<WorkflowRule> rules = ruleRepository
                .findActiveRulesForTrigger(TriggerType.LEAD_SCORE_CHANGED, contact.getUserId());

        for (WorkflowRule rule : rules) {
            try {
                Map<String, Object> config = rule.getTriggerConfig();
                
                // Sprawdź warunki progu
                if (config != null) {
                    Integer thresholdAbove = config.containsKey("thresholdAbove") ? 
                            ((Number) config.get("thresholdAbove")).intValue() : null;
                    Integer thresholdBelow = config.containsKey("thresholdBelow") ? 
                            ((Number) config.get("thresholdBelow")).intValue() : null;

                    // Trigger gdy przekroczono próg w górę
                    if (thresholdAbove != null && oldScore < thresholdAbove && newScore >= thresholdAbove) {
                        triggerLeadScoreRule(rule, contact, oldScore, newScore, "above");
                    }
                    // Trigger gdy spadło poniżej progu
                    else if (thresholdBelow != null && oldScore >= thresholdBelow && newScore < thresholdBelow) {
                        triggerLeadScoreRule(rule, contact, oldScore, newScore, "below");
                    }
                }
            } catch (Exception e) {
                log.error("Error processing LEAD_SCORE_CHANGED rule {}: {}", rule.getId(), e.getMessage());
            }
        }
    }

    private void triggerLeadScoreRule(WorkflowRule rule, Contact contact, 
                                      int oldScore, int newScore, String direction) {
        Map<String, Object> triggerData = new HashMap<>();
        triggerData.put("contactId", contact.getId());
        triggerData.put("oldScore", oldScore);
        triggerData.put("newScore", newScore);
        triggerData.put("direction", direction);

        workflowAutomationService.executeRule(rule, contact, null, null, triggerData);
    }
}

