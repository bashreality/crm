package com.crm.repository;

import com.crm.model.Email;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailRepository extends JpaRepository<Email, Long> {
    List<Email> findByCompanyContainingIgnoreCase(String company);
    List<Email> findByStatus(String status);
    List<Email> findByCompanyContainingIgnoreCaseAndStatus(String company, String status);
    List<Email> findBySenderContainingIgnoreCaseOrSubjectContainingIgnoreCase(String sender, String subject);
    Optional<Email> findByMessageId(String messageId);
    List<Email> findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(String sender);
    
    @Query("SELECT DISTINCT e.company FROM Email e WHERE e.company IS NOT NULL AND e.company != '' AND e.company != 'Unknown' ORDER BY e.company")
    List<String> findDistinctCompanies();

    Long countByStatus(String status);
}
