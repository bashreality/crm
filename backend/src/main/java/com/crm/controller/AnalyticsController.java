package com.crm.controller;

import com.crm.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private EmailRepository emailRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // Email stats
        Long totalEmails = emailRepository.count();
        Long positiveEmails = emailRepository.countByStatus("positive");
        Long neutralEmails = emailRepository.countByStatus("neutral");
        Long negativeEmails = emailRepository.countByStatus("negative");

        Map<String, Object> emailStats = new HashMap<>();
        emailStats.put("total", totalEmails);
        emailStats.put("positive", positiveEmails);
        emailStats.put("neutral", neutralEmails);
        emailStats.put("negative", negativeEmails);
        if (totalEmails > 0) {
            emailStats.put("positiveRate", (positiveEmails * 100.0) / totalEmails);
            emailStats.put("neutralRate", (neutralEmails * 100.0) / totalEmails);
            emailStats.put("negativeRate", (negativeEmails * 100.0) / totalEmails);
        }
        stats.put("emails", emailStats);

        // Contact stats
        Long totalContacts = contactRepository.count();
        stats.put("totalContacts", totalContacts);

        // Task stats
        Long pendingTasks = taskRepository.countPendingTasks();
        Long overdueTasks = taskRepository.countOverdueTasks(LocalDateTime.now());

        Map<String, Object> taskStats = new HashMap<>();
        taskStats.put("pending", pendingTasks != null ? pendingTasks : 0);
        taskStats.put("overdue", overdueTasks != null ? overdueTasks : 0);
        stats.put("tasks", taskStats);

        // Campaign stats
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
}
