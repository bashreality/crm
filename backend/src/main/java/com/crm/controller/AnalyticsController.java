package com.crm.controller;

import com.crm.dto.analytics.GlobalAnalyticsDto;
import com.crm.dto.analytics.SequenceAnalyticsDto;
import com.crm.repository.*;
import com.crm.service.AnalyticsService;
import com.crm.service.UserContextService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private EmailRepository emailRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private UserContextService userContextService;

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        Long userId = userContextService.getCurrentUserId();

        if (userId == null) {
            return stats;
        }

        // Email stats - Admin sees all emails, regular users see only accessible ones
        boolean isAdmin = userContextService.isCurrentUserAdmin();
        Long totalEmails;
        Long positiveEmails;
        Long neutralEmails;
        Long negativeEmails;
        Long undeliveredEmails;
        Long maybeLaterEmails;
        Long autoReplyEmails;

        if (isAdmin) {
            // Admin sees all emails from enabled accounts
            totalEmails = emailRepository.count();
            positiveEmails = emailRepository.countByStatus("positive");
            neutralEmails = emailRepository.countByStatus("neutral");
            negativeEmails = emailRepository.countByStatus("negative");
            undeliveredEmails = emailRepository.countByStatus("undelivered");
            maybeLaterEmails = emailRepository.countByStatus("maybeLater");
            autoReplyEmails = emailRepository.countByStatus("autoReply");
        } else {
            // Regular user sees only emails from their assigned accounts
            totalEmails = emailRepository.countAccessibleByUserId(userId);
            positiveEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "positive");
            neutralEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "neutral");
            negativeEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "negative");
            undeliveredEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "undelivered");
            maybeLaterEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "maybeLater");
            autoReplyEmails = emailRepository.countAccessibleByUserIdAndStatus(userId, "autoReply");
        }

        Map<String, Object> emailStats = new HashMap<>();
        emailStats.put("total", totalEmails);
        emailStats.put("positive", positiveEmails);
        emailStats.put("neutral", neutralEmails);
        emailStats.put("negative", negativeEmails);
        emailStats.put("undelivered", undeliveredEmails);
        emailStats.put("maybeLater", maybeLaterEmails);
        emailStats.put("auto_reply", autoReplyEmails);
        if (totalEmails > 0) {
            emailStats.put("positiveRate", (positiveEmails * 100.0) / totalEmails);
            emailStats.put("neutralRate", (neutralEmails * 100.0) / totalEmails);
            emailStats.put("negativeRate", (negativeEmails * 100.0) / totalEmails);
            emailStats.put("undeliveredRate", (undeliveredEmails * 100.0) / totalEmails);
            emailStats.put("maybeLaterRate", (maybeLaterEmails * 100.0) / totalEmails);
            emailStats.put("auto_reply_rate", (autoReplyEmails * 100.0) / totalEmails);
        }
        stats.put("emails", emailStats);

        // Contact stats - Admin sees all contacts, regular users see only accessible ones
        Long totalContacts;
        if (isAdmin) {
            totalContacts = contactRepository.count();
        } else {
            totalContacts = contactRepository.countAccessibleByUserId(userId);
        }
        stats.put("totalContacts", totalContacts);

        // Task stats - now filtered by userId
        Long pendingTasks = taskRepository.countPendingTasksByUser(userId);
        Long overdueTasks = taskRepository.countOverdueTasksByUser(LocalDateTime.now(), userId);

        Map<String, Object> taskStats = new HashMap<>();
        taskStats.put("pending", pendingTasks != null ? pendingTasks : 0);
        taskStats.put("overdue", overdueTasks != null ? overdueTasks : 0);
        stats.put("tasks", taskStats);

        // Campaign stats - campaigns don't have userId yet
        Long totalCampaigns = campaignRepository.count();
        Long activeCampaigns = campaignRepository.countByStatus("active");

        Map<String, Object> campaignStats = new HashMap<>();
        campaignStats.put("total", totalCampaigns);
        campaignStats.put("active", activeCampaigns != null ? activeCampaigns : 0);
        stats.put("campaigns", campaignStats);

        return stats;
    }

    @GetMapping("/email-sentiment-trend")
    public Map<String, Object> getEmailSentimentTrend() {
        // This could be enhanced with date-based grouping
        Map<String, Object> trend = new HashMap<>();
        trend.put("positive", emailRepository.countByStatus("positive"));
        trend.put("neutral", emailRepository.countByStatus("neutral"));
        trend.put("negative", emailRepository.countByStatus("negative"));
        return trend;
    }

    @GetMapping("/account/{accountId}")
    public Map<String, Object> getAccountStats(@PathVariable Long accountId) {
        Map<String, Object> stats = new HashMap<>();

        Long totalEmails = emailRepository.countByAccountId(accountId);
        Long positiveEmails = emailRepository.countByAccountIdAndStatus(accountId, "positive");
        Long neutralEmails = emailRepository.countByAccountIdAndStatus(accountId, "neutral");
        Long negativeEmails = emailRepository.countByAccountIdAndStatus(accountId, "negative");
        Long undeliveredEmails = emailRepository.countByAccountIdAndStatus(accountId, "undelivered");
        Long maybeLaterEmails = emailRepository.countByAccountIdAndStatus(accountId, "maybeLater");
        Long autoReplyEmails = emailRepository.countByAccountIdAndStatus(accountId, "auto_reply");

        stats.put("total", totalEmails);
        stats.put("positive", positiveEmails);
        stats.put("neutral", neutralEmails);
        stats.put("negative", negativeEmails);
        stats.put("undelivered", undeliveredEmails);
        stats.put("maybeLater", maybeLaterEmails);
        stats.put("auto_reply", autoReplyEmails);

        if (totalEmails > 0) {
            stats.put("positiveRate", (positiveEmails * 100.0) / totalEmails);
            stats.put("neutralRate", (neutralEmails * 100.0) / totalEmails);
            stats.put("negativeRate", (negativeEmails * 100.0) / totalEmails);
            stats.put("undeliveredRate", (undeliveredEmails * 100.0) / totalEmails);
            stats.put("maybeLaterRate", (maybeLaterEmails * 100.0) / totalEmails);
            stats.put("auto_reply_rate", (autoReplyEmails * 100.0) / totalEmails);
        }

        return stats;
    }

    /**
     * GET /api/analytics/sequences/global
     * Pobiera globalną analitykę dla wszystkich sekwencji
     */
    @GetMapping("/sequences/global")
    public ResponseEntity<GlobalAnalyticsDto> getGlobalSequenceAnalytics() {
        return ResponseEntity.ok(analyticsService.getGlobalAnalytics());
    }

    /**
     * GET /api/analytics/sequences/{id}
     * Pobiera analitykę dla konkretnej sekwencji
     */
    @GetMapping("/sequences/{id}")
    public ResponseEntity<SequenceAnalyticsDto> getSequenceAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getSequenceAnalytics(id));
    }
}
