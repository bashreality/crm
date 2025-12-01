package com.crm.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SequenceAnalyticsDto {
    private Long sequenceId;
    private String sequenceName;

    // Execution metrics
    private long totalExecutions;
    private long activeExecutions;
    private long completedExecutions;
    private long repliedExecutions;
    private long pausedExecutions;
    private long failedExecutions;

    // Email metrics
    private long totalEmailsSent;
    private long totalEmailsPending;
    private long totalEmailsFailed;
    private long totalEmailsCancelled;

    // Engagement metrics
    private long emailsOpened;
    private long emailsClicked;

    // Calculated rates
    private double openRate;        // emailsOpened / totalEmailsSent
    private double clickRate;       // emailsClicked / emailsOpened
    private double replyRate;       // repliedExecutions / totalExecutions
    private double completionRate;  // completedExecutions / totalExecutions
    private double failureRate;     // failedExecutions / totalExecutions
}
