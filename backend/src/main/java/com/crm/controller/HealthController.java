package com.crm.controller;

import com.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Health check and metrics endpoint
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final ContactRepository contactRepository;
    private final EmailRepository emailRepository;
    private final DealRepository dealRepository;
    private final CampaignRepository campaignRepository;
    private final WorkflowRuleRepository workflowRuleRepository;
    private final CacheManager cacheManager;

    /**
     * Basic health check
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        health.put("version", "2.0.0");
        
        // Database check
        try {
            long contactCount = contactRepository.count();
            health.put("database", "UP");
            health.put("databaseContactCount", contactCount);
        } catch (Exception e) {
            health.put("database", "DOWN");
            health.put("databaseError", e.getMessage());
        }
        
        return ResponseEntity.ok(health);
    }

    /**
     * Detailed system metrics
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // JVM Metrics
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
        
        Map<String, Object> jvm = new HashMap<>();
        jvm.put("heapUsed", formatBytes(memoryBean.getHeapMemoryUsage().getUsed()));
        jvm.put("heapMax", formatBytes(memoryBean.getHeapMemoryUsage().getMax()));
        jvm.put("heapUsedPercent", 
                (int)(100.0 * memoryBean.getHeapMemoryUsage().getUsed() / memoryBean.getHeapMemoryUsage().getMax()));
        jvm.put("uptime", formatDuration(runtimeBean.getUptime()));
        jvm.put("processors", Runtime.getRuntime().availableProcessors());
        metrics.put("jvm", jvm);
        
        // Database Statistics
        Map<String, Object> database = new HashMap<>();
        try {
            database.put("contacts", contactRepository.count());
            database.put("emails", emailRepository.count());
            database.put("deals", dealRepository.count());
            database.put("campaigns", campaignRepository.count());
            database.put("workflowRules", workflowRuleRepository.count());
        } catch (Exception e) {
            database.put("error", e.getMessage());
        }
        metrics.put("database", database);
        
        // Cache Statistics
        Map<String, Object> cache = new HashMap<>();
        cache.put("cacheNames", cacheManager.getCacheNames());
        metrics.put("cache", cache);
        
        // Timestamp
        metrics.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        
        return ResponseEntity.ok(metrics);
    }

    /**
     * Simple ping endpoint for load balancers
     */
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    /**
     * Ready check - full system readiness
     */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> readyCheck() {
        Map<String, Object> ready = new HashMap<>();
        boolean allReady = true;
        
        // Database ready
        try {
            contactRepository.count();
            ready.put("database", "READY");
        } catch (Exception e) {
            ready.put("database", "NOT_READY");
            ready.put("databaseError", e.getMessage());
            allReady = false;
        }
        
        // Cache ready
        if (cacheManager.getCacheNames() != null) {
            ready.put("cache", "READY");
        } else {
            ready.put("cache", "NOT_READY");
            allReady = false;
        }
        
        ready.put("status", allReady ? "READY" : "NOT_READY");
        ready.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        
        if (allReady) {
            return ResponseEntity.ok(ready);
        } else {
            return ResponseEntity.status(503).body(ready);
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char unit = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), unit);
    }

    private String formatDuration(long millis) {
        long hours = TimeUnit.MILLISECONDS.toHours(millis);
        long minutes = TimeUnit.MILLISECONDS.toMinutes(millis) % 60;
        long seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60;
        return String.format("%dh %dm %ds", hours, minutes, seconds);
    }
}

