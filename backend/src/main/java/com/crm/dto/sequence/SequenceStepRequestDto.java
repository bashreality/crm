package com.crm.dto.sequence;

import lombok.Data;

@Data
public class SequenceStepRequestDto {
    private Long id;
    private Integer stepOrder;
    private String stepType;
    private String subject;
    private String body;
    private Integer delayDays;
    private Integer delayHours;
    private Integer delayMinutes;
    private Integer waitForReplyHours;
    private Boolean skipIfReplied;
    private Boolean trackOpens;
    private Boolean trackClicks;
}

