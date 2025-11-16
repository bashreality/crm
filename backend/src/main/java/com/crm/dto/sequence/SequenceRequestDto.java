package com.crm.dto.sequence;

import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class SequenceRequestDto {
    private String name;
    private String description;
    private Boolean active;
    private String timezone;
    private LocalTime sendWindowStart;
    private LocalTime sendWindowEnd;
    private Boolean sendOnWeekends;
    private Integer dailySendingLimit;
    private Integer throttlePerHour;
    private List<SequenceStepRequestDto> steps;
}

