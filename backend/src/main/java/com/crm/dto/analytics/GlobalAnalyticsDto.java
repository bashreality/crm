package com.crm.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalAnalyticsDto {
    // Overall metrics
    private long totalSequences;
    private long activeSequences;
    private long totalExecutions;
    private long activeExecutions;

    // Email metrics
    private long totalEmailsSent;
    private long totalEmailsPending;
    private long totalEmailsFailed;

    // Engagement
    private long emailsOpened;
    private double overallOpenRate;
    private double overallReplyRate;

    // Breakdown by sequence
    private List<SequenceAnalyticsDto> sequenceBreakdown;
}
