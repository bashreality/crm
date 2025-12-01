package com.crm.dto.deals;

import lombok.Data;

@Data
public class AISequenceRequest {
    private Long dealId;
    private String websiteUrl;
    private String additionalContext;
    private String goal; // "meeting", "discovery", "sale", "re_engagement"
}