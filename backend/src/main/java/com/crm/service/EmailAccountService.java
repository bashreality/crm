package com.crm.service;

import com.crm.model.EmailAccount;
import com.crm.repository.EmailAccountRepository;
import com.crm.repository.EmailRepository;
import com.crm.repository.EmailSequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Objects;

@Service
public class EmailAccountService {

    @Autowired
    private EmailAccountRepository emailAccountRepository;

    @Autowired
    private UserContextService userContextService;

    @Autowired
    private EmailRepository emailRepository;

    @Autowired
    private EmailSequenceRepository emailSequenceRepository;

    public List<EmailAccount> getAllAccounts() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return List.of();
        }
        // Admins see all accounts, regular users see only their own
        if (userContextService.isCurrentUserAdmin()) {
            return emailAccountRepository.findAll();
        }
        return emailAccountRepository.findByUserId(userId);
    }

    public List<EmailAccount> getEnabledAccounts() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return List.of();
        }
        // Admins see all enabled accounts, regular users see only their own
        if (userContextService.isCurrentUserAdmin()) {
            return emailAccountRepository.findByEnabledTrue();
        }
        return emailAccountRepository.findByUserIdAndEnabledTrue(userId);
    }

    /**
     * Get all enabled accounts without user context filtering
     * Used by scheduled tasks that run without user authentication
     */
    public List<EmailAccount> getAllEnabledAccountsForScheduler() {
        return emailAccountRepository.findByEnabledTrue();
    }

    public Optional<EmailAccount> getAccountById(Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return Optional.empty();
        }
        // Admins can access any account, regular users only their own
        if (userContextService.isCurrentUserAdmin()) {
            return emailAccountRepository.findById(id);
        }
        return emailAccountRepository.findByUserIdAndId(userId, id);
    }

    public Optional<EmailAccount> getAccountByEmail(String emailAddress) {
        return emailAccountRepository.findByEmailAddress(emailAddress);
    }

    @Transactional
    public EmailAccount createAccount(EmailAccount account) {
        // Multiple users can use the same email account, so no uniqueness check
        // Set userId to current user
        Long userId = userContextService.getCurrentUserId();
        if (userId != null) {
            account.setUserId(userId);
        }
        return emailAccountRepository.save(account);
    }

    @Transactional
    public EmailAccount updateAccount(Long id, EmailAccount updatedAccount) {
        EmailAccount account = emailAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + id));

        if (updatedAccount.getEmailAddress() != null) account.setEmailAddress(updatedAccount.getEmailAddress());
        if (updatedAccount.getPassword() != null && !updatedAccount.getPassword().isBlank()) account.setPassword(updatedAccount.getPassword());
        if (updatedAccount.getImapHost() != null) account.setImapHost(updatedAccount.getImapHost());
        if (updatedAccount.getImapPort() != null && updatedAccount.getImapPort() > 0) account.setImapPort(updatedAccount.getImapPort());
        if (updatedAccount.getImapProtocol() != null) account.setImapProtocol(updatedAccount.getImapProtocol());
        if (updatedAccount.getSmtpHost() != null) account.setSmtpHost(updatedAccount.getSmtpHost());
        if (updatedAccount.getSmtpPort() != null && updatedAccount.getSmtpPort() > 0) account.setSmtpPort(updatedAccount.getSmtpPort());
        if (updatedAccount.getEnabled() != null) account.setEnabled(updatedAccount.getEnabled());
        if (updatedAccount.getDisplayName() != null) account.setDisplayName(updatedAccount.getDisplayName());
        if (updatedAccount.getSignature() != null) account.setSignature(updatedAccount.getSignature());

        return emailAccountRepository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id) {
        Long currentUserId = userContextService.getCurrentUserId();
        EmailAccount account = emailAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + id));

        // Only owner or admin can delete
        if (!userContextService.isCurrentUserAdmin()
                && !Objects.equals(account.getUserId(), currentUserId)) {
            throw new IllegalStateException("Brak uprawnień do usunięcia tego konta email");
        }

        long sequencesCount = emailSequenceRepository.countByEmailAccount_Id(id);
        if (sequencesCount > 0) {
            throw new IllegalStateException("Nie można usunąć konta – jest używane w " + sequencesCount + " sekwencjach. Podmień konto w sekwencjach i spróbuj ponownie.");
        }

        long emailsCount = emailRepository.countByAccountId(id);
        if (emailsCount > 0) {
            // Usuń maile powiązane tylko z tym kontem (odłączamy widok dla tego użytkownika)
            emailRepository.deleteByAccountId(id);
        }

        emailAccountRepository.deleteById(id);
    }

    @Transactional
    public void updateLastFetchTime(Long accountId, LocalDateTime fetchTime) {
        EmailAccount account = emailAccountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + accountId));
        account.setLastFetchAt(fetchTime);
        emailAccountRepository.save(account);
    }

    @Transactional
    public void incrementEmailCount(Long accountId, int count) {
        EmailAccount account = emailAccountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + accountId));
        int current = account.getEmailCount() == null ? 0 : account.getEmailCount();
        account.setEmailCount(current + count);
        emailAccountRepository.save(account);
    }

    @Transactional
    public void setEmailCount(Long accountId, int count) {
        EmailAccount account = emailAccountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + accountId));
        account.setEmailCount(count);
        emailAccountRepository.save(account);
    }
}
