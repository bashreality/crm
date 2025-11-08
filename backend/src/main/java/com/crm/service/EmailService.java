package com.crm.service;

import com.crm.model.Email;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmailService {
    
    private final EmailRepository emailRepository;
    
    public List<Email> getAllEmails() {
        return emailRepository.findAll();
    }
    
    public Optional<Email> getEmailById(Long id) {
        return emailRepository.findById(id);
    }
    
    public Email createEmail(Email email) {
        return emailRepository.save(email);
    }
    
    public Email updateEmail(Long id, Email emailDetails) {
        Email email = emailRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Email not found with id: " + id));
        
        email.setSender(emailDetails.getSender());
        email.setCompany(emailDetails.getCompany());
        email.setSubject(emailDetails.getSubject());
        email.setPreview(emailDetails.getPreview());
        email.setContent(emailDetails.getContent());
        email.setStatus(emailDetails.getStatus());
        
        return emailRepository.save(email);
    }
    
    public void deleteEmail(Long id) {
        emailRepository.deleteById(id);
    }
    
    public List<Email> searchEmails(String query) {
        return emailRepository.findBySenderContainingIgnoreCaseOrSubjectContainingIgnoreCase(query, query);
    }
    
    public List<Email> getEmailsByCompany(String company) {
        return emailRepository.findByCompanyContainingIgnoreCase(company);
    }
    
    public List<Email> getEmailsByStatus(String status) {
        return emailRepository.findByStatus(status);
    }
    
    public List<Email> getEmailsByCompanyAndStatus(String company, String status) {
        return emailRepository.findByCompanyContainingIgnoreCaseAndStatus(company, status);
    }
    
    public List<String> getUniqueCompanies() {
        return emailRepository.findDistinctCompanies();
    }
}
