package com.crm.service;

import com.crm.model.*;
import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Serwis do obsługi newslettera i kampanii masowych.
 * Obsługuje wysyłkę z throttlingiem, tracking i unsubscribe.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NewsletterService {

    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository recipientRepository;
    private final ContactRepository contactRepository;
    private final UnsubscribeRepository unsubscribeRepository;
    private final EmailTemplateService emailTemplateService;
    private final EmailSendingService emailSendingService;
    private final UserContextService userContextService;

    // ==================== CAMPAIGN MANAGEMENT ====================

    /**
     * Tworzy nową kampanię
     */
    @Transactional
    public Campaign createCampaign(Campaign campaign) {
        Long userId = userContextService.getCurrentUserId();
        campaign.setUserId(userId);
        campaign.setStatus("draft");
        return campaignRepository.save(campaign);
    }

    /**
     * Aktualizuje kampanię (tylko draft)
     */
    @Transactional
    public Campaign updateCampaign(Long id, Campaign campaignDetails) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + id));

        if (!campaign.isEditable()) {
            throw new RuntimeException("Campaign is not editable (status: " + campaign.getStatus() + ")");
        }

        campaign.setName(campaignDetails.getName());
        campaign.setDescription(campaignDetails.getDescription());
        campaign.setCampaignType(campaignDetails.getCampaignType());
        campaign.setTemplate(campaignDetails.getTemplate());
        campaign.setEmailAccount(campaignDetails.getEmailAccount());
        campaign.setTargetTag(campaignDetails.getTargetTag());
        campaign.setSubject(campaignDetails.getSubject());
        campaign.setContent(campaignDetails.getContent());
        campaign.setScheduledAt(campaignDetails.getScheduledAt());
        campaign.setTimezone(campaignDetails.getTimezone());
        campaign.setThrottlePerHour(campaignDetails.getThrottlePerHour());
        campaign.setDailyLimit(campaignDetails.getDailyLimit());
        campaign.setDelaySeconds(campaignDetails.getDelaySeconds());
        campaign.setRequireOptIn(campaignDetails.getRequireOptIn());
        campaign.setUnsubscribeFooter(campaignDetails.getUnsubscribeFooter());

        return campaignRepository.save(campaign);
    }

    /**
     * Przygotowuje kampanię do wysyłki - tworzy listę odbiorców
     */
    @Transactional
    public Campaign prepareCampaign(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (!"draft".equals(campaign.getStatus())) {
            throw new RuntimeException("Campaign must be in draft status to prepare");
        }

        // Pobierz kontakty z docelowego tagu
        List<Contact> contacts;
        if (campaign.getTargetTag() != null) {
            contacts = contactRepository.findByTagId(campaign.getTargetTag().getId());
        } else {
            // Jeśli brak tagu, użyj wszystkich kontaktów użytkownika
            contacts = contactRepository.findAccessibleByUserId(campaign.getUserId());
        }

        // Filtruj wypisanych
        List<Contact> eligibleContacts = contacts.stream()
                .filter(c -> c.getEmail() != null && !c.getEmail().isEmpty())
                .filter(c -> !unsubscribeRepository.existsByEmail(c.getEmail()))
                .toList();

        // Usuń starych odbiorców (jeśli kampania była przygotowywana wcześniej)
        recipientRepository.deleteByCampaignId(campaignId);

        // Utwórz nowych odbiorców
        for (Contact contact : eligibleContacts) {
            if (!recipientRepository.existsByCampaignIdAndContactId(campaignId, contact.getId())) {
                CampaignRecipient recipient = new CampaignRecipient();
                recipient.setCampaign(campaign);
                recipient.setContact(contact);
                recipient.setStatus("pending");
                recipient.setTrackingId(generateTrackingId());
                recipientRepository.save(recipient);
            }
        }

        campaign.setTotalContacts(eligibleContacts.size());
        campaign.setStatus("scheduled");
        return campaignRepository.save(campaign);
    }

    /**
     * Uruchamia wysyłkę kampanii
     */
    @Transactional
    public Campaign startCampaign(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (!campaign.canStart()) {
            throw new RuntimeException("Campaign cannot be started (status: " + campaign.getStatus() + ")");
        }

        campaign.setStatus("sending");
        campaign.setStartedAt(LocalDateTime.now());
        return campaignRepository.save(campaign);
    }

    /**
     * Pauzuje wysyłkę kampanii
     */
    @Transactional
    public Campaign pauseCampaign(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (!campaign.canPause()) {
            throw new RuntimeException("Campaign cannot be paused (status: " + campaign.getStatus() + ")");
        }

        campaign.setStatus("paused");
        campaign.setPausedAt(LocalDateTime.now());
        return campaignRepository.save(campaign);
    }

    /**
     * Wznawia wysyłkę kampanii
     */
    @Transactional
    public Campaign resumeCampaign(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (!campaign.canResume()) {
            throw new RuntimeException("Campaign cannot be resumed (status: " + campaign.getStatus() + ")");
        }

        campaign.setStatus("sending");
        campaign.setPausedAt(null);
        return campaignRepository.save(campaign);
    }

    // ==================== SENDING ====================

    /**
     * Scheduler - przetwarza kampanie do wysyłki co minutę
     */
    @Scheduled(fixedDelay = 60000) // Co minutę
    @Transactional
    public void processSendingCampaigns() {
        List<Campaign> sendingCampaigns = campaignRepository.findByStatus("sending");

        for (Campaign campaign : sendingCampaigns) {
            try {
                processNextBatch(campaign);
            } catch (Exception e) {
                log.error("Error processing campaign {}: {}", campaign.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Przetwarza następną partię emaili dla kampanii
     */
    @Transactional
    public void processNextBatch(Campaign campaign) {
        // Sprawdź throttling
        int throttle = campaign.getThrottlePerHour() != null ? campaign.getThrottlePerHour() : 100;
        LocalDateTime hourAgo = LocalDateTime.now().minusHours(1);
        long sentLastHour = recipientRepository.countSentSince(campaign.getId(), hourAgo);

        if (sentLastHour >= throttle) {
            log.debug("Campaign {} throttled - {} sent in last hour (limit: {})", 
                     campaign.getId(), sentLastHour, throttle);
            return;
        }

        // Pobierz następnych odbiorców
        int batchSize = Math.min(10, (int)(throttle - sentLastHour));
        List<CampaignRecipient> recipients = recipientRepository.findPendingRecipients(
                campaign.getId(), PageRequest.of(0, batchSize));

        if (recipients.isEmpty()) {
            // Wszystko wysłane - oznacz jako zakończone
            campaign.setStatus("completed");
            campaign.setCompletedAt(LocalDateTime.now());
            campaignRepository.save(campaign);
            log.info("Campaign {} completed", campaign.getId());
            return;
        }

        // Wyślij emaile
        int delaySeconds = campaign.getDelaySeconds() != null ? campaign.getDelaySeconds() : 5;

        for (CampaignRecipient recipient : recipients) {
            try {
                sendCampaignEmail(campaign, recipient);

                // Opóźnienie między emailami
                if (delaySeconds > 0) {
                    Thread.sleep(delaySeconds * 1000L);
                }
            } catch (Exception e) {
                log.error("Error sending campaign email to {}: {}", 
                         recipient.getContact().getEmail(), e.getMessage());
                recipient.markBounced(e.getMessage());
                recipientRepository.save(recipient);
                incrementCampaignBounced(campaign);
            }
        }
    }

    /**
     * Wysyła pojedynczy email kampanii
     */
    @Transactional
    public void sendCampaignEmail(Campaign campaign, CampaignRecipient recipient) {
        Contact contact = recipient.getContact();
        
        // Przygotuj treść
        String subject;
        String body;

        if (campaign.getTemplate() != null) {
            subject = processTemplate(campaign.getTemplate().getSubject(), contact);
            body = emailTemplateService.renderTemplate(
                    campaign.getTemplate().getId(), contact, null);
        } else {
            subject = processTemplate(campaign.getSubject(), contact);
            body = processTemplate(campaign.getContent(), contact);
        }

        // Dodaj stopkę unsubscribe
        String unsubscribeLink = generateUnsubscribeLink(recipient.getTrackingId());
        String footer = campaign.getUnsubscribeFooter();
        if (footer == null || footer.isEmpty()) {
            footer = "<p style='font-size:12px;color:#888;margin-top:30px;border-top:1px solid #eee;padding-top:15px;'>" +
                    "Aby wypisać się z tej listy, <a href='" + unsubscribeLink + "'>kliknij tutaj</a>.</p>";
        } else {
            footer = footer.replace("{{unsubscribe_link}}", unsubscribeLink);
        }
        body = body + footer;

        // Dodaj pixel trackingowy
        String trackingPixel = "<img src='" + getTrackingPixelUrl(recipient.getTrackingId()) + 
                               "' width='1' height='1' style='display:none' />";
        body = body + trackingPixel;

        // Wyślij email
        EmailAccount account = campaign.getEmailAccount();
        if (account == null) {
            throw new RuntimeException("No email account configured for campaign");
        }

        emailSendingService.sendEmail(
                account.getId(),
                contact.getEmail(),
                subject,
                body
        );

        // Zaktualizuj status
        recipient.markSent();
        recipientRepository.save(recipient);

        incrementCampaignSent(campaign);
        log.debug("Sent campaign email to {} (campaign: {})", contact.getEmail(), campaign.getId());
    }

    /**
     * Wysyła testowy email kampanii
     */
    @Transactional
    public void sendTestEmail(Long campaignId, String testEmail) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        // Utwórz tymczasowy kontakt
        Contact testContact = new Contact();
        testContact.setName("Test User");
        testContact.setEmail(testEmail);
        testContact.setCompany("Test Company");

        String subject;
        String body;

        if (campaign.getTemplate() != null) {
            subject = "[TEST] " + processTemplate(campaign.getTemplate().getSubject(), testContact);
            body = emailTemplateService.renderTemplate(campaign.getTemplate().getId(), testContact, null);
        } else {
            subject = "[TEST] " + processTemplate(campaign.getSubject(), testContact);
            body = processTemplate(campaign.getContent(), testContact);
        }

        // Dodaj oznaczenie testowe
        body = "<div style='background:#fef3c7;border:1px solid #f59e0b;padding:10px;margin-bottom:20px;border-radius:5px;'>" +
               "<strong>⚠️ To jest testowa wiadomość z kampanii: " + campaign.getName() + "</strong></div>" + body;

        EmailAccount account = campaign.getEmailAccount();
        if (account == null) {
            throw new RuntimeException("No email account configured for campaign");
        }

        emailSendingService.sendEmail(account.getId(), testEmail, subject, body);
        log.info("Sent test email for campaign {} to {}", campaignId, testEmail);
    }

    // ==================== TRACKING ====================

    /**
     * Rejestruje otwarcie emaila
     */
    @Transactional
    public void trackOpen(String trackingId) {
        recipientRepository.findByTrackingId(trackingId).ifPresent(recipient -> {
            recipient.markOpened();
            recipientRepository.save(recipient);
            incrementCampaignOpened(recipient.getCampaign());
            log.debug("Tracked open for campaign {} recipient {}", 
                     recipient.getCampaign().getId(), recipient.getId());
        });
    }

    /**
     * Rejestruje kliknięcie w link
     */
    @Transactional
    public void trackClick(String trackingId) {
        recipientRepository.findByTrackingId(trackingId).ifPresent(recipient -> {
            recipient.markClicked();
            recipientRepository.save(recipient);
            incrementCampaignClicked(recipient.getCampaign());
            log.debug("Tracked click for campaign {} recipient {}", 
                     recipient.getCampaign().getId(), recipient.getId());
        });
    }

    // ==================== UNSUBSCRIBE ====================

    /**
     * Obsługuje wypisanie się z listy
     */
    @Transactional
    public void processUnsubscribe(String token, String reason) {
        CampaignRecipient recipient = recipientRepository.findByTrackingId(token)
                .orElseThrow(() -> new RuntimeException("Invalid unsubscribe token"));

        Contact contact = recipient.getContact();
        Campaign campaign = recipient.getCampaign();

        // Oznacz odbiorcę jako wypisanego
        recipient.markUnsubscribed();
        recipientRepository.save(recipient);

        // Dodaj do globalnej listy wypisanych
        if (!unsubscribeRepository.existsByEmail(contact.getEmail())) {
            Unsubscribe unsubscribe = Unsubscribe.create(contact, campaign, reason);
            unsubscribeRepository.save(unsubscribe);
        }

        // Zaktualizuj statystyki kampanii
        incrementCampaignUnsubscribed(campaign);

        log.info("Contact {} unsubscribed from campaign {}", contact.getEmail(), campaign.getId());
    }

    /**
     * Sprawdza czy email jest wypisany
     */
    public boolean isUnsubscribed(String email) {
        return unsubscribeRepository.existsByEmail(email);
    }

    /**
     * Ponownie subskrybuje email (np. po ponownym opt-in)
     */
    @Transactional
    public void resubscribe(String email) {
        unsubscribeRepository.findByEmail(email).ifPresent(unsub -> {
            unsubscribeRepository.delete(unsub);
            log.info("Resubscribed email: {}", email);
        });
    }

    // ==================== HELPERS ====================

    private String processTemplate(String template, Contact contact) {
        if (template == null) return "";

        return template
                .replace("{{name}}", Optional.ofNullable(contact.getName()).orElse(""))
                .replace("{{firstName}}", extractFirstName(contact.getName()))
                .replace("{{email}}", Optional.ofNullable(contact.getEmail()).orElse(""))
                .replace("{{company}}", Optional.ofNullable(contact.getCompany()).orElse(""))
                .replace("{{position}}", Optional.ofNullable(contact.getPosition()).orElse(""))
                .replace("{{phone}}", Optional.ofNullable(contact.getPhone()).orElse(""));
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        String[] parts = fullName.trim().split("\\s+");
        return parts[0];
    }

    private String generateTrackingId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 32);
    }

    private String generateUnsubscribeLink(String trackingId) {
        // TODO: Use actual base URL from config
        return "http://localhost:8080/api/newsletter/unsubscribe?token=" + trackingId;
    }

    private String getTrackingPixelUrl(String trackingId) {
        // TODO: Use actual base URL from config
        return "http://localhost:8080/api/newsletter/track/open?id=" + trackingId;
    }

    @Transactional
    private void incrementCampaignSent(Campaign campaign) {
        campaign.setSentCount(campaign.getSentCount() + 1);
        campaignRepository.save(campaign);
    }

    @Transactional
    private void incrementCampaignOpened(Campaign campaign) {
        campaign.setOpenedCount(campaign.getOpenedCount() + 1);
        campaignRepository.save(campaign);
    }

    @Transactional
    private void incrementCampaignClicked(Campaign campaign) {
        campaign.setClickedCount(campaign.getClickedCount() + 1);
        campaignRepository.save(campaign);
    }

    @Transactional
    private void incrementCampaignBounced(Campaign campaign) {
        campaign.setBouncedCount(campaign.getBouncedCount() + 1);
        campaignRepository.save(campaign);
    }

    @Transactional
    private void incrementCampaignUnsubscribed(Campaign campaign) {
        campaign.setUnsubscribedCount(campaign.getUnsubscribedCount() + 1);
        campaignRepository.save(campaign);
    }

    // ==================== QUERIES ====================

    public List<Campaign> getAllCampaignsForUser() {
        Long userId = userContextService.getCurrentUserId();
        return campaignRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Optional<Campaign> getCampaignById(Long id) {
        return campaignRepository.findById(id);
    }

    public Map<String, Object> getCampaignStats(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalContacts", campaign.getTotalContacts());
        stats.put("sentCount", campaign.getSentCount());
        stats.put("openedCount", campaign.getOpenedCount());
        stats.put("clickedCount", campaign.getClickedCount());
        stats.put("bouncedCount", campaign.getBouncedCount());
        stats.put("unsubscribedCount", campaign.getUnsubscribedCount());
        stats.put("openRate", campaign.getOpenRate());
        stats.put("clickRate", campaign.getClickRate());
        stats.put("bounceRate", campaign.getBounceRate());
        stats.put("unsubscribeRate", campaign.getUnsubscribeRate());

        long pending = recipientRepository.countByCampaignIdAndStatus(campaignId, "pending");
        stats.put("pendingCount", pending);

        return stats;
    }
}

