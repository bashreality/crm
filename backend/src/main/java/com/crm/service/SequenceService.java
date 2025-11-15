package com.crm.service;

import com.crm.model.*;
import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SequenceService {

    private final EmailSequenceRepository sequenceRepository;
    private final SequenceStepRepository stepRepository;
    private final SequenceExecutionRepository executionRepository;
    private final ScheduledEmailRepository scheduledEmailRepository;
    private final ContactRepository contactRepository;

    /**
     * Pobiera wszystkie sekwencje
     */
    public List<EmailSequence> getAllSequences() {
        return sequenceRepository.findAll();
    }

    /**
     * Pobiera aktywne sekwencje
     */
    public List<EmailSequence> getActiveSequences() {
        return sequenceRepository.findByActiveTrue();
    }

    /**
     * Pobiera sekwencję po ID
     */
    public Optional<EmailSequence> getSequenceById(Long id) {
        return sequenceRepository.findById(id);
    }

    /**
     * Tworzy nową sekwencję
     */
    @Transactional
    public EmailSequence createSequence(EmailSequence sequence) {
        log.info("Creating new sequence: {}", sequence.getName());
        return sequenceRepository.save(sequence);
    }

    /**
     * Aktualizuje sekwencję
     */
    @Transactional
    public EmailSequence updateSequence(Long id, EmailSequence updatedSequence) {
        EmailSequence existing = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        existing.setName(updatedSequence.getName());
        existing.setDescription(updatedSequence.getDescription());
        existing.setActive(updatedSequence.getActive());

        return sequenceRepository.save(existing);
    }

    /**
     * Usuwa sekwencję
     */
    @Transactional
    public void deleteSequence(Long id) {
        log.info("Deleting sequence: {}", id);
        sequenceRepository.deleteById(id);
    }

    /**
     * Dodaje krok do sekwencji
     */
    @Transactional
    public SequenceStep addStep(Long sequenceId, SequenceStep step) {
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        step.setSequence(sequence);
        return stepRepository.save(step);
    }

    /**
     * Aktualizuje krok
     */
    @Transactional
    public SequenceStep updateStep(Long stepId, SequenceStep updatedStep) {
        SequenceStep existing = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));

        existing.setStepOrder(updatedStep.getStepOrder());
        existing.setSubject(updatedStep.getSubject());
        existing.setBody(updatedStep.getBody());
        existing.setDelayDays(updatedStep.getDelayDays());
        existing.setDelayHours(updatedStep.getDelayHours());
        existing.setDelayMinutes(updatedStep.getDelayMinutes());

        return stepRepository.save(existing);
    }

    /**
     * Usuwa krok
     */
    @Transactional
    public void deleteStep(Long stepId) {
        stepRepository.deleteById(stepId);
    }

    /**
     * Pobiera kroki dla sekwencji
     */
    public List<SequenceStep> getStepsForSequence(Long sequenceId) {
        return stepRepository.findBySequenceIdOrderByStepOrderAsc(sequenceId);
    }

    /**
     * Rozpoczyna sekwencję dla kontaktu
     */
    @Transactional
    public SequenceExecution startSequenceForContact(Long sequenceId, Long contactId) {
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        if (!sequence.getActive()) {
            throw new RuntimeException("Cannot start inactive sequence");
        }

        log.info("Starting sequence {} for contact {}", sequence.getName(), contact.getEmail());

        // Utwórz wykonanie sekwencji
        SequenceExecution execution = new SequenceExecution();
        execution.setSequence(sequence);
        execution.setContact(contact);
        execution.setRecipientEmail(contact.getEmail());
        execution.setStatus("active");
        execution.setCurrentStep(0);

        execution = executionRepository.save(execution);

        // Zaplanuj wszystkie kroki
        scheduleStepsForExecution(execution);

        return execution;
    }

    /**
     * Zaplanuj wszystkie kroki dla wykonania sekwencji
     */
    @Transactional
    protected void scheduleStepsForExecution(SequenceExecution execution) {
        List<SequenceStep> steps = stepRepository.findBySequenceIdOrderByStepOrderAsc(
                execution.getSequence().getId()
        );

        LocalDateTime baseTime = LocalDateTime.now();

        for (SequenceStep step : steps) {
            // Oblicz czas wysłania
            LocalDateTime scheduledTime = baseTime
                    .plusDays(step.getDelayDays())
                    .plusHours(step.getDelayHours())
                    .plusMinutes(step.getDelayMinutes());

            // Przetwórz zmienne w temacie i treści
            String processedSubject = processTemplate(step.getSubject(), execution.getContact());
            String processedBody = processTemplate(step.getBody(), execution.getContact());

            // Utwórz zaplanowany email
            ScheduledEmail scheduledEmail = new ScheduledEmail();
            scheduledEmail.setExecution(execution);
            scheduledEmail.setStep(step);
            scheduledEmail.setRecipientEmail(execution.getRecipientEmail());
            scheduledEmail.setSubject(processedSubject);
            scheduledEmail.setBody(processedBody);
            scheduledEmail.setScheduledFor(scheduledTime);
            scheduledEmail.setStatus("pending");

            scheduledEmailRepository.save(scheduledEmail);
            log.info("Scheduled email for step {} at {}", step.getStepOrder(), scheduledTime);
        }
    }

    /**
     * Przetwarza szablon, zastępując zmienne wartościami z kontaktu
     */
    private String processTemplate(String template, Contact contact) {
        if (template == null) return "";

        return template
                .replace("{{name}}", contact.getName() != null ? contact.getName() : "")
                .replace("{{firstName}}", extractFirstName(contact.getName()))
                .replace("{{email}}", contact.getEmail() != null ? contact.getEmail() : "")
                .replace("{{company}}", contact.getCompany() != null ? contact.getCompany() : "")
                .replace("{{position}}", contact.getPosition() != null ? contact.getPosition() : "")
                .replace("{{phone}}", contact.getPhone() != null ? contact.getPhone() : "");
    }

    /**
     * Wyodrębnia pierwsze imię z pełnej nazwy
     */
    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            return "";
        }
        String[] parts = fullName.trim().split("\\s+");
        return parts[0];
    }

    /**
     * Pauzuje wykonanie sekwencji
     */
    @Transactional
    public SequenceExecution pauseExecution(Long executionId) {
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        execution.setStatus("paused");
        execution.setPausedAt(LocalDateTime.now());

        // Anuluj oczekujące emaile
        List<ScheduledEmail> pendingEmails = scheduledEmailRepository.findByExecutionId(executionId);
        for (ScheduledEmail email : pendingEmails) {
            if ("pending".equals(email.getStatus())) {
                email.setStatus("cancelled");
                scheduledEmailRepository.save(email);
            }
        }

        return executionRepository.save(execution);
    }

    /**
     * Wznawia wykonanie sekwencji
     */
    @Transactional
    public SequenceExecution resumeExecution(Long executionId) {
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        execution.setStatus("active");
        execution.setPausedAt(null);

        // Przeskaluj oczekujące emaile
        List<ScheduledEmail> cancelledEmails = scheduledEmailRepository.findByExecutionId(executionId);
        LocalDateTime now = LocalDateTime.now();

        for (ScheduledEmail email : cancelledEmails) {
            if ("cancelled".equals(email.getStatus())) {
                email.setStatus("pending");
                // Przesuń czas wysłania na teraz (lub zachowaj względne opóźnienia)
                email.setScheduledFor(now);
                scheduledEmailRepository.save(email);
            }
        }

        return executionRepository.save(execution);
    }

    /**
     * Pobiera wykonania dla sekwencji
     */
    public List<SequenceExecution> getExecutionsForSequence(Long sequenceId) {
        return executionRepository.findBySequenceId(sequenceId);
    }

    /**
     * Pobiera wykonania dla kontaktu
     */
    public List<SequenceExecution> getExecutionsForContact(Long contactId) {
        return executionRepository.findByContactId(contactId);
    }
}
