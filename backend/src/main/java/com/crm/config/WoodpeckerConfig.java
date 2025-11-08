package com.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "woodpecker.api")
@Data
public class WoodpeckerConfig {
    private String baseUrl;
    private String key;
    private boolean enabled;
}

