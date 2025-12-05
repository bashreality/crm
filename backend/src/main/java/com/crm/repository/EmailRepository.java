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
    Optional<Email> findByMessageIdAndAccount_Id(String messageId, Long accountId);
    List<Email> findBySenderContainingIgnoreCaseOrderByReceivedAtDesc(String sender);
    Optional<Email> findByTrackingId(String trackingId);

    // Account-based queries
    List<Email> findByAccount(EmailAccount account);
    List<Email> findByAccountId(Long accountId);
    List<Email> findByAccountIdAndStatus(Long accountId, String status);
    Long countByAccountId(Long accountId);
    Long countByAccountIdAndStatus(Long accountId, String status);
    void deleteByAccountId(Long accountId);

    @Query("SELECT DISTINCT e.company FROM Email e WHERE e.company IS NOT NULL AND e.company != '' AND e.company != 'Unknown' ORDER BY e.company")
    List<String> findDistinctCompanies();

    Long countByStatus(String status);

    @Query("SELECT COUNT(e) FROM Email e WHERE e.account.id = :accountId")
    Long countEmailsByAccountId(@Param("accountId") Long accountId);

    @Query(value = "SELECT e.* FROM emails e " +
            "JOIN email_accounts ea ON e.account_id = ea.id " +
            "WHERE " +
            "(:userId IS NULL OR EXISTS (SELECT 1 FROM email_accounts ea2 WHERE ea2.email_address = ea.email_address AND ea2.user_id = :userId)) AND " +
            "ea.enabled = true AND " +
            "(:accountId IS NULL OR e.account_id = :accountId) AND " +
            "(:status IS NULL OR :status = '' OR e.status = :status) AND " +
            "(:company IS NULL OR :company = '' OR LOWER(e.company) LIKE LOWER(CONCAT('%', :company, '%'))) AND " +
            "(:search IS NULL OR :search = '' OR LOWER(e.sender) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(e.subject) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY e.received_at DESC LIMIT 1000",
            nativeQuery = true)
    List<Email> findByFilters(
            @Param("userId") Long userId,
            @Param("accountId") Long accountId,
            @Param("status") String status,
            @Param("company") String company,
            @Param("search") String search
    );

    // Additional user-specific queries
    List<Email> findByUserId(Long userId);
    List<Email> findByUserIdAndStatus(Long userId, String status);
    List<Email> findByUserIdOrderByReceivedAtDesc(Long userId);
    Long countByUserId(Long userId);
    Long countByUserIdAndStatus(Long userId, String status);

    // Thread context queries for sequences
    List<Email> findTop10BySenderContainingIgnoreCaseOrRecipientContainingIgnoreCaseOrderByReceivedAtDesc(
            @Param("sender") String sender,
            @Param("recipient") String recipient
    );

    // Nowe metody - emaile dostępne dla użytkownika na podstawie przypisanych kont email
    @Query("SELECT e FROM Email e JOIN EmailAccount ea ON e.account.id = ea.id WHERE ea.userId = :userId")
    List<Email> findAccessibleByUserId(@Param("userId") Long userId);

    @Query("SELECT e FROM Email e JOIN EmailAccount ea ON e.account.id = ea.id WHERE ea.userId = :userId AND e.status = :status")
    List<Email> findAccessibleByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);

    @Query("SELECT e FROM Email e JOIN EmailAccount ea ON e.account.id = ea.id WHERE ea.userId = :userId ORDER BY e.receivedAt DESC")
    List<Email> findAccessibleByUserIdOrderByReceivedAtDesc(@Param("userId") Long userId);

    @Query("SELECT COUNT(e) FROM Email e JOIN EmailAccount ea ON e.account.id = ea.id WHERE ea.userId = :userId")
    Long countAccessibleByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(e) FROM Email e JOIN EmailAccount ea ON e.account.id = ea.id WHERE ea.userId = :userId AND e.status = :status")
    Long countAccessibleByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);

    /**
     * Znajdź emaile od nadawcy po określonej dacie (dla sprawdzania odpowiedzi)
     */
    List<Email> findBySenderContainingIgnoreCaseAndReceivedAtAfter(String sender, java.time.LocalDateTime afterDate);
}
