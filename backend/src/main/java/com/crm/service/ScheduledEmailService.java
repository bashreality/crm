package com.crm.service;

import com.crm.model.ScheduledEmail;
import com.crm.model.SequenceExecution;
import com.crm.repository.EmailRepository;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledEmailService {

    private final ScheduledEmailRepository scheduledEmailRepository;
    private final SequenceExecutionRepository executionRepository;
    private final EmailSendingService emailSendingService;
    private final EmailRepository emailRepository;

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
     * Wysyła pojedynczy zaplanowany email
     */
    @Transactional
    protected void sendScheduledEmail(ScheduledEmail scheduledEmail) throws MessagingException {
        log.info("Sending scheduled email {} to {}", scheduledEmail.getId(), scheduledEmail.getRecipientEmail());

        SequenceExecution execution = scheduledEmail.getExecution();
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
                    markExecutionCompleted(execution);
                    return;
                }
            }
        }

        try {
            Long sentEmailId = emailSendingService.sendEmail(
                    scheduledEmail.getRecipientEmail(),
                    scheduledEmail.getSubject(),
                    scheduledEmail.getBody()
            );

            scheduledEmail.setStatus("sent");
            scheduledEmail.setSentAt(LocalDateTime.now());
            scheduledEmail.setSentEmailId(sentEmailId);
            scheduledEmailRepository.save(scheduledEmail);

            if (execution != null && scheduledEmail.getStep() != null) {
                updateExecutionProgress(scheduledEmail);
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
    protected void updateExecutionProgress(ScheduledEmail scheduledEmail) {
        SequenceExecution execution = scheduledEmail.getExecution();
        int stepOrder = scheduledEmail.getStep().getStepOrder();

        // Zaktualizuj current step jeśli ten krok jest dalej
        if (stepOrder > execution.getCurrentStep()) {
            execution.setCurrentStep(stepOrder);
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
}
