package com.crm.service;

import com.crm.exception.ResourceAlreadyExistsException;
import com.crm.model.Contact;
import com.crm.model.Tag;
import com.crm.repository.ContactRepository;
import com.crm.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class TagService {

    private final TagRepository tagRepository;
    private final ContactRepository contactRepository;
    @Lazy
    private final WorkflowAutomationService workflowAutomationService;

    @Cacheable(value = "tags")
    public List<Tag> getAllTags() {
        log.debug("Fetching all tags from database (cache miss)");
        return tagRepository.findAll();
    }

    public Tag getTagById(Long id) {
        return tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag nie znaleziony"));
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public Tag createTag(String name, String color) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Nazwa tagu nie może być pusta");
        }
        if (tagRepository.existsByName(name)) {
            throw new ResourceAlreadyExistsException("Tag o nazwie '" + name + "' już istnieje");
        }
        if (color != null && !color.matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")) {
            throw new IllegalArgumentException("Nieprawidłowy format koloru (oczekiwany hex, np. #3b82f6)");
        }

        Tag tag = new Tag();
        tag.setName(name);
        tag.setColor(color != null ? color : "#6b7280");

        return tagRepository.save(tag);
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public Tag updateTag(Long id, String name, String color) {
        Tag tag = getTagById(id);

        if (name != null && !name.equals(tag.getName())) {
            if (name.trim().isEmpty()) {
                throw new IllegalArgumentException("Nazwa tagu nie może być pusta");
            }
            if (tagRepository.existsByName(name)) {
                throw new ResourceAlreadyExistsException("Tag o nazwie '" + name + "' już istnieje");
            }
            tag.setName(name);
        }

        if (color != null) {
            if (!color.matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")) {
                throw new IllegalArgumentException("Nieprawidłowy format koloru (oczekiwany hex, np. #3b82f6)");
            }
            tag.setColor(color);
        }

        return tagRepository.save(tag);
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public void deleteTag(Long id) {
        Tag tag = getTagById(id);
        tagRepository.delete(tag);
    }

    @Transactional
    public Contact addTagToContact(Long contactId, Long tagId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Kontakt nie znaleziony"));
        Tag tag = getTagById(tagId);

        if (contact.getTags() == null) {
            contact.setTags(new java.util.HashSet<>());
        }
        boolean tagAdded = false;
        if (!contact.getTags().contains(tag)) {
            contact.getTags().add(tag);
            contactRepository.saveAndFlush(contact);
            tagAdded = true;
        } else {
            log.debug("Tag {} already present on contact {}, skipping insert", tagId, contactId);
        }
        
        Contact savedContact = contactRepository.findById(contactId).orElse(contact);
        
        // Trigger workflow automation po dodaniu tagu
        if (tagAdded) {
            try {
                workflowAutomationService.handleTagAdded(savedContact, tag);
            } catch (Exception e) {
                log.error("Error triggering TAG_ADDED workflow: {}", e.getMessage(), e);
            }
        }
        
        return savedContact;
    }

    @Transactional
    public Contact removeTagFromContact(Long contactId, Long tagId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Kontakt nie znaleziony"));
        Tag tag = getTagById(tagId);

        boolean hadTag = contact.getTags().contains(tag);
        contact.getTags().remove(tag);
        Contact savedContact = contactRepository.save(contact);
        
        // Trigger workflow automation po usunięciu tagu
        if (hadTag) {
            try {
                workflowAutomationService.handleTagRemoved(savedContact, tag);
            } catch (Exception e) {
                log.error("Error triggering TAG_REMOVED workflow: {}", e.getMessage(), e);
            }
        }
        
        return savedContact;
    }

    @Transactional
    public void addTagToContacts(Set<Long> contactIds, Long tagId) {
        Tag tag = getTagById(tagId);

        for (Long contactId : contactIds) {
            Contact contact = contactRepository.findById(contactId).orElse(null);
            if (contact != null) {
                if (contact.getTags() == null) {
                    contact.setTags(new java.util.HashSet<>());
                }
                if (!contact.getTags().contains(tag)) {
                    contact.getTags().add(tag);
                    contactRepository.saveAndFlush(contact);
                    
                    // Trigger workflow automation po dodaniu tagu (bulk)
                    try {
                        workflowAutomationService.handleTagAdded(contact, tag);
                    } catch (Exception e) {
                        log.error("Error triggering TAG_ADDED workflow for contact {}: {}", 
                                 contactId, e.getMessage());
                    }
                } else {
                    log.debug("Tag {} already present on contact {}, skipping insert (bulk)", tagId, contactId);
                }
            }
        }
    }

    @Transactional
    public void removeTagFromContacts(Set<Long> contactIds, Long tagId) {
        Tag tag = getTagById(tagId);

        for (Long contactId : contactIds) {
            Contact contact = contactRepository.findById(contactId).orElse(null);
            if (contact != null) {
                boolean hadTag = contact.getTags().contains(tag);
                contact.getTags().remove(tag);
                contactRepository.save(contact);
                
                // Trigger workflow automation po usunięciu tagu (bulk)
                if (hadTag) {
                    try {
                        workflowAutomationService.handleTagRemoved(contact, tag);
                    } catch (Exception e) {
                        log.error("Error triggering TAG_REMOVED workflow for contact {}: {}", 
                                 contactId, e.getMessage());
                    }
                }
            }
        }
    }

    public List<Contact> getContactsByTag(Long tagId) {
        return contactRepository.findByTagId(tagId);
    }
}
