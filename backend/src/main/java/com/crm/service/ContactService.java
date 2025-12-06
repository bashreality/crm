package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.crm.exception.ResourceNotFoundException;

@Service
@Transactional
@Slf4j
public class ContactService {

    private final ContactRepository contactRepository;
    private final EmailRepository emailRepository;
    private final AIClassificationService aiClassificationService;
    private final UserContactService userContactService;
    private final WorkflowAutomationService workflowAutomationService;

    @Autowired
    public ContactService(
            ContactRepository contactRepository,
            EmailRepository emailRepository,
            AIClassificationService aiClassificationService,
            UserContactService userContactService,
            @Lazy WorkflowAutomationService workflowAutomationService) {
        this.contactRepository = contactRepository;
        this.emailRepository = emailRepository;
        this.aiClassificationService = aiClassificationService;
        this.userContactService = userContactService;
        this.workflowAutomationService = workflowAutomationService;
    }
    
    public List<Contact> getAllContacts() {
        return contactRepository.findAll();
    }
    
    public Optional<Contact> getContactById(Long id) {
        return contactRepository.findById(id);
    }
    
    public Contact createContact(Contact contact) {
        // Sprawdź czy kontakt o danym emailu już istnieje (case-insensitive)
        if (contact.getEmail() != null && !contact.getEmail().isEmpty()) {
            Optional<Contact> existingContact = contactRepository.findByEmailIgnoreCase(contact.getEmail());
            if (existingContact.isPresent()) {
                Contact existing = existingContact.get();
                log.info("Contact with email {} already exists (ID: {})", contact.getEmail(), existing.getId());

                // Jeśli kontakt istnieje, dodaj go do user_contacts dla bieżącego użytkownika
                if (contact.getUserId() != null) {
                    userContactService.addContactToUser(contact.getUserId(), existing.getId(), "manual");
                    log.info("Added existing contact {} to user {}", existing.getId(), contact.getUserId());
                }
                return existing;
            }
        }

        // Ustaw domyślne wartości jeśli nie są ustawione
        if (contact.getEmailCount() == null) {
            contact.setEmailCount(0);
        }
        if (contact.getMeetingCount() == null) {
            contact.setMeetingCount(0);
        }
        if (contact.getScore() == null) {
            contact.setScore(0);
        }

        Contact savedContact = contactRepository.save(contact);
        log.info("Created new contact: ID={}, email={}, userId={}",
                 savedContact.getId(), savedContact.getEmail(), savedContact.getUserId());

        // Dodaj wpis do user_contacts dla właściciela
        if (savedContact.getUserId() != null) {
            userContactService.addContactToUser(savedContact.getUserId(), savedContact.getId(), "manual");
            log.info("Added new contact {} to user {} via user_contacts",
                     savedContact.getId(), savedContact.getUserId());
        } else {
            log.warn("Contact {} created without userId - will not be visible to any user!", savedContact.getId());
        }

        // Trigger workflow automation for new contact
        try {
            workflowAutomationService.handleContactCreated(savedContact);
            log.debug("Triggered CONTACT_CREATED workflow for contact {}", savedContact.getId());
        } catch (Exception e) {
            log.error("Error triggering CONTACT_CREATED workflow for contact {}: {}",
                     savedContact.getId(), e.getMessage(), e);
        }

        return savedContact;
    }
    
    public Contact updateContact(Long id, Contact contactDetails) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + id));
        
        contact.setName(contactDetails.getName());
        contact.setCompany(contactDetails.getCompany());
        contact.setEmail(contactDetails.getEmail());
        contact.setPhone(contactDetails.getPhone());
        contact.setEmailCount(contactDetails.getEmailCount());
        contact.setMeetingCount(contactDetails.getMeetingCount());
        contact.setPosition(contactDetails.getPosition()); // Update position as well

        return contactRepository.save(contact);
    }

    /**
     * Automatycznie uzupełnia brakujące dane kontaktu na podstawie treści maila (AI Enrichment)
     */
    public void autoEnrichContact(Long contactId, String emailBody) {
        if (emailBody == null || emailBody.isEmpty()) {
            return;
        }

        Optional<Contact> contactOpt = contactRepository.findById(contactId);
        if (contactOpt.isEmpty()) {
            return;
        }
        Contact contact = contactOpt.get();

        // Jeśli mamy już komplet danych, nie pytaj AI (oszczędność kosztów/czasu)
        if (contact.getPhone() != null && !contact.getPhone().isEmpty() && 
            contact.getPosition() != null && !contact.getPosition().isEmpty()) {
            return;
        }

        log.info("Attempting AI enrichment for contact: {}", contact.getEmail());
        Map<String, String> extractedData = aiClassificationService.extractContactDetails(emailBody);

        boolean updated = false;

        // Aktualizuj telefon jeśli brakuje
        if ((contact.getPhone() == null || contact.getPhone().isEmpty()) && 
            extractedData.containsKey("phone") && extractedData.get("phone") != null) {
            contact.setPhone(extractedData.get("phone"));
            updated = true;
            log.info("AI Enriched Phone for contact {}: {}", contact.getId(), contact.getPhone());
        }

        // Aktualizuj stanowisko jeśli brakuje
        if ((contact.getPosition() == null || contact.getPosition().isEmpty()) && 
            extractedData.containsKey("position") && extractedData.get("position") != null) {
            contact.setPosition(extractedData.get("position"));
            updated = true;
            log.info("AI Enriched Position for contact {}: {}", contact.getId(), contact.getPosition());
        }

        if (updated) {
            contactRepository.save(contact);
        }
    }
    
    /**
     * Soft delete a contact (mark as deleted without removing from database)
     */
    public void deleteContact(Long id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + id));
        contact.softDelete();
        contactRepository.save(contact);
        log.info("Soft deleted contact: {}", id);
    }

    /**
     * Permanently delete a contact from database
     */
    public void hardDeleteContact(Long id) {
        contactRepository.deleteById(id);
        log.info("Permanently deleted contact: {}", id);
    }

    /**
     * Restore a soft-deleted contact
     */
    public Contact restoreContact(Long id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + id));
        contact.restore();
        Contact restored = contactRepository.save(contact);
        log.info("Restored contact: {}", id);
        return restored;
    }
    
    public List<Contact> searchContacts(String query) {
        return contactRepository.findByNameContainingIgnoreCase(query);
    }
    
    public List<Contact> getContactsByCompany(String company) {
        return contactRepository.findByCompanyContainingIgnoreCase(company);
    }
    
    /**
     * Pobierz wszystkie emaile powiązane z kontaktem
     */
    public List<Email> getEmailsByContact(Contact contact) {
        // Szukaj emaili zawierających adres email kontaktu w polu sender
        return emailRepository.findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(contact.getEmail());
    }
    
    /**
     * Pobierz listę unikalnych firm
     */
    public List<String> getUniqueCompanies() {
        return contactRepository.findDistinctCompanies();
    }

    /**
     * Pobierz kontakty które mają przynajmniej jeden email z danym statusem
     */
    public List<Contact> getContactsWithEmailStatus(String status) {
        return contactRepository.findContactsWithEmailStatus(status);
    }

    // User-specific methods (teraz używające współdzielonych kontaktów)
    public List<Contact> getAllContactsForUser(Long userId) {
        return contactRepository.findAccessibleByUserId(userId);
    }

    public List<Contact> searchContactsForUser(Long userId, String query) {
        return contactRepository.findAccessibleByUserIdAndNameContainingIgnoreCase(userId, query);
    }

    public List<Contact> getContactsByCompanyForUser(Long userId, String company) {
        return contactRepository.findAccessibleByUserIdAndCompanyContainingIgnoreCase(userId, company);
    }

    @Cacheable(value = "companies", key = "#userId")
    public List<String> getUniqueCompaniesForUser(Long userId) {
        // Ze względu na współdzielenie, możemy pokazać wszystkie unikalne firmy
        return contactRepository.findDistinctCompanies();
    }

    public List<Contact> getContactsWithEmailStatusForUser(Long userId, String status) {
        return contactRepository.findAccessibleWithEmailStatusByUserId(userId, status);
    }

    // Paginated methods for better performance
    public Page<Contact> getAllContactsForUser(Long userId, Pageable pageable) {
        return contactRepository.findAccessibleByUserIdOrderByUpdatedAtDesc(userId, pageable);
    }

    public Page<Contact> searchContactsForUser(Long userId, String query, Pageable pageable) {
        return contactRepository.findAccessibleByUserIdAndNameContainingIgnoreCase(userId, query, pageable);
    }

    public Page<Contact> getContactsByCompanyForUser(Long userId, String company, Pageable pageable) {
        return contactRepository.findAccessibleByUserIdAndCompanyContainingIgnoreCase(userId, company, pageable);
    }

    public Page<Contact> getContactsWithEmailStatusForUser(Long userId, String status, Pageable pageable) {
        return contactRepository.findAccessibleWithEmailStatusByUserId(userId, status, pageable);
    }
}
