package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.model.EmailAccount;
import com.crm.repository.EmailRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Properties;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSendingService {

    private final JavaMailSender mailSender;
    private final EmailRepository emailRepository;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    /**
     * Przetwarza szablony zmiennych w tekście
     * Obsługiwane zmienne: {{name}}, {{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{company}}, {{position}}
     */
    public String processTemplateVariables(String text, Contact contact) {
        if (text == null || contact == null) {
            return text;
        }

        String result = text;

        // {{name}} - pełne imię i nazwisko
        if (contact.getName() != null) {
            result = result.replace("{{name}}", contact.getName());

            // {{firstName}} i {{lastName}} - wyodrębnij z pełnego imienia
            String[] nameParts = contact.getName().trim().split("\\s+");
            if (nameParts.length > 0) {
                result = result.replace("{{firstName}}", nameParts[0]);
            }
            if (nameParts.length > 1) {
                result = result.replace("{{lastName}}", nameParts[nameParts.length - 1]);
            }
        }

        // {{email}}
        if (contact.getEmail() != null) {
            result = result.replace("{{email}}", contact.getEmail());
        }

        // {{phone}}
        if (contact.getPhone() != null) {
            result = result.replace("{{phone}}", contact.getPhone());
        }

        // {{company}}
        if (contact.getCompany() != null) {
            result = result.replace("{{company}}", contact.getCompany());
        }

        // {{position}}
        if (contact.getPosition() != null) {
            result = result.replace("{{position}}", contact.getPosition());
        }

        // Usuń nieprzetworzone zmienne (pozostałe po braku danych)
        result = result.replaceAll("\\{\\{firstName\\}\\}", "");
        result = result.replaceAll("\\{\\{lastName\\}\\}", "");
        result = result.replaceAll("\\{\\{name\\}\\}", "");
        result = result.replaceAll("\\{\\{email\\}\\}", "");
        result = result.replaceAll("\\{\\{phone\\}\\}", "");
        result = result.replaceAll("\\{\\{company\\}\\}", "");
        result = result.replaceAll("\\{\\{position\\}\\}", "");

        return result;
    }

    /**
     * Wysyła email używając konkretnego konta EmailAccount
     */
    public Long sendEmailFromAccount(EmailAccount account, String toEmail, String subject, String body) throws MessagingException {
        log.info("Sending email from account {} to {}", account.getEmailAddress(), toEmail);

        // Generuj Tracking ID
        String trackingId = UUID.randomUUID().toString();
        String trackingPixel = String.format("<img src=\"%s/api/track/pixel.png?id=%s\" width=\"1\" height=\"1\" style=\"display:none;\" />", baseUrl, trackingId);

        // Dodaj sygnaturę z konta jeśli istnieje
        String fullBody = body;
        if (account.getSignature() != null && !account.getSignature().trim().isEmpty()) {
            // Dodaj sygnaturę na końcu wiadomości
            String signatureHtml = "<br/><br/>" + account.getSignature().replace("\n", "<br/>");
            fullBody = body + signatureHtml;
        }

        // Doklej piksel do body
        String bodyWithTracking = fullBody + trackingPixel;

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(account.getSmtpHost());
        sender.setPort(account.getSmtpPort());
        sender.setUsername(account.getEmailAddress());
        sender.setPassword(account.getPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(account.getEmailAddress());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(bodyWithTracking, true);

            sender.send(message);

            // Zapisz wysłany email
            Email sentEmail = new Email();
            sentEmail.setSender(account.getEmailAddress());
            sentEmail.setRecipient(toEmail);
            sentEmail.setSubject(subject);
            sentEmail.setContent(body); // Zapisz oryginał bez piksela (lub z, zależy od preferencji)
            sentEmail.setReceivedAt(LocalDateTime.now());
            sentEmail.setAccount(account); // Powiąż z kontem
            sentEmail.setCompany("Unknown");
            sentEmail.setStatus("neutral");
            sentEmail.setPreview(body.length() > 200 ? body.substring(0, 200) : body);
            
            // Tracking info
            sentEmail.setTrackingId(trackingId);
            sentEmail.setIsOpened(false);
            sentEmail.setOpenCount(0);

            Email saved = emailRepository.save(sentEmail);
            log.info("Email sent via account {}, saved ID: {}", account.getEmailAddress(), saved.getId());
            return saved.getId();

        } catch (MessagingException e) {
            log.error("Failed to send email from account {}", account.getEmailAddress(), e);
            throw e;
        }
    }

    /**
     * Wysyła email reply
     */
    public Long sendReply(String toEmail, String subject, String body, String inReplyTo, String references) throws MessagingException {
        log.info("Sending reply to: {}, subject: {}", toEmail, subject);

        // Generuj Tracking ID
        String trackingId = UUID.randomUUID().toString();
        String trackingPixel = String.format("<img src=\"%s/api/track/pixel.png?id=%s\" width=\"1\" height=\"1\" style=\"display:none;\" />", baseUrl, trackingId);
        
        // Doklej piksel do body
        String bodyWithTracking = body + trackingPixel;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(bodyWithTracking, true); // true = HTML

            // Dodaj nagłówki dla wątków email
            if (inReplyTo != null && !inReplyTo.isEmpty()) {
                message.addHeader("In-Reply-To", inReplyTo);
            }
            if (references != null && !references.isEmpty()) {
                message.addHeader("References", references);
            }

            mailSender.send(message);

            // Zapisz wysłany email w bazie danych
            Email sentEmail = new Email();
            sentEmail.setSender(fromEmail);
            sentEmail.setRecipient(toEmail);
            sentEmail.setSubject(subject);
            sentEmail.setContent(body);
            sentEmail.setReceivedAt(LocalDateTime.now());
            sentEmail.setMessageId(message.getMessageID());
            sentEmail.setInReplyTo(inReplyTo);
            sentEmail.setReferencesHeader(references);
            sentEmail.setCompany("Unknown"); // Domyślnie Unknown dla wysłanych
            sentEmail.setStatus("neutral"); // Wysłane emaile domyślnie neutral
            
            // Tracking
            sentEmail.setTrackingId(trackingId);
            sentEmail.setIsOpened(false);
            sentEmail.setOpenCount(0);

            Email saved = emailRepository.save(sentEmail);
            log.info("Reply sent successfully, saved with ID: {}", saved.getId());

            return saved.getId();
        } catch (MessagingException e) {
            log.error("Failed to send email to: {}", toEmail, e);
            throw e;
        }
    }

    /**
     * Wysyła nowy email (dla sekwencji follow-up)
     */
    public Long sendEmail(String toEmail, String subject, String body) throws MessagingException {
        return sendReply(toEmail, subject, body, null, null);
    }

    /**
     * Wysyła email jako odpowiedź używając konkretnego konta (utrzymanie wątku z danego konta)
     */
    public Long sendReplyFromAccount(EmailAccount account, String toEmail, String subject, String body, String inReplyTo, String references) throws MessagingException {
        log.info("Sending reply from account {} to {}", account.getEmailAddress(), toEmail);

        // Generuj Tracking ID
        String trackingId = UUID.randomUUID().toString();
        String trackingPixel = String.format("<img src=\"%s/api/track/pixel.png?id=%s\" width=\"1\" height=\"1\" style=\"display:none;\" />", baseUrl, trackingId);

        String bodyWithTracking = body + trackingPixel;

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(account.getSmtpHost());
        sender.setPort(account.getSmtpPort());
        sender.setUsername(account.getEmailAddress());
        sender.setPassword(account.getPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");

        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        helper.setFrom(account.getEmailAddress());
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(bodyWithTracking, true);

        if (inReplyTo != null) {
            message.setHeader("In-Reply-To", inReplyTo);
        }
        if (references != null) {
            message.setHeader("References", references);
        }

        try {
            sender.send(message);

            // Zapisz w bazie wysłanego maila (minimalne dane)
            Email sentEmail = new Email();
            sentEmail.setSender(account.getEmailAddress());
            sentEmail.setRecipient(toEmail);
            sentEmail.setSubject(subject);
            sentEmail.setContent(body);
            sentEmail.setReceivedAt(LocalDateTime.now());
            sentEmail.setMessageId(message.getMessageID());
            sentEmail.setInReplyTo(inReplyTo);
            sentEmail.setReferencesHeader(references);
            sentEmail.setCompany("Unknown");
            sentEmail.setStatus("neutral");
            sentEmail.setTrackingId(trackingId);
            sentEmail.setIsOpened(false);
            sentEmail.setOpenCount(0);

            Email saved = emailRepository.save(sentEmail);
            log.info("Reply sent successfully from account {}, saved with ID: {}", account.getEmailAddress(), saved.getId());

            return saved.getId();
        } catch (MessagingException e) {
            log.error("Failed to send reply from account {} to {}", account.getEmailAddress(), toEmail, e);
            throw e;
        }
    }
}
