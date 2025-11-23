package com.crm.dto;

import com.crm.model.EmailAccount;
import java.time.LocalDateTime;

public class EmailAccountDTO {
    private Long id;
    private String emailAddress;
    private String imapHost;
    private Integer imapPort;
    private String imapProtocol;
    private String smtpHost;
    private Integer smtpPort;
    private Boolean enabled;
    private String displayName;
    private LocalDateTime lastFetchAt;
    private Integer emailCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public EmailAccountDTO() {}

    public EmailAccountDTO(EmailAccount account) {
        this.id = account.getId();
        this.emailAddress = account.getEmailAddress();
        this.imapHost = account.getImapHost();
        this.imapPort = account.getImapPort();
        this.imapProtocol = account.getImapProtocol();
        this.smtpHost = account.getSmtpHost();
        this.smtpPort = account.getSmtpPort();
        this.enabled = account.getEnabled();
        this.displayName = account.getDisplayName();
        this.lastFetchAt = account.getLastFetchAt();
        this.emailCount = account.getEmailCount();
        this.createdAt = account.getCreatedAt();
        this.updatedAt = account.getUpdatedAt();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmailAddress() {
        return emailAddress;
    }

    public void setEmailAddress(String emailAddress) {
        this.emailAddress = emailAddress;
    }

    public String getImapHost() {
        return imapHost;
    }

    public void setImapHost(String imapHost) {
        this.imapHost = imapHost;
    }

    public Integer getImapPort() {
        return imapPort;
    }

    public void setImapPort(Integer imapPort) {
        this.imapPort = imapPort;
    }

    public String getImapProtocol() {
        return imapProtocol;
    }

    public void setImapProtocol(String imapProtocol) {
        this.imapProtocol = imapProtocol;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public LocalDateTime getLastFetchAt() {
        return lastFetchAt;
    }

    public void setLastFetchAt(LocalDateTime lastFetchAt) {
        this.lastFetchAt = lastFetchAt;
    }

    public Integer getEmailCount() {
        return emailCount;
    }

    public void setEmailCount(Integer emailCount) {
        this.emailCount = emailCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
