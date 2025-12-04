package com.crm.service;

import com.crm.exception.ResourceNotFoundException;
import com.crm.exception.ValidationException;
import com.crm.model.Contact;
import com.crm.model.EmailTemplate;
import com.crm.model.EmailTemplateTheme;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailTemplateRepository;
import com.crm.repository.EmailTemplateThemeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EmailTemplateService {

    private final EmailTemplateRepository templateRepository;
    private final EmailTemplateThemeRepository themeRepository;
    private final ContactRepository contactRepository;
    private final UserContextService userContextService;
    private final EmailSendingService emailSendingService;

    // ============ Template Management ============

    public List<EmailTemplate> getAllTemplates() {
        Long userId = userContextService.getCurrentUserId();
        return templateRepository.findByUserId(userId);
    }

    public Page<EmailTemplate> getAllTemplates(Pageable pageable) {
        Long userId = userContextService.getCurrentUserId();
        return templateRepository.findByUserId(userId, pageable);
    }

    public EmailTemplate getTemplateById(Long id) {
        Long userId = userContextService.getCurrentUserId();
        EmailTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        
        if (!userId.equals(template.getUserId())) {
            throw new ValidationException("Access denied");
        }
        
        return template;
    }

    public List<EmailTemplate> getTemplatesByCategory(String category) {
        Long userId = userContextService.getCurrentUserId();
        return templateRepository.findByUserIdAndCategory(userId, category);
    }

    public List<EmailTemplate> getFavoriteTemplates() {
        Long userId = userContextService.getCurrentUserId();
        return templateRepository.findByUserIdAndIsFavoriteTrue(userId);
    }

    public List<EmailTemplate> searchTemplates(String query) {
        Long userId = userContextService.getCurrentUserId();
        return templateRepository.searchByName(userId, query);
    }

    public EmailTemplate createTemplate(EmailTemplate template) {
        Long userId = userContextService.getCurrentUserId();
        template.setUserId(userId);
        
        validateTemplate(template);
        
        return templateRepository.save(template);
    }

    public EmailTemplate updateTemplate(Long id, EmailTemplate templateDetails) {
        EmailTemplate template = getTemplateById(id); // Checks ownership
        
        template.setName(templateDetails.getName());
        template.setDescription(templateDetails.getDescription());
        template.setCategory(templateDetails.getCategory());
        template.setSubject(templateDetails.getSubject());
        template.setPreviewText(templateDetails.getPreviewText());
        template.setHtmlContent(templateDetails.getHtmlContent());
        template.setPlainTextContent(templateDetails.getPlainTextContent());
        template.setVariables(templateDetails.getVariables());
        template.setIsFavorite(templateDetails.getIsFavorite());
        
        if (templateDetails.getTheme() != null) {
            template.setTheme(templateDetails.getTheme());
        }
        
        validateTemplate(template);
        
        return templateRepository.save(template);
    }

    public void deleteTemplate(Long id) {
        EmailTemplate template = getTemplateById(id); // Checks ownership
        templateRepository.delete(template);
    }

    public EmailTemplate toggleFavorite(Long id) {
        EmailTemplate template = getTemplateById(id);
        template.setIsFavorite(!template.getIsFavorite());
        return templateRepository.save(template);
    }

    // ============ Theme Management ============

    public List<EmailTemplateTheme> getAllThemes() {
        Long userId = userContextService.getCurrentUserId();
        return themeRepository.findAccessibleByUserId(userId);
    }

    public EmailTemplateTheme getThemeById(Long id) {
        return themeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Theme not found"));
    }

    public EmailTemplateTheme createTheme(EmailTemplateTheme theme) {
        Long userId = userContextService.getCurrentUserId();
        theme.setUserId(userId);
        theme.setIsSystem(false); // User themes are never system themes
        
        validateTheme(theme);
        
        return themeRepository.save(theme);
    }

    public EmailTemplateTheme updateTheme(Long id, EmailTemplateTheme themeDetails) {
        EmailTemplateTheme theme = themeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Theme not found"));
        
        if (Boolean.TRUE.equals(theme.getIsSystem())) {
            throw new ValidationException("Cannot modify system themes");
        }
        
        Long userId = userContextService.getCurrentUserId();
        if (!userId.equals(theme.getUserId())) {
            throw new ValidationException("Access denied");
        }
        
        theme.setName(themeDetails.getName());
        theme.setDescription(themeDetails.getDescription());
        theme.setThumbnailUrl(themeDetails.getThumbnailUrl());
        theme.setHtmlStructure(themeDetails.getHtmlStructure());
        theme.setCssStyles(themeDetails.getCssStyles());
        
        validateTheme(theme);
        
        return themeRepository.save(theme);
    }

    public void deleteTheme(Long id) {
        EmailTemplateTheme theme = themeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Theme not found"));
        
        // Check if theme is in use by any templates
        Long usageCount = themeRepository.countTemplatesUsingTheme(id);
        if (usageCount > 0) {
            throw new ValidationException("Nie można usunąć motywu używanego przez " + usageCount + " szablon(ów). Najpierw zmień motyw w tych szablonach.");
        }
        
        themeRepository.delete(theme);
    }

    // ============ Template Rendering ============

    /**
     * Render template with contact data and theme
     */
    public String renderTemplate(Long templateId, Contact contact, Map<String, String> customVariables) {
        EmailTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        
        // Increment usage counter
        template.incrementUsage();
        templateRepository.save(template);
        
        // Prepare variables
        Map<String, String> variables = prepareVariables(contact, customVariables);
        
        // Render content
        String renderedContent = processTemplate(template.getHtmlContent(), variables);
        
        // Apply theme if present
        if (template.getTheme() != null) {
            return applyTheme(template.getTheme(), renderedContent, variables);
        }
        
        return renderedContent;
    }

    /**
     * Render template with theme
     */
    private String applyTheme(EmailTemplateTheme theme, String content, Map<String, String> variables) {
        String html = theme.getHtmlStructure();
        
        // Replace CSS placeholder
        html = html.replace("{{CSS_STYLES}}", theme.getCssStyles());
        
        // Replace content placeholder
        html = html.replace("{{CONTENT}}", content);
        
        // Replace other common placeholders
        html = processTemplate(html, variables);
        
        return html;
    }

    /**
     * Process template by replacing all {{variable}} placeholders
     */
    private String processTemplate(String template, Map<String, String> variables) {
        if (template == null) {
            return "";
        }
        
        String result = template;
        Pattern pattern = Pattern.compile("\\{\\{([^}]+)\\}\\}");
        Matcher matcher = pattern.matcher(template);
        
        while (matcher.find()) {
            String variable = matcher.group(1);
            String value = variables.getOrDefault(variable, "");
            result = result.replace("{{" + variable + "}}", value);
        }
        
        return result;
    }

    /**
     * Prepare variables map from contact and custom variables
     */
    private Map<String, String> prepareVariables(Contact contact, Map<String, String> customVariables) {
        Map<String, String> variables = new HashMap<>();
        
        // Contact variables
        if (contact != null) {
            variables.put("name", contact.getName() != null ? contact.getName() : "");
            variables.put("firstName", extractFirstName(contact.getName()));
            variables.put("email", contact.getEmail() != null ? contact.getEmail() : "");
            variables.put("company", contact.getCompany() != null ? contact.getCompany() : "");
            variables.put("position", contact.getPosition() != null ? contact.getPosition() : "");
            variables.put("phone", contact.getPhone() != null ? contact.getPhone() : "");
        }
        
        // Add custom variables (override contact variables if present)
        if (customVariables != null) {
            variables.putAll(customVariables);
        }
        
        // Add default placeholders
        variables.putIfAbsent("LOGO", "<strong>Your Company</strong>");
        variables.putIfAbsent("FOOTER", "© " + java.time.Year.now() + " Your Company. All rights reserved.");
        variables.putIfAbsent("TAGLINE", "");
        variables.putIfAbsent("HERO_IMAGE", "");
        variables.putIfAbsent("CTA", "");
        
        return variables;
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "";
        }
        String[] parts = fullName.trim().split("\\s+");
        return parts[0];
    }

    // ============ Validation ============

    private void validateTemplate(EmailTemplate template) {
        if (template.getName() == null || template.getName().trim().isEmpty()) {
            throw new ValidationException("Template name is required");
        }
        
        if (template.getName().length() > 200) {
            throw new ValidationException("Template name cannot exceed 200 characters");
        }
        
        if (template.getSubject() == null || template.getSubject().trim().isEmpty()) {
            throw new ValidationException("Template subject is required");
        }
        
        if (template.getSubject().length() > 500) {
            throw new ValidationException("Template subject cannot exceed 500 characters");
        }
        
        if (template.getHtmlContent() == null || template.getHtmlContent().trim().isEmpty()) {
            throw new ValidationException("Template HTML content is required");
        }
        
        if (template.getCategory() == null || template.getCategory().trim().isEmpty()) {
            throw new ValidationException("Template category is required");
        }
        
        // Validate category
        List<String> validCategories = List.of("newsletter", "follow-up", "welcome", "promotional", "general", "transactional");
        if (!validCategories.contains(template.getCategory().toLowerCase())) {
            throw new ValidationException("Invalid category. Must be one of: " + String.join(", ", validCategories));
        }
    }

    private void validateTheme(EmailTemplateTheme theme) {
        if (theme.getName() == null || theme.getName().trim().isEmpty()) {
            throw new ValidationException("Theme name is required");
        }
        
        if (theme.getHtmlStructure() == null || theme.getHtmlStructure().trim().isEmpty()) {
            throw new ValidationException("Theme HTML structure is required");
        }
        
        if (theme.getCssStyles() == null || theme.getCssStyles().trim().isEmpty()) {
            throw new ValidationException("Theme CSS styles are required");
        }
        
        // Validate that HTML structure contains required placeholders
        if (!theme.getHtmlStructure().contains("{{CONTENT}}")) {
            throw new ValidationException("Theme HTML structure must contain {{CONTENT}} placeholder");
        }
    }

    // ============ Statistics ============

    public Map<String, Object> getTemplateStats() {
        Long userId = userContextService.getCurrentUserId();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTemplates", templateRepository.findByUserId(userId).size());
        stats.put("favoriteTemplates", templateRepository.findByUserIdAndIsFavoriteTrue(userId).size());
        
        // Count by category
        Map<String, Long> byCategory = new HashMap<>();
        for (String category : List.of("newsletter", "follow-up", "welcome", "promotional", "general")) {
            Long count = templateRepository.countByUserIdAndCategory(userId, category);
            byCategory.put(category, count);
        }
        stats.put("byCategory", byCategory);
        
        return stats;
    }

    // ============ Newsletter Sending ============

    /**
     * Send newsletter to all contacts with a specific tag
     */
    public Map<String, Object> sendNewsletterToTag(Long templateId, Long tagId, String subject) {
        log.info("Sending newsletter - templateId: {}, tagId: {}", templateId, tagId);
        
        // Get template
        EmailTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        
        // Get contacts with the specified tag
        List<Contact> contacts = contactRepository.findByTagId(tagId);
        
        if (contacts.isEmpty()) {
            throw new ValidationException("Brak kontaktów z wybranym tagiem");
        }
        
        // Use provided subject or template subject
        String emailSubject = (subject != null && !subject.trim().isEmpty()) 
                ? subject 
                : template.getSubject();
        
        // Send emails asynchronously
        int successCount = 0;
        int failCount = 0;
        
        for (Contact contact : contacts) {
            try {
                // Render template for this contact
                String renderedHtml = renderTemplateForContact(template, contact);
                String renderedSubject = processTemplate(emailSubject, prepareVariables(contact, null));
                
                // Send email
                emailSendingService.sendEmail(
                        contact.getEmail(),
                        renderedSubject,
                        renderedHtml
                );
                
                successCount++;
                log.debug("Newsletter sent to: {}", contact.getEmail());
            } catch (Exception e) {
                failCount++;
                log.error("Failed to send newsletter to {}: {}", contact.getEmail(), e.getMessage());
            }
        }
        
        // Increment template usage
        template.incrementUsage();
        templateRepository.save(template);
        
        log.info("Newsletter sending completed - success: {}, failed: {}", successCount, failCount);
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalContacts", contacts.size());
        result.put("successCount", successCount);
        result.put("failCount", failCount);
        result.put("message", String.format("Newsletter wysłany do %d z %d odbiorców", successCount, contacts.size()));
        
        return result;
    }

    /**
     * Render template for a specific contact
     */
    private String renderTemplateForContact(EmailTemplate template, Contact contact) {
        Map<String, String> variables = prepareVariables(contact, null);
        String renderedContent = processTemplate(template.getHtmlContent(), variables);
        
        if (template.getTheme() != null) {
            return applyTheme(template.getTheme(), renderedContent, variables);
        }
        
        return renderedContent;
    }
}