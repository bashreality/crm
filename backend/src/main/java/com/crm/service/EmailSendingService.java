package com.crm.service;

import com.crm.model.Email;
import com.crm.repository.EmailRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSendingService {

    private final JavaMailSender mailSender;
    private final EmailRepository emailRepository;

    @Value("${spring.mail.from}")
    private String fromEmail;

    /**
     * Wysyła email reply
     *
     * @param toEmail Adres odbiorcy
     * @param subject Temat
     * @param body Treść wiadomości (HTML)
     * @param inReplyTo Message-ID oryginalnej wiadomości (dla wątków)
     * @param references References z oryginalnej wiadomości
     * @return ID wysłanego emaila
     */
    public Long sendReply(String toEmail, String subject, String body, String inReplyTo, String references) throws MessagingException {
        log.info("Sending reply to: {}, subject: {}", toEmail, subject);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true); // true = HTML

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
     *
     * @param toEmail Adres odbiorcy
     * @param subject Temat
     * @param body Treść wiadomości (HTML)
     * @return ID wysłanego emaila
     */
    public Long sendEmail(String toEmail, String subject, String body) throws MessagingException {
        return sendReply(toEmail, subject, body, null, null);
    }

    /**
     * Wysyła email z załącznikami (future enhancement)
     */
    // TODO: Add attachment support if needed
}
