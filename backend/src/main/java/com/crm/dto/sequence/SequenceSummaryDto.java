package com.crm.dto.sequence;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Value
@Builder
public class SequenceSummaryDto {
    Long id;
    String name;
    String description;
    Boolean active;
    String timezone;
    LocalTime sendWindowStart;
    LocalTime sendWindowEnd;
    Boolean sendOnWeekends;
    Integer dailySendingLimit;
    Integer throttlePerHour;
    Integer stepsCount;
    Long executionsTotal;
    Long executionsActive;
    Long executionsPaused;
    Long executionsCompleted;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime nextScheduledSend;
}

