package com.crm.dto.sequence;

import lombok.Builder;
import lombok.Singular;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class SequenceDetailsDto {
    SequenceSummaryDto summary;

    @Singular
    List<SequenceStepDto> steps;

    Long pendingScheduledEmails;
}

