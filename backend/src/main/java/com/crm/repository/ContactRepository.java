package com.crm.repository;

import com.crm.model.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    Optional<Contact> findByEmail(String email);
    List<Contact> findByCompanyContainingIgnoreCase(String company);
    List<Contact> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT DISTINCT c.company FROM Contact c WHERE c.company IS NOT NULL AND c.company != '' ORDER BY c.company")
    List<String> findDistinctCompanies();
}
