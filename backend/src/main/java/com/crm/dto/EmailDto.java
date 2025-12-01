package com.crm.dto;

import com.crm.model.Tag;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailDto {
    private Long id;
    private String sender;
    private String recipient;
    private String subject;
    private String preview;
    private String content;
    private String status;
    private String company;
    private String messageId;
    private String inReplyTo;
    private String referencesHeader;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
    private String trackingId;
    private Boolean isOpened;
    private LocalDateTime openedAt;
    private Integer openCount;
    private Set<Tag> senderTags;
    private Long senderContactId;
}
