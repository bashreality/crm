package com.crm.service;

import com.crm.model.Email;
import com.crm.repository.EmailRepository;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.internet.MimeUtility;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailFetchService {

    private final EmailRepository emailRepository;
    private final AIClassificationService aiClassificationService;
    private final ContactAutoCreationService contactAutoCreationService;

    @Value("${email.imap.host}")
    private String mailHost;

    @Value("${email.imap.username}")
    private String mailUsername;

    @Value("${email.imap.password}")
    private String mailPassword;

    @Value("${email.fetch.folder:INBOX}")
    private String folderName;

    @Value("${email.fetch.enabled:true}")
    private boolean fetchEnabled;

    /**
     * Automatyczne pobieranie maili co 5 minut
     */
    @Scheduled(fixedDelayString = "${email.fetch.interval:300000}")
    public void fetchEmails() {
        if (!fetchEnabled) {
            log.info("Email fetching is disabled");
            return;
        }

        log.info("Starting email fetch from {}", mailUsername);
        
        try {
            Store store = connectToMailServer();
            Folder inbox = store.getFolder(folderName);
            inbox.open(Folder.READ_ONLY);

            Message[] messages = inbox.getMessages();
            log.info("Found {} messages in inbox", messages.length);

            int newEmails = 0;
            int limit = Math.min(messages.length, 50); // Limit do 50 najnowszych

            // Przetwarzaj od najnowszych
            for (int i = messages.length - 1; i >= messages.length - limit && i >= 0; i--) {
                Message message = messages[i];
                
                try {
                    String messageId = getMessageId(message);
                    
                    // Sprawdź czy email już istnieje
                    if (emailRepository.findByMessageId(messageId).isEmpty()) {
                        processAndSaveEmail(message, messageId);
                        newEmails++;
                    }
                } catch (Exception e) {
                    log.error("Error processing message: {}", e.getMessage(), e);
                }
            }

            inbox.close(false);
            store.close();

            log.info("Email fetch completed. New emails: {}", newEmails);

        } catch (Exception e) {
            log.error("Error fetching emails: {}", e.getMessage(), e);
        }
    }

    /**
     * Ręczne pobieranie maili (wywołanie przez API)
     */
    public int fetchEmailsManually() {
        log.info("Manual email fetch triggered");
        
        try {
            Store store = connectToMailServer();
            Folder inbox = store.getFolder(folderName);
            inbox.open(Folder.READ_ONLY);

            Message[] messages = inbox.getMessages();
            int newEmails = 0;

            for (Message message : messages) {
                try {
                    String messageId = getMessageId(message);
                    
                    if (emailRepository.findByMessageId(messageId).isEmpty()) {
                        processAndSaveEmail(message, messageId);
                        newEmails++;
                    }
                } catch (Exception e) {
                    log.error("Error processing message: {}", e.getMessage(), e);
                }
            }

            inbox.close(false);
            store.close();

            log.info("Manual fetch completed. New emails: {}", newEmails);
            return newEmails;

        } catch (Exception e) {
            log.error("Error in manual fetch: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch emails: " + e.getMessage());
        }
    }

    private Store connectToMailServer() throws MessagingException {
        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.host", mailHost);
        props.put("mail.imaps.port", "993");
        props.put("mail.imaps.ssl.enable", "true");
        props.put("mail.imaps.ssl.trust", "*");

        Session session = Session.getInstance(props);
        Store store = session.getStore("imaps");
        store.connect(mailHost, mailUsername, mailPassword);
        
        log.info("Connected to mail server: {}", mailHost);
        return store;
    }

    private void processAndSaveEmail(Message message, String messageId) throws MessagingException, IOException {
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
        email.setCompany(extractCompany(from));
        email.setSubject(subject);
        email.setPreview(truncate(content, 500)); // Zwiększony limit z 200 do 500 znaków
        email.setContent(content); // Zapisz pełną treść dla wyciągania danych kontaktowych
        email.setStatus(status);
        email.setReceivedAt(receivedDate);

        Email savedEmail = emailRepository.save(email);
        log.info("Saved email from {} with status: {}", from, status);
        
        // Automatycznie utwórz/zaktualizuj kontakt
        try {
            contactAutoCreationService.createOrUpdateContactFromEmail(savedEmail);
            log.debug("Contact creation/update completed for email ID: {}", savedEmail.getId());
        } catch (Exception e) {
            log.error("Failed to create/update contact for email ID {} (sender: {}): {}", 
                savedEmail.getId(), from, e.getMessage(), e);
            // Nie rzucamy wyjątku dalej, żeby nie przerywać procesu zapisywania emaila
        }
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
