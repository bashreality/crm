package com.crm.service;

import com.crm.model.*;
import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service responsible for calculating and updating lead scores for contacts.
 * 
 * Scoring Rules (Enhanced):
 * - Positive email response: +20 points
 * - Neutral email response: +5 points
 * - Negative email response: -10 points
 * - Email count > 5: +10 points
 * - Has active deal: +30 points
 * - Deal won: +50 points
 * - Meeting scheduled: +15 points (max 3)
 * - Recent activity (last 7 days): +10 points
 * - No activity in 30 days: -20 points
 * 
 * NEW - Email Engagement Metrics:
 * - High open rate (>50%): +15 points
 * - High click rate (>20%): +20 points
 * - Low open rate (<10%): -10 points
 * 
 * NEW - Decay Factor:
 * - Interactions older than 90 days have reduced weight (50%)
 * - Interactions older than 180 days have minimal weight (25%)
 * 
 * NEW - Segment Classification:
 * - Hot Lead: Score >= 70
 * - Warm Lead: Score 40-69
 * - Cold Lead: Score < 40
 * 
 * Maximum score: 100 (capped)
 * Minimum score: 0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadScoringService {

    private final ContactRepository contactRepository;
    private final EmailRepository emailRepository;
    private final DealRepository dealRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    @Lazy
    private final WorkflowSchedulerService workflowSchedulerService;

    // Scoring weights
    private static final int POSITIVE_EMAIL_SCORE = 20;
    private static final int NEUTRAL_EMAIL_SCORE = 5;
    private static final int NEGATIVE_EMAIL_SCORE = -10;
    private static final int HIGH_EMAIL_COUNT_SCORE = 10;
    private static final int ACTIVE_DEAL_SCORE = 30;
    private static final int WON_DEAL_SCORE = 50;
    private static final int MEETING_SCORE = 15;
    private static final int RECENT_ACTIVITY_SCORE = 10;
    private static final int INACTIVE_PENALTY = -20;
    
    // NEW: Email engagement scoring
    private static final int HIGH_OPEN_RATE_SCORE = 15;
    private static final int HIGH_CLICK_RATE_SCORE = 20;
    private static final int LOW_OPEN_RATE_PENALTY = -10;
    private static final double HIGH_OPEN_RATE_THRESHOLD = 0.50; // 50%
    private static final double HIGH_CLICK_RATE_THRESHOLD = 0.20; // 20%
    private static final double LOW_OPEN_RATE_THRESHOLD = 0.10; // 10%
    
    // NEW: Tag-based scoring
    private static final int VIP_TAG_SCORE = 25;
    private static final int CUSTOMER_TAG_SCORE = 20;
    
    // NEW: Decay factors
    private static final double DECAY_90_DAYS = 0.50;
    private static final double DECAY_180_DAYS = 0.25;
    
    private static final int MAX_SCORE = 100;
    private static final int MIN_SCORE = 0;
    
    // Segment thresholds
    public static final int HOT_LEAD_THRESHOLD = 70;
    public static final int WARM_LEAD_THRESHOLD = 40;

    /**
     * Calculate lead score for a single contact (enhanced with engagement metrics)
     */
    @Transactional
    public int calculateScore(Contact contact) {
        double score = 0;
        LocalDateTime now = LocalDateTime.now();

        // Email-based scoring with decay factor
        List<Email> emails = emailRepository.findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(contact.getEmail());
        
        for (Email email : emails) {
            double decayFactor = getDecayFactor(email.getReceivedAt(), now);
            
            switch (email.getStatus() != null ? email.getStatus() : "") {
                case "positive":
                    score += POSITIVE_EMAIL_SCORE * decayFactor;
                    break;
                case "neutral":
                    score += NEUTRAL_EMAIL_SCORE * decayFactor;
                    break;
                case "negative":
                    score += NEGATIVE_EMAIL_SCORE * decayFactor;
                    break;
            }
        }

        // High engagement bonus
        if (contact.getEmailCount() != null && contact.getEmailCount() > 5) {
            score += HIGH_EMAIL_COUNT_SCORE;
        }

        // NEW: Email engagement metrics (open rate, click rate)
        score += calculateEngagementScore(contact);

        // Deal-based scoring with decay
        List<Deal> deals = dealRepository.findByContactId(contact.getId());
        for (Deal deal : deals) {
            double decayFactor = getDecayFactor(deal.getCreatedAt(), now);
            
            if ("open".equals(deal.getStatus())) {
                score += ACTIVE_DEAL_SCORE * decayFactor;
            } else if ("won".equals(deal.getStatus())) {
                score += WON_DEAL_SCORE * decayFactor;
            }
        }

        // Meeting-based scoring
        if (contact.getMeetingCount() != null && contact.getMeetingCount() > 0) {
            score += MEETING_SCORE * Math.min(contact.getMeetingCount(), 3); // Cap at 3 meetings
        }

        // Tag-based scoring (VIP, Customer)
        score += calculateTagScore(contact);

        // Activity-based scoring
        LocalDateTime lastWeek = now.minusDays(7);
        LocalDateTime lastMonth = now.minusDays(30);

        if (contact.getUpdatedAt() != null) {
            if (contact.getUpdatedAt().isAfter(lastWeek)) {
                score += RECENT_ACTIVITY_SCORE;
            } else if (contact.getUpdatedAt().isBefore(lastMonth)) {
                score += INACTIVE_PENALTY;
            }
        }

        // Clamp score between MIN and MAX
        int finalScore = (int) Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));

        return finalScore;
    }
    
    /**
     * Calculate decay factor based on age of interaction
     */
    private double getDecayFactor(LocalDateTime interactionDate, LocalDateTime now) {
        if (interactionDate == null) {
            return 1.0;
        }
        
        long daysSince = ChronoUnit.DAYS.between(interactionDate, now);
        
        if (daysSince > 180) {
            return DECAY_180_DAYS;
        } else if (daysSince > 90) {
            return DECAY_90_DAYS;
        }
        
        return 1.0;
    }
    
    /**
     * Calculate engagement score based on email open/click rates from campaigns
     */
    private double calculateEngagementScore(Contact contact) {
        double score = 0;
        
        try {
            // Get campaign recipients for this contact
            List<CampaignRecipient> recipients = campaignRecipientRepository
                    .findByContactId(contact.getId());
            
            if (recipients.isEmpty()) {
                return 0;
            }
            
            long sentCount = recipients.stream().filter(r -> r.getSentAt() != null).count();
            long openedCount = recipients.stream().filter(r -> r.getOpenedAt() != null).count();
            long clickedCount = recipients.stream().filter(r -> r.getClickedAt() != null).count();
            
            if (sentCount > 0) {
                double openRate = (double) openedCount / sentCount;
                double clickRate = (double) clickedCount / sentCount;
                
                // High open rate bonus
                if (openRate >= HIGH_OPEN_RATE_THRESHOLD) {
                    score += HIGH_OPEN_RATE_SCORE;
                } else if (openRate < LOW_OPEN_RATE_THRESHOLD && sentCount >= 3) {
                    // Only penalize if we have enough data
                    score += LOW_OPEN_RATE_PENALTY;
                }
                
                // High click rate bonus
                if (clickRate >= HIGH_CLICK_RATE_THRESHOLD) {
                    score += HIGH_CLICK_RATE_SCORE;
                }
            }
        } catch (Exception e) {
            log.debug("Error calculating engagement score for contact {}: {}", contact.getId(), e.getMessage());
        }
        
        return score;
    }
    
    /**
     * Calculate tag-based score
     */
    private int calculateTagScore(Contact contact) {
        int score = 0;
        
        if (contact.getTags() != null) {
            for (Tag tag : contact.getTags()) {
                String tagName = tag.getName().toLowerCase();
                if (tagName.contains("vip") || tagName.contains("priority")) {
                    score += VIP_TAG_SCORE;
                } else if (tagName.contains("customer") || tagName.contains("klient")) {
                    score += CUSTOMER_TAG_SCORE;
                }
            }
        }
        
        return score;
    }
    
    /**
     * Get lead segment based on score
     */
    public String getLeadSegment(int score) {
        if (score >= HOT_LEAD_THRESHOLD) {
            return "HOT";
        } else if (score >= WARM_LEAD_THRESHOLD) {
            return "WARM";
        } else {
            return "COLD";
        }
    }
    
    /**
     * Get contacts by segment
     */
    public List<Contact> getContactsBySegment(String segment) {
        List<Contact> allContacts = contactRepository.findAll();
        
        return allContacts.stream()
                .filter(c -> {
                    int score = c.getScore() != null ? c.getScore() : 0;
                    return getLeadSegment(score).equals(segment.toUpperCase());
                })
                .toList();
    }
    
    /**
     * Get segment statistics
     */
    public SegmentStats getSegmentStats() {
        List<Contact> allContacts = contactRepository.findAll();
        
        long hotCount = 0;
        long warmCount = 0;
        long coldCount = 0;
        
        for (Contact contact : allContacts) {
            int score = contact.getScore() != null ? contact.getScore() : 0;
            String segment = getLeadSegment(score);
            
            switch (segment) {
                case "HOT": hotCount++; break;
                case "WARM": warmCount++; break;
                case "COLD": coldCount++; break;
            }
        }
        
        SegmentStats stats = new SegmentStats();
        stats.setHotLeads(hotCount);
        stats.setWarmLeads(warmCount);
        stats.setColdLeads(coldCount);
        stats.setTotalContacts(allContacts.size());
        
        return stats;
    }

    /**
     * Update score for a single contact
     */
    @Transactional
    public Contact updateContactScore(Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        int oldScore = contact.getScore() != null ? contact.getScore() : 0;
        int newScore = calculateScore(contact);
        contact.setScore(newScore);
        
        log.debug("Updated score for contact {}: {} -> {}", contact.getEmail(), oldScore, newScore);
        
        Contact savedContact = contactRepository.save(contact);
        
        // Trigger workflow if score changed significantly
        if (oldScore != newScore && workflowSchedulerService != null) {
            try {
                workflowSchedulerService.processLeadScoreChange(savedContact, oldScore, newScore);
            } catch (Exception e) {
                log.debug("Error triggering lead score workflow: {}", e.getMessage());
            }
        }
        
        return savedContact;
    }

    /**
     * Batch update all contact scores - runs nightly at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void updateAllContactScores() {
        log.info("Starting batch lead score update...");
        
        List<Contact> contacts = contactRepository.findAll();
        int updated = 0;
        int segmentChanged = 0;
        
        for (Contact contact : contacts) {
            try {
                int oldScore = contact.getScore() != null ? contact.getScore() : 0;
                String oldSegment = getLeadSegment(oldScore);
                
                int newScore = calculateScore(contact);
                String newSegment = getLeadSegment(newScore);
                
                if (oldScore != newScore) {
                    contact.setScore(newScore);
                    contactRepository.save(contact);
                    updated++;
                    
                    // Track segment changes
                    if (!oldSegment.equals(newSegment)) {
                        segmentChanged++;
                        log.info("Contact {} moved from {} to {} segment (score: {} -> {})",
                                contact.getId(), oldSegment, newSegment, oldScore, newScore);
                    }
                    
                    // Trigger workflow for significant changes
                    if (workflowSchedulerService != null) {
                        try {
                            workflowSchedulerService.processLeadScoreChange(contact, oldScore, newScore);
                        } catch (Exception e) {
                            log.debug("Error triggering workflow: {}", e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error updating score for contact {}: {}", contact.getId(), e.getMessage());
            }
        }
        
        log.info("Batch lead score update completed. Updated {} contacts, {} segment changes.", 
                 updated, segmentChanged);
    }

    /**
     * Get score breakdown for a contact (for UI display)
     */
    public ScoreBreakdown getScoreBreakdown(Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        ScoreBreakdown breakdown = new ScoreBreakdown();
        breakdown.setTotalScore(contact.getScore() != null ? contact.getScore() : 0);

        // Calculate components
        List<Email> emails = emailRepository.findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(contact.getEmail());
        int emailScore = 0;
        int positiveCount = 0;
        int negativeCount = 0;
        
        for (Email email : emails) {
            if ("positive".equals(email.getStatus())) {
                emailScore += POSITIVE_EMAIL_SCORE;
                positiveCount++;
            } else if ("neutral".equals(email.getStatus())) {
                emailScore += NEUTRAL_EMAIL_SCORE;
            } else if ("negative".equals(email.getStatus())) {
                emailScore += NEGATIVE_EMAIL_SCORE;
                negativeCount++;
            }
        }
        breakdown.setEmailScore(emailScore);
        breakdown.setPositiveEmails(positiveCount);
        breakdown.setNegativeEmails(negativeCount);

        List<Deal> deals = dealRepository.findByContactId(contact.getId());
        int dealScore = 0;
        int activeDeals = 0;
        int wonDeals = 0;
        
        for (Deal deal : deals) {
            if ("open".equals(deal.getStatus())) {
                dealScore += ACTIVE_DEAL_SCORE;
                activeDeals++;
            } else if ("won".equals(deal.getStatus())) {
                dealScore += WON_DEAL_SCORE;
                wonDeals++;
            }
        }
        breakdown.setDealScore(dealScore);
        breakdown.setActiveDeals(activeDeals);
        breakdown.setWonDeals(wonDeals);

        breakdown.setMeetingScore(contact.getMeetingCount() != null ? 
                MEETING_SCORE * Math.min(contact.getMeetingCount(), 3) : 0);

        return breakdown;
    }

    /**
     * DTO for score breakdown
     */
    @lombok.Data
    public static class ScoreBreakdown {
        private int totalScore;
        private String segment;
        private int emailScore;
        private int positiveEmails;
        private int negativeEmails;
        private int dealScore;
        private int activeDeals;
        private int wonDeals;
        private int meetingScore;
        private int engagementScore;
        private double openRate;
        private double clickRate;
        private int tagScore;
        private int activityScore;
    }
    
    /**
     * DTO for segment statistics
     */
    @lombok.Data
    public static class SegmentStats {
        private long hotLeads;
        private long warmLeads;
        private long coldLeads;
        private long totalContacts;
        
        public double getHotPercentage() {
            return totalContacts > 0 ? (hotLeads * 100.0 / totalContacts) : 0;
        }
        
        public double getWarmPercentage() {
            return totalContacts > 0 ? (warmLeads * 100.0 / totalContacts) : 0;
        }
        
        public double getColdPercentage() {
            return totalContacts > 0 ? (coldLeads * 100.0 / totalContacts) : 0;
        }
    }
}

