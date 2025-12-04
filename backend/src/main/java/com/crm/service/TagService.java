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
        if (!contact.getTags().contains(tag)) {
            contact.getTags().add(tag);
            contactRepository.saveAndFlush(contact);
        } else {
            log.debug("Tag {} already present on contact {}, skipping insert", tagId, contactId);
        }
        return contactRepository.findById(contactId).orElse(contact);
    }

    @Transactional
    public Contact removeTagFromContact(Long contactId, Long tagId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Kontakt nie znaleziony"));
        Tag tag = getTagById(tagId);

        contact.getTags().remove(tag);
        return contactRepository.save(contact);
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
                contact.getTags().remove(tag);
                contactRepository.save(contact);
            }
        }
    }

    public List<Contact> getContactsByTag(Long tagId) {
        return contactRepository.findByTagId(tagId);
    }
}
