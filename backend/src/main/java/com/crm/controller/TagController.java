package com.crm.controller;

import com.crm.model.Contact;
import com.crm.model.Tag;
import com.crm.service.TagService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<List<Tag>> getAllTags() {
        return ResponseEntity.ok(tagService.getAllTags());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tag> getTagById(@PathVariable Long id) {
        return ResponseEntity.ok(tagService.getTagById(id));
    }

    @PostMapping
    public ResponseEntity<Tag> createTag(@RequestBody TagRequest request) {
        Tag tag = tagService.createTag(request.getName(), request.getColor());
        return ResponseEntity.ok(tag);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tag> updateTag(@PathVariable Long id, @RequestBody TagRequest request) {
        Tag tag = tagService.updateTag(id, request.getName(), request.getColor());
        return ResponseEntity.ok(tag);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/contact/{contactId}/add/{tagId}")
    public ResponseEntity<Contact> addTagToContact(
            @PathVariable Long contactId,
            @PathVariable Long tagId
    ) {
        Contact contact = tagService.addTagToContact(contactId, tagId);
        return ResponseEntity.ok(contact);
    }

    @DeleteMapping("/contact/{contactId}/remove/{tagId}")
    public ResponseEntity<Contact> removeTagFromContact(
            @PathVariable Long contactId,
            @PathVariable Long tagId
    ) {
        Contact contact = tagService.removeTagFromContact(contactId, tagId);
        return ResponseEntity.ok(contact);
    }

    @PostMapping("/contacts/add")
    public ResponseEntity<Void> addTagToContacts(@RequestBody BulkTagRequest request) {
        tagService.addTagToContacts(request.getContactIds(), request.getTagId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/contacts/remove")
    public ResponseEntity<Void> removeTagFromContacts(@RequestBody BulkTagRequest request) {
        tagService.removeTagFromContacts(request.getContactIds(), request.getTagId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{tagId}/contacts")
    public ResponseEntity<List<Contact>> getContactsByTag(@PathVariable Long tagId) {
        return ResponseEntity.ok(tagService.getContactsByTag(tagId));
    }

    @Data
    public static class TagRequest {
        private String name;
        private String color;
    }

    @Data
    public static class BulkTagRequest {
        private Set<Long> contactIds;
        private Long tagId;
    }
}
