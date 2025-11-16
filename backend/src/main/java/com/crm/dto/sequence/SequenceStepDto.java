package com.crm.dto.sequence;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SequenceStepDto {
    Long id;
    Integer stepOrder;
    String stepType;
    String subject;
    String body;
    Integer delayDays;
    Integer delayHours;
    Integer delayMinutes;
    Integer waitForReplyHours;
    Boolean skipIfReplied;
    Boolean trackOpens;
    Boolean trackClicks;
}

