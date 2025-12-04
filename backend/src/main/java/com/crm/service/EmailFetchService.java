package com.crm.service;

import com.crm.model.Email;
import com.crm.model.EmailAccount;
import com.crm.model.SequenceExecution;
import com.crm.repository.EmailRepository;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.internet.MimeUtility;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailFetchService {

    private final EmailRepository emailRepository;
    private final AIClassificationService aiClassificationService;
    private final ContactAutoCreationService contactAutoCreationService;
    private final EmailAccountService emailAccountService;
    private final ContactService contactService;
    private final com.crm.repository.ContactRepository contactRepository;
    private final UserContactService userContactService;
    private final com.crm.repository.SequenceExecutionRepository sequenceExecutionRepository;
    private final ScheduledEmailService scheduledEmailService;

    @Value("${email.fetch.folder:INBOX}")
    private String folderName;

    @Value("${email.fetch.enabled:true}")
    private boolean fetchEnabled;

    /**
     * Automatyczne pobieranie maili co 5 minut ze wszystkich aktywnych kont (async)
     */
    @Scheduled(fixedDelayString = "${email.fetch.interval:300000}")
    public void fetchEmails() {
        if (!fetchEnabled) {
            log.info("Email fetching is disabled");
            return;
        }

        // Use scheduler method to get all enabled accounts without user context
        List<EmailAccount> accounts = emailAccountService.getAllEnabledAccountsForScheduler();
        log.info("Starting async email fetch from {} enabled accounts", accounts.size());

        AtomicInteger totalNewEmails = new AtomicInteger(0);
        List<CompletableFuture<Integer>> futures = new ArrayList<>();

        for (EmailAccount account : accounts) {
            CompletableFuture<Integer> future = fetchEmailsForAccountAsync(account, 50);
            futures.add(future);
        }

        // Wait for all async tasks to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenRun(() -> {
                    futures.forEach(f -> {
                        try {
                            totalNewEmails.addAndGet(f.join());
                        } catch (Exception e) {
                            log.error("Error in async email fetch: {}", e.getMessage());
                        }
                    });
                    log.info("Async email fetch completed. Total new emails: {}", totalNewEmails.get());
                })
                .exceptionally(ex -> {
                    log.error("Error in async email fetch: {}", ex.getMessage(), ex);
                    return null;
                });
    }

    /**
     * Async wrapper for fetching emails from a single account
     */
    @Async("emailTaskExecutor")
    public CompletableFuture<Integer> fetchEmailsForAccountAsync(EmailAccount account, int limit) {
        try {
            int newEmails = fetchEmailsForAccount(account, limit);

            // Update last fetch time
            emailAccountService.updateLastFetchTime(account.getId(), LocalDateTime.now());
            // Sync email count
            int totalForAccount = emailRepository.countByAccountId(account.getId()).intValue();
            emailAccountService.setEmailCount(account.getId(), totalForAccount);

            return CompletableFuture.completedFuture(newEmails);
        } catch (Exception e) {
            log.error("Error fetching emails from {}: {}", account.getEmailAddress(), e.getMessage(), e);
            return CompletableFuture.completedFuture(0);
        }
    }

    /**
     * Ręczne pobieranie maili (wywołanie przez API) ze wszystkich aktywnych kont
     */
    public int fetchEmailsManually() {
        log.info("Manual email fetch triggered");

        // Use scheduler method to get all enabled accounts without user context
        List<EmailAccount> accounts = emailAccountService.getAllEnabledAccountsForScheduler();
        int totalNewEmails = 0;

        for (EmailAccount account : accounts) {
            try {
                int newEmails = fetchEmailsForAccount(account, 0); // 0 = fetch all
                totalNewEmails += newEmails;

                emailAccountService.updateLastFetchTime(account.getId(), LocalDateTime.now());
                int totalForAccount = emailRepository.countByAccountId(account.getId()).intValue();
                emailAccountService.setEmailCount(account.getId(), totalForAccount);
            } catch (Exception e) {
                log.error("Error fetching emails from {}: {}", account.getEmailAddress(), e.getMessage(), e);
            }
        }

        log.info("Manual fetch completed. Total new emails: {}", totalNewEmails);
        return totalNewEmails;
    }

    /**
     * Pobierz maile z konkretnego konta
     */
    private int fetchEmailsForAccount(EmailAccount account, int limit) throws MessagingException, IOException {
        log.info("Fetching emails from {}", account.getEmailAddress());

        Store store = connectToMailServer(account);
        Folder inbox = store.getFolder(folderName);
        inbox.open(Folder.READ_ONLY);

        Message[] messages = inbox.getMessages();
        log.info("Found {} messages in inbox for {}", messages.length, account.getEmailAddress());

        int newEmails = 0;
        int messagesToProcess = limit > 0 ? Math.min(messages.length, limit) : messages.length;

        // Przetwarzaj od najnowszych
        for (int i = messages.length - 1; i >= messages.length - messagesToProcess && i >= 0; i--) {
            Message message = messages[i];

            try {
                String messageId = getMessageId(message);

                // Sprawdź czy email już istnieje dla tego konta (nie globalnie)
                // Pozwala to na duplikację emaili gdy wielu użytkowników używa tego samego konta
                if (emailRepository.findByMessageIdAndAccount_Id(messageId, account.getId()).isEmpty()) {
                    processAndSaveEmail(message, messageId, account);
                    newEmails++;
                }
            } catch (Exception e) {
                log.error("Error processing message from {}: {}", account.getEmailAddress(), e.getMessage(), e);
            }
        }

        inbox.close(false);
        store.close();

        log.info("Fetched {} new emails from {}", newEmails, account.getEmailAddress());
        return newEmails;
    }

    private Store connectToMailServer(EmailAccount account) throws MessagingException {
        Properties props = new Properties();
        props.put("mail.store.protocol", account.getImapProtocol());
        props.put("mail." + account.getImapProtocol() + ".host", account.getImapHost());
        props.put("mail." + account.getImapProtocol() + ".port", account.getImapPort().toString());

        if ("imaps".equals(account.getImapProtocol())) {
            props.put("mail.imaps.ssl.enable", "true");
            props.put("mail.imaps.ssl.trust", "*");
        }

        Session session = Session.getInstance(props);
        Store store = session.getStore(account.getImapProtocol());
        store.connect(account.getImapHost(), account.getEmailAddress(), account.getPassword());

        log.info("Connected to mail server: {} for account {}", account.getImapHost(), account.getEmailAddress());
        return store;
    }

    private void processAndSaveEmail(Message message, String messageId, EmailAccount account) throws MessagingException, IOException {
        String from = getFrom(message);
        String subject = decodeSubject(message.getSubject());
        String content = getTextFromMessage(message);
        LocalDateTime receivedDate = message.getReceivedDate() != null
            ? LocalDateTime.ofInstant(message.getReceivedDate().toInstant(), ZoneId.systemDefault())
            : LocalDateTime.now();

        // Klasyfikacja AI
        String status = aiClassificationService.classifyEmail(subject, content);

        // Zapisz do bazy
        Email email = new Email();
        email.setMessageId(messageId);
        email.setSender(from);
        email.setAccount(account);
        email.setUserId(null); // Email nie jest przypisany do konkretnego użytkownika - będzie dostępny dla wszystkich z konta
        email.setRecipient(account.getEmailAddress()); // Ustawienie odbiorcy
        email.setCompany(extractCompany(from));
        email.setSubject(subject);
        email.setPreview(truncate(content, 500)); // Zwiększony limit z 200 do 500 znaków
        email.setContent(content); // Zapisz pełną treść dla wyciągania danych kontaktowych
        email.setStatus(status);
        email.setReceivedAt(receivedDate);

        Email savedEmail = emailRepository.save(email);
        log.info("Saved email from {} to {} with status: {}", from, account.getEmailAddress(), status);

        // Jeśli to odpowiedź kontaktu, zatrzymaj sekwencję i przesuń deal
        handleSequenceReply(extractEmailAddress(from));

        // Automatycznie utwórz/zaktualizuj kontakt
        try {
            contactAutoCreationService.createOrUpdateContactFromEmail(savedEmail);

            // Auto-enrich contact with details from email body (signature)
            String senderEmailAddress = extractEmailAddress(from);
            contactRepository.findByEmail(senderEmailAddress).ifPresent(contact -> {
                contactService.autoEnrichContact(contact.getId(), content);

                // Dodaj kontakt do użytkownika na podstawie statusu emaila
                userContactService.addContactBasedOnEmailStatus(
                    contact.getId(),
                    account.getId(),
                    status
                );
            });

            log.debug("Contact creation/update completed for email ID: {}", savedEmail.getId());
        } catch (Exception e) {
            log.error("Failed to create/update contact for email ID {} (sender: {}): {}",
                savedEmail.getId(), from, e.getMessage(), e);
            // Nie rzucamy wyjątku dalej, żeby nie przerywać procesu zapisywania emaila
        }
    }

    /**
     * Po otrzymaniu maila sprawdza, czy nadawca jest odbiorcą jakiejś sekwencji.
     * Jeśli tak – oznacza execution jako "replied", anuluje resztę kroków i przesuwa deal.
     */
    private void handleSequenceReply(String senderEmail) {
        if (senderEmail == null || senderEmail.isBlank()) {
            return;
        }

        List<SequenceExecution> executions = sequenceExecutionRepository
            .findByRecipientEmailIgnoreCaseAndStatusIn(
                senderEmail,
                List.of("active", "completed")
            );

        if (executions.isEmpty()) {
            return;
        }

        log.info("Detected reply from {} for {} executions", senderEmail, executions.size());
        executions.forEach(scheduledEmailService::stopSequenceOnReply);
    }

    private String extractEmailAddress(String sender) {
        if (sender == null) return "";
        if (sender.contains("<") && sender.contains(">")) {
            return sender.substring(sender.indexOf("<") + 1, sender.indexOf(">"));
        }
        return sender.trim();
    }

    private String getMessageId(Message message) throws MessagingException {
        String[] headers = message.getHeader("Message-ID");
        if (headers != null && headers.length > 0) {
            return headers[0];
        }
        // Fallback: użyj kombinacji daty i tematu
        return message.getReceivedDate().getTime() + "_" + message.getSubject().hashCode();
    }

    private String getFrom(Message message) throws MessagingException {
        Address[] from = message.getFrom();
        if (from != null && from.length > 0) {
            String fromString = from[0].toString();
            try {
                // Dekoduj MIME encoded-words (np. =?utf-8?q?...)
                return MimeUtility.decodeText(fromString);
            } catch (UnsupportedEncodingException e) {
                log.warn("Failed to decode sender address: {}", fromString);
                return fromString;
            }
        }
        return "Unknown";
    }
    
    private String decodeSubject(String subject) {
        if (subject == null) return "Brak tematu";
        try {
            return MimeUtility.decodeText(subject);
        } catch (UnsupportedEncodingException e) {
            log.warn("Failed to decode subject: {}", subject);
            return subject;
        }
    }

    private String extractCompany(String from) {
        // Wyciągnij domenę z adresu email
        if (from.contains("@")) {
            String domain = from.substring(from.lastIndexOf("@") + 1);
            domain = domain.replaceAll("[<>]", "").trim();
            
            // Nie wyciągaj firmy z popularnych domen email
            String[] commonDomains = {
                "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com",
                "mail.com", "protonmail.com", "aol.com", "zoho.com", "yandex.com"
            };
            
            String domainLower = domain.toLowerCase();
            for (String commonDomain : commonDomains) {
                if (domainLower.equals(commonDomain) || domainLower.startsWith(commonDomain + ".")) {
                    return "Unknown"; // Nie ustawiaj popularnych domen jako firmy
                }
            }
            
            // Zwróć pierwszą część domeny (przed pierwszą kropką)
            return domain.split("\\.")[0];
        }
        return "Unknown";
    }

    private String getTextFromMessage(Message message) throws MessagingException, IOException {
        String result = "";
        
        if (message.isMimeType("text/plain")) {
            result = message.getContent().toString();
        } else if (message.isMimeType("multipart/*")) {
            MimeMultipart mimeMultipart = (MimeMultipart) message.getContent();
            result = getTextFromMimeMultipart(mimeMultipart);
        } else if (message.isMimeType("text/html")) {
            result = message.getContent().toString();
            result = result.replaceAll("<[^>]*>", ""); // Usuń HTML tags
        }
        
        return result;
    }

    private String getTextFromMimeMultipart(MimeMultipart mimeMultipart) throws MessagingException, IOException {
        StringBuilder result = new StringBuilder();
        int count = mimeMultipart.getCount();
        
        for (int i = 0; i < count; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);
            
            if (bodyPart.isMimeType("text/plain")) {
                result.append(bodyPart.getContent());
                break; // Preferuj plain text
            } else if (bodyPart.isMimeType("text/html")) {
                String html = (String) bodyPart.getContent();
                result.append(html.replaceAll("<[^>]*>", ""));
            } else if (bodyPart.getContent() instanceof MimeMultipart) {
                result.append(getTextFromMimeMultipart((MimeMultipart) bodyPart.getContent()));
            }
        }
        
        return result.toString();
    }

    private String truncate(String str, int length) {
        if (str == null) return "";
        if (str.length() <= length) return str;
        return str.substring(0, length) + "...";
    }
}
