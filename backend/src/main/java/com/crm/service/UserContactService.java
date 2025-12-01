package com.crm.service;

import com.crm.model.AdminUser;
import com.crm.model.Contact;
import com.crm.model.UserContact;
import com.crm.repository.AdminUserRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailAccountRepository;
import com.crm.repository.UserContactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserContactService {

    private final UserContactRepository userContactRepository;
    private final ContactRepository contactRepository;
    private final AdminUserRepository adminUserRepository;
    private final EmailAccountRepository emailAccountRepository;

    /**
     * Dodaje kontakt do listy kontaktów WSZYSTKICH użytkowników, którzy mają dostęp do konta email
     */
    @Transactional
    public void addContactBasedOnEmailStatus(Long contactId, Long emailAccountId, String emailStatus) {
        // Sprawdź czy status kwalifikuje się do dodania kontaktu
        if (shouldAddContact(emailStatus)) {
            // Znajdź WSZYSTKICH użytkowników, którzy mają dostęp do tego konta email
            List<Long> userIds = findAllUsersByAccountId(emailAccountId);

            if (userIds.isEmpty()) {
                log.warn("No users found for email account ID: {}", emailAccountId);
                return;
            }

            // Dodaj kontakt do każdego użytkownika
            for (Long userId : userIds) {
                addContactToUser(userId, contactId, "email_" + emailStatus);
            }
            log.info("Added contact {} to {} users based on email status: {}", contactId, userIds.size(), emailStatus);
        }
    }

    /**
     * Dodaje kontakt do listy kontaktów użytkownika
     */
    @Transactional
    public void addContactToUser(Long userId, Long contactId, String source) {
        // Sprawdź czy kontakt już nie jest przypisany
        if (userContactRepository.findByUserIdAndContactId(userId, contactId).isPresent()) {
            log.debug("Contact {} already assigned to user {}", contactId, userId);
            return;
        }

        UserContact userContact = new UserContact();
        userContact.setUser(adminUserRepository.findById(userId).orElse(null));
        userContact.setContact(contactRepository.findById(contactId).orElse(null));
        userContact.setSource(source);
        userContact.setAddedAt(LocalDateTime.now());

        userContactRepository.save(userContact);
    }

    /**
     * Usuwa kontakt z listy użytkownika
     */
    @Transactional
    public void removeContactFromUser(Long userId, Long contactId) {
        userContactRepository.deleteByUserIdAndContactId(userId, contactId);
        log.info("Removed contact {} from user {}", contactId, userId);
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do kontaktu
     */
    public boolean hasUserAccessToContact(Long userId, Long contactId) {
        return userContactRepository.findByUserIdAndContactId(userId, contactId).isPresent();
    }

    /**
     * Pobiera wszystkie ID kontaktów dostępnych dla użytkownika
     */
    public List<Long> getAccessibleContactIds(Long userId) {
        return userContactRepository.findByUserId(userId).stream()
                .map(uc -> uc.getContact().getId())
                .collect(Collectors.toList());
    }

    /**
     * Udostępnia kontakt wszystkim użytkownikom powiązanym z domeną email
     */
    @Transactional
    public void shareContactWithDomainUsers(Contact contact) {
        String emailDomain = extractEmailDomain(contact.getEmail());
        if (emailDomain == null) return;

        // Znajdź wszystkie konta email z tej samej domeny
        List<AdminUser> domainUsers = adminUserRepository.findUsersWithEmailDomain(emailDomain);

        for (AdminUser user : domainUsers) {
            addContactToUser(user.getId(), contact.getId(), "auto_domain");
        }
    }

    /**
     * Zwraca źródło przypisania kontaktu do użytkownika
     */
    public String getContactAssignmentSource(Long userId, Long contactId) {
        Optional<UserContact> userContact = userContactRepository.findByUserIdAndContactId(userId, contactId);
        return userContact.map(UserContact::getSource).orElse(null);
    }

    private List<Long> findAllUsersByAccountId(Long emailAccountId) {
        // Na razie zakładamy, że konto email może być przypisane tylko do jednego użytkownika
        // W przyszłości można zmienić na relację wiele-do-wielu
        Long userId = emailAccountRepository.findById(emailAccountId)
                .map(account -> account.getUserId())
                .orElse(null);

        if (userId != null) {
            return List.of(userId);
        }
        return List.of();
    }

    private boolean shouldAddContact(String emailStatus) {
        // Dodajemy kontakt dla WSZYSTKICH statusów emaili (oprócz undelivered)
        // Dzięki temu użytkownik może tagować i zarządzać nawet kontaktami z negatywnymi odpowiedziami
        return "positive".equals(emailStatus) ||
               "maybeLater".equals(emailStatus) ||
               "auto".equals(emailStatus) ||
               "autoReply".equals(emailStatus) ||
               "neutral".equals(emailStatus) ||
               "negative".equals(emailStatus);
    }

    private String extractEmailDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf("@") + 1);
    }
}