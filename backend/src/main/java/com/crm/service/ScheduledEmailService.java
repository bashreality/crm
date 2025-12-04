package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Deal;
import com.crm.model.Email;
import com.crm.model.EmailAccount;
import com.crm.model.PipelineStage;
import com.crm.model.ScheduledEmail;
import com.crm.model.SequenceExecution;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.EmailAccountRepository;
import com.crm.repository.EmailRepository;
import com.crm.repository.PipelineStageRepository;
import com.crm.repository.ScheduledEmailRepository;
import com.crm.repository.SequenceExecutionRepository;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledEmailService {

    private final ScheduledEmailRepository scheduledEmailRepository;
    private final SequenceExecutionRepository executionRepository;
    private final EmailSendingService emailSendingService;
    private final EmailRepository emailRepository;
    private final ContactRepository contactRepository;
    private final DealRepository dealRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final EmailAccountRepository emailAccountRepository;

    /**
     * Automatycznie wysyła zaplanowane emaile co minutę
     */
    @Scheduled(fixedDelay = 60000) // Co 60 sekund
    @Transactional
    public void sendScheduledEmails() {
        LocalDateTime now = LocalDateTime.now();

        // Pobierz wszystkie emaile które powinny być wysłane
        List<ScheduledEmail> emailsToSend = scheduledEmailRepository.findPendingEmailsDueBy(now);

        if (emailsToSend.isEmpty()) {
            log.debug("No scheduled emails to send at {}", now);
            return;
        }

        log.info("Found {} scheduled emails to send", emailsToSend.size());

        for (ScheduledEmail scheduledEmail : emailsToSend) {
            try {
                sendScheduledEmail(scheduledEmail);
            } catch (Exception e) {
                log.error("Failed to send scheduled email {}", scheduledEmail.getId(), e);
                handleSendFailure(scheduledEmail, e);
            }
        }
    }

    /**
     * Proaktywnie sprawdza czy kontakty odpowiedziały i zatrzymuje sekwencje
     * Uruchamiane co 5 minut
     */
    @Scheduled(fixedDelay = 300000) // Co 5 minut
    @Transactional
    public void checkForRepliesAndStopSequences() {
        List<SequenceExecution> activeExecutions = executionRepository.findByStatus("active");

        if (activeExecutions.isEmpty()) {
            log.debug("No active executions to check for replies");
            return;
        }

        log.info("Checking {} active executions for replies", activeExecutions.size());
        int stoppedCount = 0;

        for (SequenceExecution execution : activeExecutions) {
            try {
                if (hasRecipientReplied(execution)) {
                    log.info("Reply detected for execution {} - stopping sequence", execution.getId());
                    stopSequenceOnReply(execution);
                    stoppedCount++;
                }
            } catch (Exception e) {
                log.error("Error checking replies for execution {}", execution.getId(), e);
            }
        }

        if (stoppedCount > 0) {
            log.info("Stopped {} sequences due to replies", stoppedCount);
        }
    }

    /**
     * Wysyła pojedynczy zaplanowany email
     */
    @Transactional
    protected void sendScheduledEmail(ScheduledEmail scheduledEmail) throws MessagingException {
        log.info("Sending scheduled email {} to {}", scheduledEmail.getId(), scheduledEmail.getRecipientEmail());

        SequenceExecution execution = scheduledEmail.getExecution();
        EmailAccount account = execution != null ? execution.getSequence().getEmailAccount() : null;
        if (execution != null) {
            if (!"active".equalsIgnoreCase(execution.getStatus())) {
                skipScheduledEmail(scheduledEmail, "Execution no longer active");
                return;
            }

            if (scheduledEmail.getStep() != null) {
                String stepType = scheduledEmail.getStep().getStepType();
                if (!"email".equalsIgnoreCase(stepType)) {
                    skipScheduledEmail(scheduledEmail, "Unsupported step type: " + stepType);
                    return;
                }

                if (Boolean.TRUE.equals(scheduledEmail.getStep().getSkipIfReplied())
                        && hasRecipientReplied(execution)) {
                    skipScheduledEmail(scheduledEmail, "Contact already replied");
                    stopSequenceOnReply(execution);
                    return;
                }
            }
        }

        try {
            // Pobierz kontakt odbiorcy dla podstawienia zmiennych
            String recipientEmail = scheduledEmail.getRecipientEmail();
            Optional<Contact> contactOpt = contactRepository.findByEmail(recipientEmail);

            String originalSubject = scheduledEmail.getSubject();
            String processedSubject = originalSubject;
            String processedBody = scheduledEmail.getBody();

            // Jeśli znaleziono kontakt, przetworz zmienne szablonowe
            if (contactOpt.isPresent()) {
                Contact contact = contactOpt.get();
                processedSubject = emailSendingService.processTemplateVariables(processedSubject, contact);
                processedBody = emailSendingService.processTemplateVariables(processedBody, contact);
                log.debug("Processed template variables for contact: {}", contact.getEmail());
            } else {
                log.warn("Contact not found for email: {}, sending without variable substitution", recipientEmail);
            }

            // Determine threading behavior:
            // - If step has EMPTY subject -> continue thread (use previous subject with Re: prefix)
            // - If step has NEW subject -> start new thread
            boolean isStepSubjectEmpty = originalSubject == null || originalSubject.trim().isEmpty();
            boolean canContinueThread = execution != null && 
                                        execution.getLastMessageId() != null && 
                                        execution.getLastThreadSubject() != null;
            boolean shouldContinueThread = isStepSubjectEmpty && canContinueThread;

            // If continuing thread, use the thread subject with Re: prefix
            if (shouldContinueThread) {
                String threadSubject = execution.getLastThreadSubject();
                if (!threadSubject.toLowerCase().startsWith("re:")) {
                    processedSubject = "Re: " + threadSubject;
                } else {
                    processedSubject = threadSubject;
                }
                log.debug("Continuing thread with subject: {}", processedSubject);
            }

            Long sentEmailId;
            if (shouldContinueThread) {
                // Send as reply to maintain thread
                log.info("Sending scheduled email {} as reply to thread (messageId: {})", 
                        scheduledEmail.getId(), execution.getLastMessageId());
                if (account != null) {
                    sentEmailId = emailSendingService.sendReplyFromAccount(
                            account,
                            recipientEmail,
                            processedSubject,
                            processedBody,
                            execution.getLastMessageId(),
                            null // References will be built by sendReply
                    );
                } else {
                    sentEmailId = emailSendingService.sendReply(
                            recipientEmail,
                            processedSubject,
                            processedBody,
                            execution.getLastMessageId(),
                            null // References will be built by sendReply
                    );
                }
            } else {
                // Send as new email (new thread)
                log.info("Sending scheduled email {} as new email (new thread)", scheduledEmail.getId());
                if (account != null) {
                    sentEmailId = emailSendingService.sendEmailFromAccount(
                            account,
                            recipientEmail,
                            processedSubject,
                            processedBody
                    );
                } else {
                    sentEmailId = emailSendingService.sendEmail(
                            recipientEmail,
                            processedSubject,
                            processedBody
                    );
                }

                // If starting new thread, reset thread context
                if (execution != null && !isStepSubjectEmpty) {
                    execution.setLastThreadSubject(processedSubject);
                    execution.setIsReplyToThread(false); // Next step will decide based on its subject
                }
            }

            scheduledEmail.setStatus("sent");
            scheduledEmail.setSentAt(LocalDateTime.now());
            scheduledEmail.setSentEmailId(sentEmailId);
            scheduledEmailRepository.save(scheduledEmail);

            if (execution != null && scheduledEmail.getStep() != null) {
                updateExecutionProgress(scheduledEmail, sentEmailId);
            }

            log.info("Successfully sent scheduled email {}", scheduledEmail.getId());
        } catch (MessagingException e) {
            throw e;
        }
    }

    /**
     * Aktualizuje postęp wykonania sekwencji po wysłaniu emaila
     */
    @Transactional
    protected void updateExecutionProgress(ScheduledEmail scheduledEmail, Long sentEmailId) {
        SequenceExecution execution = scheduledEmail.getExecution();
        int stepOrder = scheduledEmail.getStep().getStepOrder();

        // Zaktualizuj current step jeśli ten krok jest dalej
        if (stepOrder > execution.getCurrentStep()) {
            execution.setCurrentStep(stepOrder);
        }

        // Update thread context after sending email
        if (sentEmailId != null) {
            Optional<Email> sentEmailOpt = emailRepository.findById(sentEmailId);
            if (sentEmailOpt.isPresent()) {
                Email sentEmail = sentEmailOpt.get();

                if (sentEmail.getMessageId() != null) {
                    // Always update the last message ID for thread continuity
                    execution.setLastMessageId(sentEmail.getMessageId());
                    
                    // Only update thread subject if this email had a non-empty subject
                    // (i.e., it started a new thread)
                    String originalSubject = scheduledEmail.getStep().getSubject();
                    if (originalSubject != null && !originalSubject.trim().isEmpty()) {
                        execution.setLastThreadSubject(scheduledEmail.getSubject());
                        log.debug("Started new thread for execution {} - subject: {}, messageId: {}",
                                execution.getId(), scheduledEmail.getSubject(), sentEmail.getMessageId());
                    } else {
                        log.debug("Continued thread for execution {} - messageId: {}",
                                execution.getId(), sentEmail.getMessageId());
                    }
                }
            }
        }

        // Sprawdź czy to był ostatni krok
        List<ScheduledEmail> allStepEmails = scheduledEmailRepository.findByExecutionId(execution.getId());
        boolean allSent = allStepEmails.stream()
                .allMatch(e -> "sent".equals(e.getStatus()) || "cancelled".equals(e.getStatus()));

        if (allSent) {
            execution.setStatus("completed");
            execution.setCompletedAt(LocalDateTime.now());
            log.info("Sequence execution {} completed", execution.getId());
        }

        executionRepository.save(execution);
    }

    /**
     * Obsługuje błąd wysyłania
     */
    @Transactional
    protected void handleSendFailure(ScheduledEmail scheduledEmail, Exception e) {
        scheduledEmail.setStatus("failed");
        scheduledEmail.setFailedAt(LocalDateTime.now());
        scheduledEmail.setErrorMessage(e.getMessage());
        scheduledEmailRepository.save(scheduledEmail);

        // Opcjonalnie: pauzuj wykonanie sekwencji po błędzie
        if (scheduledEmail.getExecution() != null) {
            SequenceExecution execution = scheduledEmail.getExecution();
            execution.setStatus("paused");
            execution.setPausedAt(LocalDateTime.now());
            executionRepository.save(execution);
            log.warn("Paused execution {} due to send failure", execution.getId());
        }
    }

    /**
     * Pobiera zaplanowane emaile dla wykonania
     */
    public List<ScheduledEmail> getScheduledEmailsForExecution(Long executionId) {
        return scheduledEmailRepository.findByExecutionId(executionId);
    }

    /**
     * Anuluje zaplanowany email
     */
    @Transactional
    public void cancelScheduledEmail(Long scheduledEmailId) {
        ScheduledEmail email = scheduledEmailRepository.findById(scheduledEmailId)
                .orElseThrow(() -> new RuntimeException("Scheduled email not found"));

        if ("pending".equals(email.getStatus())) {
            email.setStatus("cancelled");
            scheduledEmailRepository.save(email);
            log.info("Cancelled scheduled email {}", scheduledEmailId);
        }
    }

    /**
     * Ręcznie wysyła zaplanowany email (pomija harmonogram)
     */
    @Transactional
    public void sendNow(Long scheduledEmailId) throws MessagingException {
        ScheduledEmail email = scheduledEmailRepository.findById(scheduledEmailId)
                .orElseThrow(() -> new RuntimeException("Scheduled email not found"));

        if ("pending".equals(email.getStatus())) {
            sendScheduledEmail(email);
        } else {
            throw new RuntimeException("Email is not in pending status");
        }
    }

    /**
     * Wysyła testowy email bez zapisywania w bazie (dla testowania sekwencji)
     */
    public void sendTestEmail(Long emailAccountId, String recipientEmail, String subject, String body) throws MessagingException {
        try {
            if (emailAccountId != null) {
                EmailAccount account = emailAccountRepository.findById(emailAccountId)
                        .orElse(null);

                if (account != null) {
                    emailSendingService.sendEmailFromAccount(account, recipientEmail, subject, body);
                    log.info("Sent test email to {} with subject: {} from account {}", recipientEmail, subject, account.getEmailAddress());
                } else {
                    emailSendingService.sendEmail(recipientEmail, subject, body);
                    log.warn("Email account {} not found, sending test email without account", emailAccountId);
                }
            } else {
                emailSendingService.sendEmail(recipientEmail, subject, body);
                log.info("Sent test email to {} with subject: {} (no account specified)", recipientEmail, subject);
            }
        } catch (Exception e) {
            log.error("Failed to send test email to {}: {}", recipientEmail, e.getMessage(), e);
            throw new MessagingException("Failed to send test email: " + e.getMessage());
        }
    }

    private void skipScheduledEmail(ScheduledEmail scheduledEmail, String reason) {
        scheduledEmail.setStatus("cancelled");
        scheduledEmail.setErrorMessage(reason);
        scheduledEmailRepository.save(scheduledEmail);
        log.info("Skipped scheduled email {} - {}", scheduledEmail.getId(), reason);
    }

    private boolean hasRecipientReplied(SequenceExecution execution) {
        String recipient = execution.getRecipientEmail();
        if (recipient == null || recipient.isBlank()) {
            return false;
        }

        return emailRepository.findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(recipient)
                .stream()
                .anyMatch(email -> email.getReceivedAt() != null
                        && email.getReceivedAt().isAfter(execution.getStartedAt()));
    }

    private void markExecutionCompleted(SequenceExecution execution) {
        execution.setStatus("completed");
        execution.setCompletedAt(LocalDateTime.now());
        executionRepository.save(execution);
    }

    /**
     * Zatrzymuje całą sekwencję po otrzymaniu odpowiedzi od kontaktu
     * - Oznacza execution jako "replied"
     * - Anuluje wszystkie pozostałe zaplanowane emaile
     * - Przesuwa deal do następnego etapu w pipeline
     */
    @Transactional
    protected void stopSequenceOnReply(SequenceExecution execution) {
        log.info("Stopping sequence execution {} - contact replied", execution.getId());

        // Oznacz wykonanie jako replied
        execution.setStatus("replied");
        execution.setCompletedAt(LocalDateTime.now());
        executionRepository.save(execution);

        // Jeśli execution ma powiązany deal, przesuń go do następnego etapu
        if (execution.getDealId() != null) {
            advanceDealOnReply(execution.getDealId());
        }

        // Anuluj wszystkie pozostałe pending emaile
        cancelAllRemainingEmails(execution.getId());
    }

    /**
     * Anuluje wszystkie pozostałe (pending) emaile dla danego execution
     */
    @Transactional
    protected void cancelAllRemainingEmails(Long executionId) {
        List<ScheduledEmail> pendingEmails = scheduledEmailRepository.findByExecutionId(executionId)
                .stream()
                .filter(email -> "pending".equals(email.getStatus()))
                .toList();

        if (!pendingEmails.isEmpty()) {
            log.info("Cancelling {} remaining emails for execution {}", pendingEmails.size(), executionId);

            for (ScheduledEmail email : pendingEmails) {
                email.setStatus("cancelled");
                email.setErrorMessage("Sequence stopped - contact replied");
                scheduledEmailRepository.save(email);
            }
        }
    }

    /**
     * Przesuwa deal do następnego etapu w pipeline po otrzymaniu odpowiedzi
     */
    private void advanceDealOnReply(Long dealId) {
        try {
            Deal deal = dealRepository.findById(dealId).orElse(null);
            if (deal == null) {
                log.warn("Deal {} not found, cannot advance on reply", dealId);
                return;
            }

            PipelineStage currentStage = deal.getStage();
            if (currentStage == null) {
                log.warn("Deal {} has no stage, cannot advance to next stage", dealId);
                return;
            }

            // Znajdź wszystkie etapy w tym pipeline
            List<PipelineStage> stages = pipelineStageRepository.findByPipelineIdOrderByPosition(
                currentStage.getPipeline().getId()
            );

            // Znajdź aktualny etap i następny
            for (int i = 0; i < stages.size(); i++) {
                if (stages.get(i).getId().equals(currentStage.getId())) {
                    if (i < stages.size() - 1) {
                        // Jest następny etap - przesuń deal
                        PipelineStage nextStage = stages.get(i + 1);
                        deal.setStage(nextStage);
                        deal.setUpdatedAt(LocalDateTime.now());
                        dealRepository.save(deal);
                        log.info("Deal {} automatically advanced from stage '{}' to '{}' due to email reply",
                            dealId, currentStage.getName(), nextStage.getName());
                    } else {
                        log.info("Deal {} is already in the last stage '{}', cannot advance",
                            dealId, currentStage.getName());
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Error advancing deal {} on email reply: {}", dealId, e.getMessage(), e);
            // Don't rethrow - this is a side effect, not the main operation
        }
    }
}
