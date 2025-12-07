package com.crm.service;

import com.crm.dto.sequence.*;
import com.crm.exception.ValidationException;
import com.crm.model.*;
import com.crm.repository.*;
import com.crm.service.UserContextService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SequenceService {

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_SENT = "sent";

    private final EmailSequenceRepository sequenceRepository;
    private final SequenceStepRepository stepRepository;
    private final SequenceExecutionRepository executionRepository;
    private final ScheduledEmailRepository scheduledEmailRepository;
    private final ScheduledEmailService scheduledEmailService;
    private final ContactRepository contactRepository;
    private final EmailAccountRepository emailAccountRepository;
    private final TagRepository tagRepository;
    private final DealRepository dealRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final EmailRepository emailRepository;
    private final UserContextService userContextService;
    private final EmailTemplateService emailTemplateService;

    public List<SequenceSummaryDto> getAllSequences() {
        Long userId = userContextService.getCurrentUserId();
        log.info("getAllSequences called for userId: {}", userId);
        return sequenceRepository.findByUserId(userId)
                .stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    public List<SequenceSummaryDto> getActiveSequences() {
        Long userId = userContextService.getCurrentUserId();
        return sequenceRepository.findByUserIdAndActiveTrue(userId)
                .stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    public SequenceDetailsDto getSequenceDetails(Long id) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        sequence.getSteps().size(); // initialize
        sequence.getSteps().sort(Comparator.comparingInt(SequenceStep::getStepOrder));
        return mapToDetails(sequence);
    }

    @Transactional
    public SequenceDetailsDto createSequence(SequenceRequestDto request) {
        validateSequenceRequest(request);
        EmailSequence sequence = new EmailSequence();
        applySequenceFields(sequence, request);

        // Set userId to current user
        Long userId = userContextService.getCurrentUserId();
        log.info("Current user ID from UserContextService: {}", userId);
        if (userId != null) {
            sequence.setUserId(userId);
        } else {
            sequence.setUserId(1L); // Fallback for testing
            log.warn("UserContextService returned null, using fallback userId=1");
        }

        sequence = sequenceRepository.save(sequence);
        log.info("### CREATED SEQUENCE {} (id={}) for user {} ###", sequence.getName(), sequence.getId(), sequence.getUserId());
        return mapToDetails(sequence);
    }

    @Transactional
    public SequenceDetailsDto updateSequence(Long id, SequenceRequestDto request) {
        validateSequenceRequest(request);
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        applySequenceFields(sequence, request);
        sequence = sequenceRepository.save(sequence);
        log.info("Updated sequence {} (id={}) for user {}", sequence.getName(), sequence.getId(), userId);
        return mapToDetails(sequence);
    }

    @Transactional
    public void deleteSequence(Long id) {
        Long userId = userContextService.getCurrentUserId();
        log.info("Deleting sequence {} for user {}", id, userId);

        // Najpierw pobierz sekwencję aby zweryfikować że istnieje
        EmailSequence sequence = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        // Usuń wszystkie zaplanowane emaile powiązane z krokami tej sekwencji
        List<SequenceStep> steps = sequence.getSteps();
        for (SequenceStep step : steps) {
            scheduledEmailRepository.deleteByStepId(step.getId());
        }

        // Usuń wszystkie wykonania sekwencji
        executionRepository.deleteBySequenceId(id);

        // Teraz możemy bezpiecznie usunąć sekwencję (cascade usunie steps)
        sequenceRepository.deleteById(id);
        log.info("Successfully deleted sequence {} with all related data", id);
    }

    @Transactional
    public SequenceStepDto addStep(Long sequenceId, SequenceStepRequestDto request) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        SequenceStep step = buildStep(sequence, request);
        sequence.getSteps().add(step);
        stepRepository.save(step);

        return mapStep(step);
    }

    @Transactional
    public SequenceStepDto updateStep(Long stepId, SequenceStepRequestDto request) {
        Long userId = userContextService.getCurrentUserId();
        SequenceStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));

        // Check if user owns the parent sequence
        EmailSequence sequence = step.getSequence();
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        applyStepFields(step, request);
        return mapStep(stepRepository.save(step));
    }

    @Transactional
    public void deleteStep(Long stepId) {
        Long userId = userContextService.getCurrentUserId();
        SequenceStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));

        // Check if user owns the parent sequence
        EmailSequence sequence = step.getSequence();
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        // Najpierw usuń powiązane zaplanowane emaile
        scheduledEmailRepository.deleteByStepId(stepId);

        // Usuń评论 powiązane z wykonaniami sekwencji (opcjonalnie)
        // Można też zostawić execution i oznaczyć email jako cancelled

        stepRepository.deleteById(stepId);
    }

    public List<SequenceStepDto> getStepsForSequence(Long sequenceId) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        return stepRepository.findBySequenceIdOrderByStepOrderAsc(sequenceId)
                .stream()
                .map(this::mapStep)
                .collect(Collectors.toList());
    }

    public SequenceDashboardDto getDashboard() {
        Long userId = userContextService.getCurrentUserId();
        long totalSequences = sequenceRepository.findByUserId(userId).size();
        long activeSequences = sequenceRepository.findByUserIdAndActiveTrue(userId).size();
        long pausedSequences = Math.max(totalSequences - activeSequences, 0);

        // TODO: Add userId filtering to executionRepository and scheduledEmailRepository
        long totalExecutions = executionRepository.count();
        long activeExecutions = executionRepository.countByStatus("active");
        long pausedExecutions = executionRepository.countByStatus("paused");
        long completedExecutions = executionRepository.countByStatus("completed");
        long pendingScheduled = scheduledEmailRepository.countByStatus(STATUS_PENDING);

        return SequenceDashboardDto.builder()
                .totalSequences(totalSequences)
                .activeSequences(activeSequences)
                .pausedSequences(pausedSequences)
                .totalExecutions(totalExecutions)
                .activeExecutions(activeExecutions)
                .pausedExecutions(pausedExecutions)
                .completedExecutions(completedExecutions)
                .pendingScheduledEmails(pendingScheduled)
                .build();
    }

    /**
     * Rozpoczyna sekwencję dla kontaktu i planuje wysyłkę kroków zgodnie z harmonogramem.
     */
    @Transactional
    public SequenceExecution startSequenceForContact(Long sequenceId, Long contactId) {
        return startSequenceForContact(sequenceId, contactId, null);
    }

    /**
     * Rozpoczyna sekwencję dla kontaktu (z opcjonalnym powiązaniem z szansą)
     */
    @Transactional
    public SequenceExecution startSequenceForContact(Long sequenceId, Long contactId, Long dealId) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found. Please refresh the page and try again"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        // Check if user owns this contact
        if (!userId.equals(contact.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        if (Boolean.FALSE.equals(sequence.getActive())) {
            throw new RuntimeException("Cannot start inactive sequence");
        }

        SequenceExecution execution = new SequenceExecution();
        execution.setSequence(sequence);
        execution.setContact(contact);
        execution.setRecipientEmail(contact.getEmail());
        execution.setStatus("active");
        execution.setCurrentStep(0);
        execution.setDealId(dealId); // Opcjonalne powiązanie z szansą

        // Initialize thread context from last known email with this contact
        initializeThreadContext(execution, contact);

        execution = executionRepository.save(execution);

        scheduleStepsForExecution(execution);

        // Jeśli sekwencja jest powiązana z szansą, przenieś szansę do następnego etapu
        if (dealId != null) {
            log.info("Moving deal {} to next pipeline stage after starting sequence", dealId);
            moveDealToNextStage(dealId);
        } else {
            log.info("No dealId provided - not moving any deal to next stage");
        }

        return execution;
    }

    /**
     * Przenosi szansę do następnego etapu w pipeline
     */
    private void moveDealToNextStage(Long dealId) {
        try {
            Deal deal = dealRepository.findById(dealId).orElse(null);
            if (deal == null) {
                log.warn("Deal {} not found, cannot move to next stage", dealId);
                return;
            }

            PipelineStage currentStage = deal.getStage();
            if (currentStage == null) {
                log.warn("Deal {} has no stage, cannot move to next stage", dealId);
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
                        // Jest następny etap
                        PipelineStage nextStage = stages.get(i + 1);
                        deal.setStage(nextStage);
                        deal.setUpdatedAt(LocalDateTime.now());
                        dealRepository.save(deal);
                        log.info("Deal {} moved from stage '{}' to '{}'",
                            dealId, currentStage.getName(), nextStage.getName());
                    } else {
                        log.info("Deal {} is already in the last stage '{}'", dealId, currentStage.getName());
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Error moving deal {} to next stage: {}", dealId, e.getMessage(), e);
            // Nie przerywa uruchamiania sekwencji - to tylko dodatkowa funkcjonalność
        }
    }

    /**
     * Pauzuje wykonanie sekwencji i anuluje niezrealizowane wysyłki.
     */
    @Transactional
    public SequenceExecution pauseExecution(Long executionId) {
        Long userId = userContextService.getCurrentUserId();
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        // Check if user owns the parent sequence
        EmailSequence sequence = execution.getSequence();
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        execution.setStatus("paused");
        execution.setPausedAt(LocalDateTime.now());

        scheduledEmailRepository.findByExecutionId(executionId).forEach(email -> {
            if (STATUS_PENDING.equals(email.getStatus())) {
                email.setStatus("cancelled");
                scheduledEmailRepository.save(email);
            }
        });

        return executionRepository.save(execution);
    }

    /**
     * Wznawia wykonanie sekwencji i ponownie planuje oczekujące kroki.
     */
    @Transactional
    public SequenceExecution resumeExecution(Long executionId) {
        Long userId = userContextService.getCurrentUserId();
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        // Check if user owns the parent sequence
        EmailSequence sequence = execution.getSequence();
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        execution.setStatus("active");
        execution.setPausedAt(null);

        LocalDateTime alignedResume = alignToSendWindow(LocalDateTime.now(), execution.getSequence());
        final LocalDateTime resumeAt = enforceSendingPolicies(alignedResume, execution.getSequence());

        scheduledEmailRepository.findByExecutionId(executionId).forEach(email -> {
            if ("cancelled".equals(email.getStatus())) {
                email.setStatus(STATUS_PENDING);
                email.setScheduledFor(resumeAt);
                scheduledEmailRepository.save(email);
            }
        });

        return executionRepository.save(execution);
    }

    public List<SequenceExecution> getExecutionsForSequence(Long sequenceId) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        return executionRepository.findBySequenceId(sequenceId);
    }

    public List<SequenceExecution> getExecutionsForContact(Long contactId) {
        return executionRepository.findByContactId(contactId);
    }

    /* ====================== PRIVATE HELPERS ====================== */

    /**
     * Kompleksowa walidacja żądania utworzenia/edycji sekwencji
     */
    private void validateSequenceRequest(SequenceRequestDto request) {
        // 1. Walidacja nazwy
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Nazwa sekwencji jest wymagana");
        }
        if (request.getName().length() > 100) {
            throw new ValidationException("Nazwa sekwencji nie może przekraczać 100 znaków");
        }

        // 2. Walidacja okna wysyłki
        if (request.getSendWindowStart() != null && request.getSendWindowEnd() != null) {
            if (request.getSendWindowStart().isAfter(request.getSendWindowEnd()) ||
                request.getSendWindowStart().equals(request.getSendWindowEnd())) {
                throw new ValidationException("Koniec okna wysyłki musi być późniejszy niż początek (min. 1 godzina różnicy)");
            }
        }

        // 3. Walidacja limitów wysyłki
        if (request.getDailySendingLimit() != null && request.getDailySendingLimit() < 1) {
            throw new ValidationException("Dzienny limit wysyłki musi być większy od 0");
        }
        if (request.getDailySendingLimit() != null && request.getDailySendingLimit() > 10000) {
            throw new ValidationException("Dzienny limit wysyłki nie może przekraczać 10000");
        }
        if (request.getThrottlePerHour() != null && request.getThrottlePerHour() < 1) {
            throw new ValidationException("Limit wysyłek na godzinę musi być większy od 0");
        }
        if (request.getThrottlePerHour() != null && request.getThrottlePerHour() > 1000) {
            throw new ValidationException("Limit wysyłek na godzinę nie może przekraczać 1000");
        }

        // 4. Walidacja kroków
        if (request.getSteps() != null && !request.getSteps().isEmpty()) {
            for (int i = 0; i < request.getSteps().size(); i++) {
                SequenceStepRequestDto step = request.getSteps().get(i);
                String stepPrefix = "Krok " + (i + 1) + ": ";

                // Walidacja typu kroku
                if (step.getStepType() == null || step.getStepType().trim().isEmpty()) {
                    throw new ValidationException(stepPrefix + "Typ kroku jest wymagany");
                }

                // Walidacja dla kroków typu email
                if ("email".equals(step.getStepType())) {
                    if (step.getSubject() == null || step.getSubject().trim().isEmpty()) {
                        throw new ValidationException(stepPrefix + "Temat emaila jest wymagany");
                    }
                    if (step.getSubject().length() > 200) {
                        throw new ValidationException(stepPrefix + "Temat emaila nie może przekraczać 200 znaków");
                    }
                    if (step.getBody() == null || step.getBody().trim().isEmpty()) {
                        throw new ValidationException(stepPrefix + "Treść emaila jest wymagana");
                    }
                    if (step.getBody().length() > 50000) {
                        throw new ValidationException(stepPrefix + "Treść emaila nie może przekraczać 50000 znaków");
                    }
                }

                // Walidacja opóźnień
                Integer totalDelayMinutes =
                    (step.getDelayDays() != null ? step.getDelayDays() * 24 * 60 : 0) +
                    (step.getDelayHours() != null ? step.getDelayHours() * 60 : 0) +
                    (step.getDelayMinutes() != null ? step.getDelayMinutes() : 0);

                if (i > 0 && totalDelayMinutes < 1) {
                    throw new ValidationException(stepPrefix + "Opóźnienie musi wynosić co najmniej 1 minutę (z wyjątkiem pierwszego kroku)");
                }
                if (totalDelayMinutes > 365 * 24 * 60) {
                    throw new ValidationException(stepPrefix + "Opóźnienie nie może przekraczać 365 dni");
                }

                // Walidacja waitForReplyHours
                if (step.getWaitForReplyHours() != null && step.getWaitForReplyHours() < 0) {
                    throw new ValidationException(stepPrefix + "Czas oczekiwania na odpowiedź nie może być ujemny");
                }
                if (step.getWaitForReplyHours() != null && step.getWaitForReplyHours() > 8760) {
                    throw new ValidationException(stepPrefix + "Czas oczekiwania na odpowiedź nie może przekraczać 365 dni");
                }
            }
        }

        // 5. Walidacja konta email (jeśli podane)
        if (request.getEmailAccountId() != null) {
            if (!emailAccountRepository.existsById(request.getEmailAccountId())) {
                throw new ValidationException("Wybrane konto email nie istnieje");
            }
        }

        // 6. Walidacja tagu (jeśli podany)
        if (request.getTagId() != null) {
            if (!tagRepository.existsById(request.getTagId())) {
                throw new ValidationException("Wybrany tag nie istnieje");
            }
        }

        log.debug("Validation passed for sequence request: {}", request.getName());
    }

    private void applySequenceFields(EmailSequence sequence, SequenceRequestDto request) {
        sequence.setName(Optional.ofNullable(request.getName()).orElseThrow(() -> new IllegalArgumentException("Sequence name is required")));
        sequence.setDescription(request.getDescription());
        sequence.setActive(Optional.ofNullable(request.getActive()).orElse(Boolean.TRUE));
        sequence.setTimezone(Optional.ofNullable(request.getTimezone()).filter(s -> !s.isBlank()).orElse("Europe/Warsaw"));
        sequence.setSendWindowStart(Optional.ofNullable(request.getSendWindowStart()).orElse(LocalTime.of(9, 0)));
        sequence.setSendWindowEnd(Optional.ofNullable(request.getSendWindowEnd()).orElse(LocalTime.of(17, 0)));
        sequence.setSendOnWeekends(Optional.ofNullable(request.getSendOnWeekends()).orElse(false));
        sequence.setDailySendingLimit(request.getDailySendingLimit());
        sequence.setThrottlePerHour(request.getThrottlePerHour());

        if (request.getEmailAccountId() != null) {
            emailAccountRepository.findById(request.getEmailAccountId())
                    .ifPresent(sequence::setEmailAccount);
        }

        if (request.getTagId() != null) {
            tagRepository.findById(request.getTagId())
                    .ifPresent(sequence::setTag);
        } else {
            sequence.setTag(null);
        }

        applyStepRequests(sequence, request.getSteps());
    }

    private void applyStepRequests(EmailSequence sequence, List<SequenceStepRequestDto> stepRequests) {
        List<SequenceStep> targetSteps = sequence.getSteps();
        if (targetSteps == null) {
            targetSteps = new ArrayList<>();
            sequence.setSteps(targetSteps);
        } else {
            // Usuń wszystkie istniejące kroki sekwencji wraz z powiązanymi zaplanowanymi emailami
            for (SequenceStep existingStep : new ArrayList<>(targetSteps)) {
                scheduledEmailRepository.deleteByStepId(existingStep.getId());
                stepRepository.delete(existingStep);
            }
            targetSteps.clear();
        }

        if (stepRequests == null || stepRequests.isEmpty()) {
            return;
        }

        final List<SequenceStep> stepsTarget = targetSteps;
        stepRequests.stream()
                .sorted(Comparator.comparing(req -> Optional.ofNullable(req.getStepOrder()).orElse(Integer.MAX_VALUE)))
                .forEach(request -> stepsTarget.add(buildStep(sequence, request)));
    }

    private SequenceStep buildStep(EmailSequence sequence, SequenceStepRequestDto request) {
        SequenceStep step = new SequenceStep();
        step.setSequence(sequence);
        applyStepFields(step, request);
        return step;
    }

    private void applyStepFields(SequenceStep step, SequenceStepRequestDto request) {
        step.setStepOrder(Optional.ofNullable(request.getStepOrder()).orElse(1));
        step.setStepType(Optional.ofNullable(request.getStepType()).filter(s -> !s.isBlank()).orElse("email"));
        step.setSubject(Optional.ofNullable(request.getSubject()).orElseThrow(() -> new IllegalArgumentException("Step subject is required")));
        step.setBody(Optional.ofNullable(request.getBody()).orElseThrow(() -> new IllegalArgumentException("Step body is required")));
        step.setDelayDays(Optional.ofNullable(request.getDelayDays()).orElse(0));
        step.setDelayHours(Optional.ofNullable(request.getDelayHours()).orElse(0));
        step.setDelayMinutes(Optional.ofNullable(request.getDelayMinutes()).orElse(0));
        step.setWaitForReplyHours(Optional.ofNullable(request.getWaitForReplyHours()).orElse(0));
        step.setSkipIfReplied(Optional.ofNullable(request.getSkipIfReplied()).orElse(true));
        step.setTrackOpens(Optional.ofNullable(request.getTrackOpens()).orElse(false));
        step.setTrackClicks(Optional.ofNullable(request.getTrackClicks()).orElse(false));
    }

    @Transactional
    protected void scheduleStepsForExecution(SequenceExecution execution) {
        List<SequenceStep> steps = stepRepository.findBySequenceIdOrderByStepOrderAsc(execution.getSequence().getId());
        if (steps.isEmpty()) {
            log.warn("Sequence {} has no steps defined, skipping scheduling", execution.getSequence().getId());
            return;
        }

        LocalDateTime reference = LocalDateTime.now();
        boolean firstStep = true;

        for (SequenceStep step : steps) {
            // Sprawdź czy pierwszy krok ma zerowe opóźnienie - jeśli tak, wyślij natychmiast
            boolean sendFirstStepImmediately = firstStep && shouldBeSentImmediately(step);
            
            LocalDateTime scheduledTime = calculateScheduledTime(step, reference, execution, firstStep, sendFirstStepImmediately);
            ScheduledEmail scheduledEmail = createScheduledEmail(step, execution, scheduledTime);

            if (sendFirstStepImmediately) {
                log.info("First step has zero delay - sending immediately for execution {}", execution.getId());
                handleImmediateSending(scheduledEmail, execution, true);
            }

            log.info("Scheduled sequence step {} for execution {} at {}", step.getStepOrder(), execution.getId(), scheduledTime);
            reference = scheduledTime;
            firstStep = false;
        }
    }

    /**
     * Calculate the scheduled time for a sequence step based on delays and sending policies
     */
    private LocalDateTime calculateScheduledTime(SequenceStep step, LocalDateTime reference,
                                               SequenceExecution execution, boolean isFirstStep,
                                               boolean sendImmediately) {
        // Jeśli ma być wysłany natychmiast, zwróć aktualny czas
        if (sendImmediately) {
            return LocalDateTime.now();
        }
        
        LocalDateTime scheduled = calculateBaseScheduledTime(step, reference);

        // Apply sending window and policy constraints for non-immediate emails
        scheduled = alignToSendWindow(scheduled, execution.getSequence());
        scheduled = enforceSendingPolicies(scheduled, execution.getSequence());

        return scheduled;
    }

    /**
     * Calculate the base scheduled time including delays
     */
    private LocalDateTime calculateBaseScheduledTime(SequenceStep step, LocalDateTime reference) {
        LocalDateTime scheduled = reference
                .plusDays(Optional.ofNullable(step.getDelayDays()).orElse(0))
                .plusHours(Optional.ofNullable(step.getDelayHours()).orElse(0))
                .plusMinutes(Optional.ofNullable(step.getDelayMinutes()).orElse(0));

        if (step.getWaitForReplyHours() != null && step.getWaitForReplyHours() > 0) {
            scheduled = scheduled.plusHours(step.getWaitForReplyHours());
        }

        return scheduled;
    }

    /**
     * Create and save a scheduled email for the given step and execution
     */
    private ScheduledEmail createScheduledEmail(SequenceStep step, SequenceExecution execution, LocalDateTime scheduledTime) {
        ScheduledEmail scheduledEmail = new ScheduledEmail();
        scheduledEmail.setExecution(execution);
        scheduledEmail.setStep(step);
        scheduledEmail.setRecipientEmail(execution.getRecipientEmail());
        
        // Use template if available, otherwise use step's subject/body
        if (step.getTemplate() != null) {
            try {
                String renderedHtml = emailTemplateService.renderTemplate(
                    step.getTemplate().getId(),
                    execution.getContact(),
                    null
                );
                scheduledEmail.setSubject(processTemplate(step.getTemplate().getSubject(), execution.getContact()));
                scheduledEmail.setBody(renderedHtml);
                log.info("Using template {} for sequence step {}", step.getTemplate().getId(), step.getId());
            } catch (Exception e) {
                log.error("Failed to render template for step {}, falling back to manual content", step.getId(), e);
                scheduledEmail.setSubject(processTemplate(step.getSubject(), execution.getContact()));
                scheduledEmail.setBody(processTemplate(step.getBody(), execution.getContact()));
            }
        } else {
            scheduledEmail.setSubject(processTemplate(step.getSubject(), execution.getContact()));
            scheduledEmail.setBody(processTemplate(step.getBody(), execution.getContact()));
        }
        
        scheduledEmail.setScheduledFor(scheduledTime);
        scheduledEmail.setStatus(STATUS_PENDING);

        return scheduledEmailRepository.save(scheduledEmail);
    }

    /**
     * Handle immediate sending of emails if required
     */
    private void handleImmediateSending(ScheduledEmail scheduledEmail, SequenceExecution execution, boolean sendImmediately) {
        if (!sendImmediately) {
            return;
        }

        try {
            log.info("Sending first step immediately for execution {} - scheduled email ID: {}, recipient: {}",
                     execution.getId(), scheduledEmail.getId(), scheduledEmail.getRecipientEmail());
            
            // Wymuś flush żeby email był widoczny w bazie przed próbą wysłania
            scheduledEmailRepository.flush();
            
            scheduledEmailService.sendNow(scheduledEmail.getId());
            log.info("Successfully sent first step immediately for execution {}", execution.getId());
        } catch (Exception e) {
            log.error("Failed to send first step immediately for execution {}: {}",
                      execution.getId(), e.getMessage(), e);
            // Nie przerywamy procesu, email pozostanie w statusie pending i zostanie wysłany przez scheduler
        }
    }

    private LocalDateTime alignToSendWindow(LocalDateTime candidate, EmailSequence sequence) {
        LocalTime start = Optional.ofNullable(sequence.getSendWindowStart()).orElse(LocalTime.of(9, 0));
        LocalTime end = Optional.ofNullable(sequence.getSendWindowEnd()).orElse(LocalTime.of(17, 0));

        if (!end.isAfter(start)) {
            end = start.plusHours(8);
        }

        LocalDateTime adjusted = candidate.withSecond(0).withNano(0);
        boolean allowWeekends = Optional.ofNullable(sequence.getSendOnWeekends()).orElse(false);

        while (true) {
            DayOfWeek day = adjusted.getDayOfWeek();
            if (!allowWeekends && (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY)) {
                adjusted = adjusted.plusDays(1).with(start);
                continue;
            }

            LocalTime time = adjusted.toLocalTime();
            if (time.isBefore(start)) {
                adjusted = adjusted.with(start);
                continue;
            }
            if (time.isAfter(end)) {
                adjusted = adjusted.plusDays(1).with(start);
                continue;
            }

            break;
        }

        return adjusted;
    }

    private LocalDateTime enforceSendingPolicies(LocalDateTime candidate, EmailSequence sequence) {
        LocalDateTime adjusted = candidate;
        Integer dailyLimit = sequence.getDailySendingLimit();
        Integer hourlyLimit = sequence.getThrottlePerHour();

        if (dailyLimit != null && dailyLimit > 0) {
            while (true) {
                LocalDate day = adjusted.toLocalDate();
                LocalDateTime dayStart = day.atStartOfDay();
                LocalDateTime dayEnd = day.plusDays(1).atStartOfDay().minusSeconds(1);

                long alreadyPlanned = scheduledEmailRepository.countScheduledForSequenceBetween(sequence.getId(), dayStart, dayEnd);
                if (alreadyPlanned < dailyLimit) {
                    break;
                }

                adjusted = alignToSendWindow(day.plusDays(1).atTime(sequence.getSendWindowStart()), sequence);
            }
        }

        if (hourlyLimit != null && hourlyLimit > 0) {
            while (true) {
                LocalDateTime hourStart = adjusted.withMinute(0).withSecond(0).withNano(0);
                LocalDateTime hourEnd = hourStart.plusHours(1).minusSeconds(1);
                long alreadyPlanned = scheduledEmailRepository.countScheduledForSequenceBetween(sequence.getId(), hourStart, hourEnd);
                if (alreadyPlanned < hourlyLimit) {
                    break;
                }

                adjusted = alignToSendWindow(hourEnd.plusSeconds(1), sequence);
            }
        }

        return adjusted;
    }

    private String processTemplate(String template, Contact contact) {
        if (template == null) {
            return "";
        }

        return template
                .replace("{{name}}", Optional.ofNullable(contact.getName()).orElse(""))
                .replace("{{firstName}}", extractFirstName(contact.getName()))
                .replace("{{email}}", Optional.ofNullable(contact.getEmail()).orElse(""))
                .replace("{{company}}", Optional.ofNullable(contact.getCompany()).orElse(""))
                .replace("{{position}}", Optional.ofNullable(contact.getPosition()).orElse(""))
                .replace("{{phone}}", Optional.ofNullable(contact.getPhone()).orElse(""));
    }

    /**
     * Sprawdza czy krok sekwencji ma zerowe opóźnienie i powinien być wysłany natychmiast
     */
    private boolean shouldBeSentImmediately(SequenceStep step) {
        return (step.getDelayDays() == null || step.getDelayDays() == 0) &&
               (step.getDelayHours() == null || step.getDelayHours() == 0) &&
               (step.getDelayMinutes() == null || step.getDelayMinutes() == 0) &&
               (step.getWaitForReplyHours() == null || step.getWaitForReplyHours() == 0);
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "";
        }
        String[] parts = fullName.trim().split("\\s+");
        return parts[0];
    }

    private SequenceSummaryDto mapToSummary(EmailSequence sequence) {
        Long sequenceId = sequence.getId();
        long executionsTotal = executionRepository.countBySequenceId(sequenceId);
        long executionsActive = executionRepository.countBySequenceIdAndStatus(sequenceId, "active");
        long executionsPaused = executionRepository.countBySequenceIdAndStatus(sequenceId, "paused");
        long executionsCompleted = executionRepository.countBySequenceIdAndStatus(sequenceId, "completed");
        long stepsCount = stepRepository.countBySequenceId(sequenceId);

        ScheduledEmail nextEmail = scheduledEmailRepository.findFirstByExecutionSequenceIdAndStatusOrderByScheduledForAsc(sequenceId, STATUS_PENDING);
        LocalDateTime nextScheduled = nextEmail != null ? nextEmail.getScheduledFor() : null;

        return SequenceSummaryDto.builder()
                .id(sequenceId)
                .name(sequence.getName())
                .description(sequence.getDescription())
                .active(sequence.getActive())
                .timezone(sequence.getTimezone())
                .sendWindowStart(sequence.getSendWindowStart())
                .sendWindowEnd(sequence.getSendWindowEnd())
                .sendOnWeekends(sequence.getSendOnWeekends())
                .dailySendingLimit(sequence.getDailySendingLimit())
                .throttlePerHour(sequence.getThrottlePerHour())
                .stepsCount((int) stepsCount)
                .executionsTotal(executionsTotal)
                .executionsActive(executionsActive)
                .executionsPaused(executionsPaused)
                .executionsCompleted(executionsCompleted)
                .createdAt(sequence.getCreatedAt())
                .updatedAt(sequence.getUpdatedAt())
                .nextScheduledSend(nextScheduled)
                .tagId(sequence.getTag() != null ? sequence.getTag().getId() : null)
                .tagName(sequence.getTag() != null ? sequence.getTag().getName() : null)
                .emailAccountId(sequence.getEmailAccount() != null ? sequence.getEmailAccount().getId() : null)
                .emailAccountName(sequence.getEmailAccount() != null ? sequence.getEmailAccount().getDisplayName() : null)
                .build();
    }

    private SequenceDetailsDto mapToDetails(EmailSequence sequence) {
        SequenceSummaryDto summary = mapToSummary(sequence);
        long pending = scheduledEmailRepository.countBySequenceIdAndStatus(sequence.getId(), STATUS_PENDING);

        List<SequenceStepDto> steps = stepRepository.findBySequenceIdOrderByStepOrderAsc(sequence.getId())
                .stream()
                .map(this::mapStep)
                .collect(Collectors.toList());

        return SequenceDetailsDto.builder()
                .summary(summary)
                .steps(steps)
                .pendingScheduledEmails(pending)
                .build();
    }

    private SequenceStepDto mapStep(SequenceStep step) {
        return SequenceStepDto.builder()
                .id(step.getId())
                .stepOrder(step.getStepOrder())
                .stepType(step.getStepType())
                .subject(step.getSubject())
                .body(step.getBody())
                .delayDays(step.getDelayDays())
                .delayHours(step.getDelayHours())
                .delayMinutes(step.getDelayMinutes())
                .waitForReplyHours(step.getWaitForReplyHours())
                .skipIfReplied(step.getSkipIfReplied())
                .trackOpens(step.getTrackOpens())
                .trackClicks(step.getTrackClicks())
                .build();
    }

    /**
     * Testuje sekwencję wysyłając wszystkie maile na podany testowy email (natychmiast, bez opóźnień)
     */
    @Transactional
    public void testSequence(Long sequenceId, String testEmail) {
        Long userId = userContextService.getCurrentUserId();
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        // Check if user owns this sequence
        if (!userId.equals(sequence.getUserId())) {
            throw new RuntimeException("Access denied");
        }

        List<SequenceStep> steps = stepRepository.findBySequenceIdOrderByStepOrderAsc(sequenceId);
        if (steps.isEmpty()) {
            throw new RuntimeException("Sequence has no steps to test");
        }

        // Utwórz tymczasowy kontakt testowy
        Contact testContact = new Contact();
        testContact.setName("Test Contact");
        testContact.setEmail(testEmail);
        testContact.setCompany("Test Company");
        testContact.setUserId(userId);

        log.info("Testing sequence {} - sending {} emails to {}", sequenceId, steps.size(), testEmail);

        // Wyślij wszystkie maile z sekwencji natychmiast
        for (SequenceStep step : steps) {
            try {
                String processedSubject = processTemplate(step.getSubject(), testContact);
                String processedBody = processTemplate(step.getBody(), testContact);

                // Dodaj oznaczenie że to test
                processedSubject = "[TEST] " + processedSubject;
                processedBody = "<div style='background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 20px; border-radius: 5px;'>"
                        + "<strong>⚠️ To jest testowa wiadomość z sekwencji</strong><br>"
                        + "Sekwencja: " + sequence.getName() + "<br>"
                        + "Krok: " + step.getStepOrder() + "/" + steps.size()
                        + "</div>"
                        + processedBody;

                // Wyślij email natychmiast
                scheduledEmailService.sendTestEmail(
                        sequence.getEmailAccount() != null ? sequence.getEmailAccount().getId() : null,
                        testEmail,
                        processedSubject,
                        processedBody
                );

                log.info("Sent test email for step {} of sequence {} to {}",
                         step.getStepOrder(), sequenceId, testEmail);

            } catch (Exception e) {
                log.error("Failed to send test email for step {} of sequence {}: {}",
                          step.getStepOrder(), sequenceId, e.getMessage(), e);
                throw new RuntimeException("Failed to send test email for step " + step.getStepOrder() + ": " + e.getMessage());
            }
        }

        log.info("Successfully tested sequence {} - sent {} emails to {}", sequenceId, steps.size(), testEmail);
    }

    /**
     * Initialize thread context from the last known email with this contact.
     * If we find a previous email conversation, the first sequence email will be sent as a reply.
     */
    private void initializeThreadContext(SequenceExecution execution, Contact contact) {
        try {
            // Find the last email from or to this contact
            List<Email> lastEmails = emailRepository.findTop10BySenderContainingIgnoreCaseOrRecipientContainingIgnoreCaseOrderByReceivedAtDesc(
                    contact.getEmail(), contact.getEmail());

            if (!lastEmails.isEmpty()) {
                Email lastEmail = lastEmails.get(0);

                // Only use as thread if we have a valid message ID and it's recent (last 90 days)
                if (lastEmail.getMessageId() != null && lastEmail.getReceivedAt() != null &&
                        lastEmail.getReceivedAt().isAfter(LocalDateTime.now().minusDays(90))) {

                    execution.setLastMessageId(lastEmail.getMessageId());
                    execution.setLastThreadSubject(lastEmail.getSubject());
                    execution.setIsReplyToThread(true);

                    log.debug("Initialized thread context for contact {} - last email: {} ({})",
                            contact.getEmail(), lastEmail.getSubject(), lastEmail.getReceivedAt());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to initialize thread context for contact {}: {}",
                    contact.getEmail(), e.getMessage());
            // Continue without threading - not a critical error
        }
    }

}
