package com.crm.service;

import com.crm.model.Contact;
import com.crm.model.Email;
import com.crm.repository.ContactRepository;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class ContactService {
    
    private final ContactRepository contactRepository;
    private final EmailRepository emailRepository;
    
    public List<Contact> getAllContacts() {
        return contactRepository.findAll();
    }
    
    public Optional<Contact> getContactById(Long id) {
        return contactRepository.findById(id);
    }
    
    public Contact createContact(Contact contact) {
        // Ustaw domyślne wartości jeśli nie są ustawione
        if (contact.getEmailCount() == null) {
            contact.setEmailCount(0);
        }
        if (contact.getMeetingCount() == null) {
            contact.setMeetingCount(0);
        }
        if (contact.getDealCount() == null) {
            contact.setDealCount(0);
        }
        return contactRepository.save(contact);
    }
    
    public Contact updateContact(Long id, Contact contactDetails) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact not found with id: " + id));
        
        contact.setName(contactDetails.getName());
        contact.setCompany(contactDetails.getCompany());
        contact.setEmail(contactDetails.getEmail());
        contact.setPhone(contactDetails.getPhone());
        contact.setEmailCount(contactDetails.getEmailCount());
        contact.setMeetingCount(contactDetails.getMeetingCount());
        contact.setDealCount(contactDetails.getDealCount() != null ? contactDetails.getDealCount() : 0);
        
        return contactRepository.save(contact);
    }
    
    public void deleteContact(Long id) {
        contactRepository.deleteById(id);
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
}
