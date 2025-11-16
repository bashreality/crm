package com.crm.dto.sequence;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SequenceDashboardDto {
    Long totalSequences;
    Long activeSequences;
    Long pausedSequences;
    Long totalExecutions;
    Long activeExecutions;
    Long pausedExecutions;
    Long completedExecutions;
    Long pendingScheduledEmails;
}

