package com.crm.controller;

import com.crm.model.Contact;
import com.crm.model.EmailTemplate;
import com.crm.model.EmailTemplateTheme;
import com.crm.repository.ContactRepository;
import com.crm.service.EmailTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/email-templates")
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateController {

    private final EmailTemplateService templateService;
    private final ContactRepository contactRepository;

    // ============ Template Management ============

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllTemplates(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "false") Boolean favoritesOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            List<EmailTemplate> templates;
            
            if (favoritesOnly) {
                templates = templateService.getFavoriteTemplates();
            } else if (search != null && !search.trim().isEmpty()) {
                templates = templateService.searchTemplates(search);
            } else if (category != null && !category.trim().isEmpty()) {
                templates = templateService.getTemplatesByCategory(category);
            } else {
                Pageable pageable = PageRequest.of(page, size);
                Page<EmailTemplate> templatesPage = templateService.getAllTemplates(pageable);
                
                Map<String, Object> response = new HashMap<>();
                response.put("content", templatesPage.getContent());
                response.put("totalElements", templatesPage.getTotalElements());
                response.put("totalPages", templatesPage.getTotalPages());
                response.put("currentPage", templatesPage.getNumber());
                response.put("size", templatesPage.getSize());
                
                return ResponseEntity.ok(response);
            }
            
            // For non-paginated responses
            Map<String, Object> response = new HashMap<>();
            response.put("content", templates);
            response.put("totalElements", templates.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching templates", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailTemplate> getTemplate(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(templateService.getTemplateById(id));
        } catch (Exception e) {
            log.error("Error fetching template {}", id, e);
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<EmailTemplate> createTemplate(@RequestBody EmailTemplate template) {
        try {
            EmailTemplate created = templateService.createTemplate(template);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating template", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailTemplate> updateTemplate(
            @PathVariable Long id,
            @RequestBody EmailTemplate template) {
        try {
            EmailTemplate updated = templateService.updateTemplate(id, template);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating template {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        try {
            templateService.deleteTemplate(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting template {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/toggle-favorite")
    public ResponseEntity<EmailTemplate> toggleFavorite(@PathVariable Long id) {
        try {
            EmailTemplate updated = templateService.toggleFavorite(id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error toggling favorite for template {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/preview")
    public ResponseEntity<Map<String, String>> previewTemplate(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            Long contactId = request.get("contactId") != null ? 
                    ((Number) request.get("contactId")).longValue() : null;
            
            @SuppressWarnings("unchecked")
            Map<String, String> customVariables = (Map<String, String>) request.get("variables");
            
            Contact contact = null;
            if (contactId != null) {
                contact = contactRepository.findById(contactId).orElse(null);
            }
            
            String rendered = templateService.renderTemplate(id, contact, customVariables);
            
            Map<String, String> response = new HashMap<>();
            response.put("html", rendered);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error previewing template {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        try {
            return ResponseEntity.ok(templateService.getTemplateStats());
        } catch (Exception e) {
            log.error("Error fetching template stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ============ Theme Management ============

    @GetMapping("/themes")
    public ResponseEntity<List<EmailTemplateTheme>> getAllThemes() {
        try {
            return ResponseEntity.ok(templateService.getAllThemes());
        } catch (Exception e) {
            log.error("Error fetching themes", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/themes/{id}")
    public ResponseEntity<EmailTemplateTheme> getTheme(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(templateService.getThemeById(id));
        } catch (Exception e) {
            log.error("Error fetching theme {}", id, e);
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/themes")
    public ResponseEntity<EmailTemplateTheme> createTheme(@RequestBody EmailTemplateTheme theme) {
        try {
            EmailTemplateTheme created = templateService.createTheme(theme);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating theme", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/themes/{id}")
    public ResponseEntity<EmailTemplateTheme> updateTheme(
            @PathVariable Long id,
            @RequestBody EmailTemplateTheme theme) {
        try {
            EmailTemplateTheme updated = templateService.updateTheme(id, theme);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating theme {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/themes/{id}")
    public ResponseEntity<Void> deleteTheme(@PathVariable Long id) {
        try {
            templateService.deleteTheme(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting theme {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    // ============ Newsletter Sending ============

    @PostMapping("/send-newsletter")
    public ResponseEntity<Map<String, Object>> sendNewsletter(@RequestBody Map<String, Object> request) {
        try {
            Long templateId = ((Number) request.get("templateId")).longValue();
            Long tagId = ((Number) request.get("tagId")).longValue();
            String subject = (String) request.get("subject");

            Map<String, Object> result = templateService.sendNewsletterToTag(templateId, tagId, subject);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error sending newsletter", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage(), "success", false));
        }
    }
}