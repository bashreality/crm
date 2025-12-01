package com.crm.mapper;

import com.crm.dto.EmailDto;
import com.crm.model.Email;
import org.springframework.stereotype.Component;

@Component
public class EmailMapper {

    public EmailDto toDto(Email email) {
        if (email == null) {
            return null;
        }
        EmailDto dto = new EmailDto();
        dto.setId(email.getId());
        dto.setSender(email.getSender());
        dto.setRecipient(email.getRecipient());
        dto.setSubject(email.getSubject());
        dto.setPreview(email.getPreview());
        dto.setContent(email.getContent());
        dto.setStatus(email.getStatus());
        dto.setCompany(email.getCompany());
        dto.setMessageId(email.getMessageId());
        dto.setInReplyTo(email.getInReplyTo());
        dto.setReferencesHeader(email.getReferencesHeader());
        dto.setReceivedAt(email.getReceivedAt());
        dto.setCreatedAt(email.getCreatedAt());
        dto.setTrackingId(email.getTrackingId());
        dto.setIsOpened(email.getIsOpened());
        dto.setOpenedAt(email.getOpenedAt());
        dto.setOpenCount(email.getOpenCount());
        return dto;
    }
}
