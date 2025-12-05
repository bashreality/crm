package com.crm.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    @Primary
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        
        // Default cache configuration
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats());
        
        // Register all cache names
        cacheManager.setCacheNames(Arrays.asList(
            "companies",
            "tags",
            "pipelines",
            "emailAccounts",
            "emailTemplates",
            "sequences",
            "workflowRules",
            "contactById",
            "dashboardStats",
            "segmentStats"
        ));
        
        return cacheManager;
    }

    /**
     * Separate cache manager for short-lived caches
     */
    @Bean
    public CacheManager shortLivedCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(2, TimeUnit.MINUTES)
                .recordStats());
        cacheManager.setCacheNames(Arrays.asList(
            "emailStats",
            "recentEmails"
        ));
        return cacheManager;
    }

    /**
     * Cache names used in the application:
     * 
     * Long-lived (10 min):
     * - companies: List of unique companies
     * - tags: All tags
     * - pipelines: All pipelines with stages
     * - emailAccounts: Email account configurations
     * - emailTemplates: Email templates
     * - sequences: Email sequences
     * - workflowRules: Automation rules
     * 
     * Medium-lived (5 min):
     * - contactById: Individual contacts
     * - dashboardStats: Dashboard statistics
     * - segmentStats: Lead segment statistics
     * 
     * Short-lived (2 min):
     * - emailStats: Email statistics
     * - recentEmails: Recent emails list
     */
}

