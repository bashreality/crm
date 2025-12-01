package com.crm.mapper;

import com.crm.dto.ContactDto;
import com.crm.model.Contact;
import com.crm.repository.SequenceExecutionRepository;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public abstract class ContactMapper {

    @Autowired
    protected SequenceExecutionRepository sequenceExecutionRepository;

    public abstract ContactDto toDto(Contact contact);

    @AfterMapping
    protected void setInActiveSequence(@MappingTarget ContactDto dto, Contact contact) {
        if (contact.getId() != null) {
            boolean inActive = sequenceExecutionRepository.existsByContactIdAndStatus(contact.getId(), "active");
            dto.setInActiveSequence(inActive);
        } else {
            dto.setInActiveSequence(false);
        }
    }

    @Mapping(target = "emailCount", defaultValue = "0")
    @Mapping(target = "meetingCount", defaultValue = "0")
    @Mapping(target = "dealCount", defaultValue = "0")
    @Mapping(target = "score", defaultValue = "0")
    public abstract Contact toEntity(ContactDto dto);
}