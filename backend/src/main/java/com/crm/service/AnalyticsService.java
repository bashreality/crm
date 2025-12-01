package com.crm.service;

import com.crm.dto.analytics.GlobalAnalyticsDto;
import com.crm.dto.analytics.SequenceAnalyticsDto;
import com.crm.model.EmailSequence;
import com.crm.model.ScheduledEmail;
import com.crm.model.SequenceExecution;
import com.crm.repository.EmailRepository;
import com.crm.repository.EmailSequenceRepository;
import com.crm.repository.ScheduledEmailRepository;
import com.crm.repository.SequenceExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final EmailSequenceRepository sequenceRepository;
    private final SequenceExecutionRepository executionRepository;
    private final ScheduledEmailRepository scheduledEmailRepository;
    private final EmailRepository emailRepository;

    /**
     * Pobiera globalną analitykę dla wszystkich sekwencji
     */
    public GlobalAnalyticsDto getGlobalAnalytics() {
        GlobalAnalyticsDto analytics = new GlobalAnalyticsDto();

        // Sekwencje
        List<EmailSequence> allSequences = sequenceRepository.findAll();
        analytics.setTotalSequences(allSequences.size());
        analytics.setActiveSequences(allSequences.stream().filter(seq -> Boolean.TRUE.equals(seq.getActive())).count());

        // Wykonania
        List<SequenceExecution> allExecutions = executionRepository.findAll();
        analytics.setTotalExecutions(allExecutions.size());
        analytics.setActiveExecutions(executionRepository.countByStatus("active"));

        // Emaile
        List<ScheduledEmail> allScheduledEmails = scheduledEmailRepository.findAll();
        analytics.setTotalEmailsSent(allScheduledEmails.stream().filter(e -> "sent".equals(e.getStatus())).count());
        analytics.setTotalEmailsPending(allScheduledEmails.stream().filter(e -> "pending".equals(e.getStatus())).count());
        analytics.setTotalEmailsFailed(allScheduledEmails.stream().filter(e -> "failed".equals(e.getStatus())).count());

        // Open rate - zlicz emaile które zostały otwarte
        long emailsOpened = allScheduledEmails.stream()
                .filter(e -> "sent".equals(e.getStatus()) && e.getSentEmailId() != null)
                .map(e -> emailRepository.findById(e.getSentEmailId()).orElse(null))
                .filter(email -> email != null && Boolean.TRUE.equals(email.getIsOpened()))
                .count();

        analytics.setEmailsOpened(emailsOpened);

        // Oblicz rate
        if (analytics.getTotalEmailsSent() > 0) {
            analytics.setOverallOpenRate((double) emailsOpened / analytics.getTotalEmailsSent() * 100);
        }

        // Reply rate
        long repliedExecutions = executionRepository.countByStatus("replied");
        if (analytics.getTotalExecutions() > 0) {
            analytics.setOverallReplyRate((double) repliedExecutions / analytics.getTotalExecutions() * 100);
        }

        // Breakdown po sekwencjach
        List<SequenceAnalyticsDto> breakdown = new ArrayList<>();
        for (EmailSequence sequence : allSequences) {
            breakdown.add(getSequenceAnalytics(sequence.getId()));
        }
        analytics.setSequenceBreakdown(breakdown);

        return analytics;
    }

    /**
     * Pobiera analitykę dla konkretnej sekwencji
     */
    public SequenceAnalyticsDto getSequenceAnalytics(Long sequenceId) {
        EmailSequence sequence = sequenceRepository.findById(sequenceId)
                .orElseThrow(() -> new RuntimeException("Sequence not found"));

        SequenceAnalyticsDto analytics = new SequenceAnalyticsDto();
        analytics.setSequenceId(sequenceId);
        analytics.setSequenceName(sequence.getName());

        // Wykonania
        List<SequenceExecution> executions = executionRepository.findBySequenceId(sequenceId);
        analytics.setTotalExecutions(executions.size());
        analytics.setActiveExecutions(executions.stream().filter(e -> "active".equals(e.getStatus())).count());
        analytics.setCompletedExecutions(executions.stream().filter(e -> "completed".equals(e.getStatus())).count());
        analytics.setRepliedExecutions(executions.stream().filter(e -> "replied".equals(e.getStatus())).count());
        analytics.setPausedExecutions(executions.stream().filter(e -> "paused".equals(e.getStatus())).count());
        analytics.setFailedExecutions(executions.stream().filter(e -> "failed".equals(e.getStatus())).count());

        // Emaile dla tej sekwencji
        List<ScheduledEmail> scheduledEmails = executions.stream()
                .flatMap(exec -> scheduledEmailRepository.findByExecutionId(exec.getId()).stream())
                .toList();

        analytics.setTotalEmailsSent(scheduledEmails.stream().filter(e -> "sent".equals(e.getStatus())).count());
        analytics.setTotalEmailsPending(scheduledEmails.stream().filter(e -> "pending".equals(e.getStatus())).count());
        analytics.setTotalEmailsFailed(scheduledEmails.stream().filter(e -> "failed".equals(e.getStatus())).count());
        analytics.setTotalEmailsCancelled(scheduledEmails.stream().filter(e -> "cancelled".equals(e.getStatus())).count());

        // Open rate i Click rate
        long emailsOpened = 0;
        long emailsClicked = 0;

        for (ScheduledEmail scheduledEmail : scheduledEmails) {
            if ("sent".equals(scheduledEmail.getStatus()) && scheduledEmail.getSentEmailId() != null) {
                emailRepository.findById(scheduledEmail.getSentEmailId()).ifPresent(email -> {
                    if (Boolean.TRUE.equals(email.getIsOpened())) {
                        // emailsOpened++ - nie możemy modyfikować zmiennych lokalnych
                    }
                    // TODO: Dodać tracking kliknięć w przyszłości
                });
            }
        }

        // Workaround dla zliczania
        long finalEmailsOpened = scheduledEmails.stream()
                .filter(e -> "sent".equals(e.getStatus()) && e.getSentEmailId() != null)
                .map(e -> emailRepository.findById(e.getSentEmailId()).orElse(null))
                .filter(email -> email != null && Boolean.TRUE.equals(email.getIsOpened()))
                .count();

        analytics.setEmailsOpened(finalEmailsOpened);
        analytics.setEmailsClicked(0); // TODO: Implement click tracking

        // Oblicz rate
        if (analytics.getTotalEmailsSent() > 0) {
            analytics.setOpenRate((double) finalEmailsOpened / analytics.getTotalEmailsSent() * 100);
        }

        if (finalEmailsOpened > 0) {
            analytics.setClickRate((double) emailsClicked / finalEmailsOpened * 100);
        }

        if (analytics.getTotalExecutions() > 0) {
            analytics.setReplyRate((double) analytics.getRepliedExecutions() / analytics.getTotalExecutions() * 100);
            analytics.setCompletionRate((double) analytics.getCompletedExecutions() / analytics.getTotalExecutions() * 100);
            analytics.setFailureRate((double) analytics.getFailedExecutions() / analytics.getTotalExecutions() * 100);
        }

        return analytics;
    }
}
