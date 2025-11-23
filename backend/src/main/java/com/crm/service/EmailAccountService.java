package com.crm.service;

import com.crm.model.EmailAccount;
import com.crm.repository.EmailAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class EmailAccountService {

    @Autowired
    private EmailAccountRepository emailAccountRepository;

    public List<EmailAccount> getAllAccounts() {
        return emailAccountRepository.findAll();
    }

    public List<EmailAccount> getEnabledAccounts() {
        return emailAccountRepository.findByEnabledTrue();
    }

    public Optional<EmailAccount> getAccountById(Long id) {
        return emailAccountRepository.findById(id);
    }

    public Optional<EmailAccount> getAccountByEmail(String emailAddress) {
        return emailAccountRepository.findByEmailAddress(emailAddress);
    }

    @Transactional
    public EmailAccount createAccount(EmailAccount account) {
        if (emailAccountRepository.existsByEmailAddress(account.getEmailAddress())) {
            throw new IllegalArgumentException("Account with email " + account.getEmailAddress() + " already exists");
        }
        return emailAccountRepository.save(account);
    }

    @Transactional
    public EmailAccount updateAccount(Long id, EmailAccount updatedAccount) {
        EmailAccount account = emailAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + id));

        account.setEmailAddress(updatedAccount.getEmailAddress());
        account.setPassword(updatedAccount.getPassword());
        account.setImapHost(updatedAccount.getImapHost());
        account.setImapPort(updatedAccount.getImapPort());
        account.setImapProtocol(updatedAccount.getImapProtocol());
        account.setSmtpHost(updatedAccount.getSmtpHost());
        account.setSmtpPort(updatedAccount.getSmtpPort());
        account.setEnabled(updatedAccount.getEnabled());
        account.setDisplayName(updatedAccount.getDisplayName());

        return emailAccountRepository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id) {
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
        account.setEmailCount(account.getEmailCount() + count);
        emailAccountRepository.save(account);
    }
}
