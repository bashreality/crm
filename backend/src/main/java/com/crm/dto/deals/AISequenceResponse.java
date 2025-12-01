package com.crm.dto.deals;

import lombok.Data;
import java.util.List;

@Data
public class AISequenceResponse {
    private List<AIEmailStep> emails;
    private String suggestedSequenceName;
    private String analysis;

    @Data
    public static class AIEmailStep {
        private Integer stepNumber;
        private String delay; // np. "1 day", "3 days"
        private Integer delayHours; // opóźnienie w godzinach
        private Integer delay_in_days; // opóźnienie w dniach
        private String subject;
        private String body;
        private String reasoning; // dlaczego AI proponuje taką treść
    }
}