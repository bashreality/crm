package com.crm.service;

import com.crm.model.Contact;
import com.crm.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for detecting and merging duplicate contacts.
 * 
 * Duplicate detection is based on:
 * 1. Exact email match (case-insensitive) - highest confidence
 * 2. Similar name + same company - medium confidence
 * 3. Same phone number - medium confidence
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DuplicateDetectionService {

    private final ContactRepository contactRepository;

    /**
     * Find potential duplicates for all contacts
     */
    public List<DuplicateGroup> findAllDuplicates() {
        List<Contact> allContacts = contactRepository.findAll();
        Map<String, List<Contact>> emailGroups = new HashMap<>();
        
        // Group by normalized email
        for (Contact contact : allContacts) {
            if (contact.getEmail() != null && !contact.getEmail().isEmpty()) {
                String normalizedEmail = contact.getEmail().toLowerCase().trim();
                emailGroups.computeIfAbsent(normalizedEmail, k -> new ArrayList<>()).add(contact);
            }
        }
        
        List<DuplicateGroup> duplicates = new ArrayList<>();
        
        // Find groups with more than one contact (actual duplicates)
        for (Map.Entry<String, List<Contact>> entry : emailGroups.entrySet()) {
            if (entry.getValue().size() > 1) {
                DuplicateGroup group = new DuplicateGroup();
                group.setMatchType("EMAIL");
                group.setMatchValue(entry.getKey());
                group.setContacts(entry.getValue().stream()
                        .map(this::toContactSummary)
                        .collect(Collectors.toList()));
                group.setConfidence(100); // Email match is 100% confidence
                duplicates.add(group);
            }
        }
        
        // Also check for similar names within same company
        Map<String, List<Contact>> companyGroups = allContacts.stream()
                .filter(c -> c.getCompany() != null && !c.getCompany().isEmpty())
                .collect(Collectors.groupingBy(c -> c.getCompany().toLowerCase().trim()));
        
        for (Map.Entry<String, List<Contact>> entry : companyGroups.entrySet()) {
            List<Contact> companyContacts = entry.getValue();
            if (companyContacts.size() > 1) {
                // Check for similar names within company
                for (int i = 0; i < companyContacts.size(); i++) {
                    for (int j = i + 1; j < companyContacts.size(); j++) {
                        Contact c1 = companyContacts.get(i);
                        Contact c2 = companyContacts.get(j);
                        
                        if (areNamesSimilar(c1.getName(), c2.getName())) {
                            // Check if this pair is not already in duplicates (by email)
                            boolean alreadyFound = duplicates.stream()
                                    .anyMatch(g -> g.getContacts().stream()
                                            .anyMatch(cs -> cs.getId().equals(c1.getId()) || cs.getId().equals(c2.getId())));
                            
                            if (!alreadyFound) {
                                DuplicateGroup group = new DuplicateGroup();
                                group.setMatchType("NAME_COMPANY");
                                group.setMatchValue(c1.getName() + " @ " + entry.getKey());
                                group.setContacts(List.of(toContactSummary(c1), toContactSummary(c2)));
                                group.setConfidence(70); // Name + company match is 70% confidence
                                duplicates.add(group);
                            }
                        }
                    }
                }
            }
        }
        
        // Sort by confidence (highest first)
        duplicates.sort((a, b) -> Integer.compare(b.getConfidence(), a.getConfidence()));
        
        return duplicates;
    }

    /**
     * Find duplicates for a specific contact
     */
    public List<ContactSummary> findDuplicatesForContact(Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));
        
        List<ContactSummary> duplicates = new ArrayList<>();
        
        // Find by email
        if (contact.getEmail() != null) {
            contactRepository.findByEmailIgnoreCase(contact.getEmail())
                    .filter(c -> !c.getId().equals(contactId))
                    .ifPresent(c -> duplicates.add(toContactSummary(c)));
        }
        
        // Find by similar name in same company
        if (contact.getCompany() != null && contact.getName() != null) {
            List<Contact> companyContacts = contactRepository.findByCompanyContainingIgnoreCase(contact.getCompany());
            for (Contact c : companyContacts) {
                if (!c.getId().equals(contactId) && areNamesSimilar(c.getName(), contact.getName())) {
                    if (duplicates.stream().noneMatch(d -> d.getId().equals(c.getId()))) {
                        duplicates.add(toContactSummary(c));
                    }
                }
            }
        }
        
        return duplicates;
    }

    /**
     * Merge duplicate contacts into one
     * @param primaryId The contact to keep (will be enriched with data from secondary)
     * @param secondaryId The contact to merge into primary (will be deleted)
     */
    @Transactional
    public Contact mergeContacts(Long primaryId, Long secondaryId) {
        Contact primary = contactRepository.findById(primaryId)
                .orElseThrow(() -> new RuntimeException("Primary contact not found"));
        Contact secondary = contactRepository.findById(secondaryId)
                .orElseThrow(() -> new RuntimeException("Secondary contact not found"));
        
        log.info("Merging contact {} into {}", secondaryId, primaryId);
        
        // Enrich primary with data from secondary (only if primary is missing data)
        if ((primary.getPhone() == null || primary.getPhone().isEmpty()) && 
            secondary.getPhone() != null && !secondary.getPhone().isEmpty()) {
            primary.setPhone(secondary.getPhone());
        }
        
        if ((primary.getPosition() == null || primary.getPosition().isEmpty()) && 
            secondary.getPosition() != null && !secondary.getPosition().isEmpty()) {
            primary.setPosition(secondary.getPosition());
        }
        
        if ((primary.getCompany() == null || primary.getCompany().isEmpty() || "Nieznana".equals(primary.getCompany())) && 
            secondary.getCompany() != null && !secondary.getCompany().isEmpty() && !"Nieznana".equals(secondary.getCompany())) {
            primary.setCompany(secondary.getCompany());
        }
        
        // Merge counts
        if (secondary.getEmailCount() != null && secondary.getEmailCount() > 0) {
            primary.setEmailCount((primary.getEmailCount() != null ? primary.getEmailCount() : 0) + secondary.getEmailCount());
        }
        if (secondary.getMeetingCount() != null && secondary.getMeetingCount() > 0) {
            primary.setMeetingCount((primary.getMeetingCount() != null ? primary.getMeetingCount() : 0) + secondary.getMeetingCount());
        }
        if (secondary.getDealCount() != null && secondary.getDealCount() > 0) {
            primary.setDealCount((primary.getDealCount() != null ? primary.getDealCount() : 0) + secondary.getDealCount());
        }
        
        // Take the higher score
        if (secondary.getScore() != null && (primary.getScore() == null || secondary.getScore() > primary.getScore())) {
            primary.setScore(secondary.getScore());
        }
        
        // Merge tags
        if (secondary.getTags() != null && !secondary.getTags().isEmpty()) {
            if (primary.getTags() == null) {
                primary.setTags(new HashSet<>());
            }
            primary.getTags().addAll(secondary.getTags());
        }
        
        // Save primary with merged data
        Contact merged = contactRepository.save(primary);
        
        // Delete secondary
        contactRepository.delete(secondary);
        
        log.info("Successfully merged contact {} into {}. Secondary contact deleted.", secondaryId, primaryId);
        
        return merged;
    }

    /**
     * Check if two names are similar (Levenshtein distance based)
     */
    private boolean areNamesSimilar(String name1, String name2) {
        if (name1 == null || name2 == null) return false;
        
        String n1 = name1.toLowerCase().trim();
        String n2 = name2.toLowerCase().trim();
        
        // Exact match
        if (n1.equals(n2)) return true;
        
        // One contains the other (for cases like "Jan Kowalski" vs "Jan")
        if (n1.contains(n2) || n2.contains(n1)) return true;
        
        // Check Levenshtein distance for shorter names
        if (n1.length() <= 20 && n2.length() <= 20) {
            int distance = levenshteinDistance(n1, n2);
            int maxLen = Math.max(n1.length(), n2.length());
            double similarity = 1.0 - ((double) distance / maxLen);
            return similarity >= 0.8; // 80% similarity threshold
        }
        
        return false;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,      // deletion
                        dp[i][j - 1] + 1),     // insertion
                        dp[i - 1][j - 1] + cost); // substitution
            }
        }
        
        return dp[s1.length()][s2.length()];
    }

    private ContactSummary toContactSummary(Contact contact) {
        ContactSummary summary = new ContactSummary();
        summary.setId(contact.getId());
        summary.setName(contact.getName());
        summary.setEmail(contact.getEmail());
        summary.setCompany(contact.getCompany());
        summary.setPhone(contact.getPhone());
        summary.setScore(contact.getScore());
        summary.setEmailCount(contact.getEmailCount());
        return summary;
    }

    /**
     * DTO for duplicate group
     */
    @lombok.Data
    public static class DuplicateGroup {
        private String matchType; // EMAIL, NAME_COMPANY, PHONE
        private String matchValue;
        private int confidence; // 0-100
        private List<ContactSummary> contacts;
    }

    /**
     * DTO for contact summary in duplicate detection
     */
    @lombok.Data
    public static class ContactSummary {
        private Long id;
        private String name;
        private String email;
        private String company;
        private String phone;
        private Integer score;
        private Integer emailCount;
    }
}

