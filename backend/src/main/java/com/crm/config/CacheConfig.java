package com.crm.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats());
        return cacheManager;
    }

    /**
     * Cache names used in the application:
     * - companies: List of unique companies (TTL: 10min)
     * - tags: All tags (TTL: 10min)
     * - pipelines: All pipelines with stages (TTL: 10min)
     * - dashboardStats: Dashboard statistics (TTL: 5min)
     * - contactById: Individual contacts (TTL: 5min)
     */
}

