package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Deal;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service responsible for calculating and updating lead scores for contacts.
 * 
 * Scoring Rules:
 * - Positive email response: +20 points
 * - Neutral email response: +5 points
 * - Negative email response: -10 points
 * - Email count > 5: +10 points
 * - Has active deal: +30 points
 * - Deal won: +50 points
 * - Meeting scheduled: +15 points
 * - Recent activity (last 7 days): +10 points
 * - No activity in 30 days: -20 points
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
    
    private static final int MAX_SCORE = 100;
    private static final int MIN_SCORE = 0;

    /**
     * Calculate lead score for a single contact
     */
    @Transactional
    public int calculateScore(Contact contact) {
        int score = 0;

        // Email-based scoring
        List<Email> emails = emailRepository.findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(contact.getEmail());
        
        for (Email email : emails) {
            switch (email.getStatus()) {
                case "positive":
                    score += POSITIVE_EMAIL_SCORE;
                    break;
                case "neutral":
                    score += NEUTRAL_EMAIL_SCORE;
                    break;
                case "negative":
                    score += NEGATIVE_EMAIL_SCORE;
                    break;
            }
        }

        // High engagement bonus
        if (contact.getEmailCount() != null && contact.getEmailCount() > 5) {
            score += HIGH_EMAIL_COUNT_SCORE;
        }

        // Deal-based scoring
        List<Deal> deals = dealRepository.findByContactId(contact.getId());
        for (Deal deal : deals) {
            if ("open".equals(deal.getStatus())) {
                score += ACTIVE_DEAL_SCORE;
            } else if ("won".equals(deal.getStatus())) {
                score += WON_DEAL_SCORE;
            }
        }

        // Meeting-based scoring
        if (contact.getMeetingCount() != null && contact.getMeetingCount() > 0) {
            score += MEETING_SCORE * Math.min(contact.getMeetingCount(), 3); // Cap at 3 meetings
        }

        // Activity-based scoring
        LocalDateTime now = LocalDateTime.now();
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
        score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));

        return score;
    }

    /**
     * Update score for a single contact
     */
    @Transactional
    public Contact updateContactScore(Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        int newScore = calculateScore(contact);
        contact.setScore(newScore);
        
        log.debug("Updated score for contact {}: {} -> {}", contact.getEmail(), contact.getScore(), newScore);
        
        return contactRepository.save(contact);
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
        
        for (Contact contact : contacts) {
            try {
                int oldScore = contact.getScore() != null ? contact.getScore() : 0;
                int newScore = calculateScore(contact);
                
                if (oldScore != newScore) {
                    contact.setScore(newScore);
                    contactRepository.save(contact);
                    updated++;
                }
            } catch (Exception e) {
                log.error("Error updating score for contact {}: {}", contact.getId(), e.getMessage());
            }
        }
        
        log.info("Batch lead score update completed. Updated {} contacts.", updated);
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
        private int emailScore;
        private int positiveEmails;
        private int negativeEmails;
        private int dealScore;
        private int activeDeals;
        private int wonDeals;
        private int meetingScore;
    }
}

