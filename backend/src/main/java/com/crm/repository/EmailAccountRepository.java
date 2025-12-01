package com.crm.repository;

import com.crm.model.EmailAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailAccountRepository extends JpaRepository<EmailAccount, Long> {

    List<EmailAccount> findByEnabledTrue();

    Optional<EmailAccount> findByEmailAddress(String emailAddress);

    boolean existsByEmailAddress(String emailAddress);

    // User-specific queries
    List<EmailAccount> findByUserId(Long userId);
    List<EmailAccount> findByUserIdAndEnabledTrue(Long userId);
    Optional<EmailAccount> findByUserIdAndId(Long userId, Long id);
    Long countByUserId(Long userId);
}
