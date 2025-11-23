package com.crm.repository;

import com.crm.model.Email;
import com.crm.model.EmailAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // Account-based queries
    List<Email> findByAccount(EmailAccount account);
    List<Email> findByAccountId(Long accountId);
    List<Email> findByAccountIdAndStatus(Long accountId, String status);
    Long countByAccountId(Long accountId);
    Long countByAccountIdAndStatus(Long accountId, String status);

    @Query("SELECT DISTINCT e.company FROM Email e WHERE e.company IS NOT NULL AND e.company != '' AND e.company != 'Unknown' ORDER BY e.company")
    List<String> findDistinctCompanies();

    Long countByStatus(String status);

    @Query("SELECT COUNT(e) FROM Email e WHERE e.account.id = :accountId")
    Long countEmailsByAccountId(@Param("accountId") Long accountId);
}
