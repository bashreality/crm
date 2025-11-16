package com.crm.service;

import com.crm.dto.sequence.*;
import com.crm.model.*;
import com.crm.repository.*;
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
    private final ContactRepository contactRepository;

    public List<SequenceSummaryDto> getAllSequences() {
        return sequenceRepository.findAll()
                .stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    public List<SequenceSummaryDto> getActiveSequences() {
        return sequenceRepository.findByActiveTrue()
                .stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    public SequenceDetailsDto getSequenceDetails(Long id) {
        EmailSequence sequence = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));
        sequence.getSteps().size(); // initialize
        sequence.getSteps().sort(Comparator.comparingInt(SequenceStep::getStepOrder));
        return mapToDetails(sequence);
    }

    @Transactional
    public SequenceDetailsDto createSequence(SequenceRequestDto request) {
        EmailSequence sequence = new EmailSequence();
        applySequenceFields(sequence, request);
        sequence = sequenceRepository.save(sequence);
        log.info("Created sequence {} (id={})", sequence.getName(), sequence.getId());
        return mapToDetails(sequence);
    }

    @Transactional
    public SequenceDetailsDto updateSequence(Long id, SequenceRequestDto request) {
        EmailSequence sequence = sequenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        applySequenceFields(sequence, request);
        sequence = sequenceRepository.save(sequence);
        log.info("Updated sequence {} (id={})", sequence.getName(), sequence.getId());
        return mapToDetails(sequence);
    }

    @Transactional
    public void deleteSequence(Long id) {
        log.info("Deleting sequence {}", id);
        sequenceRepository.deleteById(id);
    }

    @Transactional
    public SequenceStepDto addStep(Long sequenceId, SequenceStepRequestDto request) {
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        SequenceStep step = buildStep(sequence, request);
        sequence.getSteps().add(step);
        stepRepository.save(step);

        return mapStep(step);
    }

    @Transactional
    public SequenceStepDto updateStep(Long stepId, SequenceStepRequestDto request) {
        SequenceStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));

        applyStepFields(step, request);
        return mapStep(stepRepository.save(step));
    }

    @Transactional
    public void deleteStep(Long stepId) {
        stepRepository.deleteById(stepId);
    }

    public List<SequenceStepDto> getStepsForSequence(Long sequenceId) {
        return stepRepository.findBySequenceIdOrderByStepOrderAsc(sequenceId)
                .stream()
                .map(this::mapStep)
                .collect(Collectors.toList());
    }

    public SequenceDashboardDto getDashboard() {
        long totalSequences = sequenceRepository.count();
        long activeSequences = sequenceRepository.findByActiveTrue().size();
        long pausedSequences = Math.max(totalSequences - activeSequences, 0);

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
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        if (Boolean.FALSE.equals(sequence.getActive())) {
            throw new RuntimeException("Cannot start inactive sequence");
        }

        SequenceExecution execution = new SequenceExecution();
        execution.setSequence(sequence);
        execution.setContact(contact);
        execution.setRecipientEmail(contact.getEmail());
        execution.setStatus("active");
        execution.setCurrentStep(0);

        execution = executionRepository.save(execution);

        scheduleStepsForExecution(execution);
        return execution;
    }

    /**
     * Pauzuje wykonanie sekwencji i anuluje niezrealizowane wysyłki.
     */
    @Transactional
    public SequenceExecution pauseExecution(Long executionId) {
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

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
        SequenceExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

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
        return executionRepository.findBySequenceId(sequenceId);
    }

    public List<SequenceExecution> getExecutionsForContact(Long contactId) {
        return executionRepository.findByContactId(contactId);
    }

    /* ====================== PRIVATE HELPERS ====================== */

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

        applyStepRequests(sequence, request.getSteps());
    }

    private void applyStepRequests(EmailSequence sequence, List<SequenceStepRequestDto> stepRequests) {
        List<SequenceStep> targetSteps = sequence.getSteps();
        if (targetSteps == null) {
            targetSteps = new ArrayList<>();
            sequence.setSteps(targetSteps);
        } else {
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
        for (SequenceStep step : steps) {
            LocalDateTime scheduled = reference
                    .plusDays(Optional.ofNullable(step.getDelayDays()).orElse(0))
                    .plusHours(Optional.ofNullable(step.getDelayHours()).orElse(0))
                    .plusMinutes(Optional.ofNullable(step.getDelayMinutes()).orElse(0));

            if (step.getWaitForReplyHours() != null && step.getWaitForReplyHours() > 0) {
                scheduled = scheduled.plusHours(step.getWaitForReplyHours());
            }

            scheduled = alignToSendWindow(scheduled, execution.getSequence());
            scheduled = enforceSendingPolicies(scheduled, execution.getSequence());

            ScheduledEmail scheduledEmail = new ScheduledEmail();
            scheduledEmail.setExecution(execution);
            scheduledEmail.setStep(step);
            scheduledEmail.setRecipientEmail(execution.getRecipientEmail());
            scheduledEmail.setSubject(processTemplate(step.getSubject(), execution.getContact()));
            scheduledEmail.setBody(processTemplate(step.getBody(), execution.getContact()));
            scheduledEmail.setScheduledFor(scheduled);
            scheduledEmail.setStatus(STATUS_PENDING);

            scheduledEmailRepository.save(scheduledEmail);
            log.info("Scheduled sequence step {} for execution {} at {}", step.getStepOrder(), execution.getId(), scheduled);

            reference = scheduled;
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

}
