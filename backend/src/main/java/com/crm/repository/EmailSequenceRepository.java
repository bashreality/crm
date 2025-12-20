package com.crm.repository;

import com.crm.model.EmailSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmailSequenceRepository extends JpaRepository<EmailSequence, Long> {
    List<EmailSequence> findByActiveTrue();
    List<EmailSequence> findByNameContainingIgnoreCase(String name);
    List<EmailSequence> findByUserId(Long userId);
    List<EmailSequence> findByUserIdAndActiveTrue(Long userId);
    long countByEmailAccount_Id(Long accountId);

    // Queries with sharing support
    @Query("SELECT DISTINCT s FROM EmailSequence s LEFT JOIN s.sharedWithUsers u " +
           "WHERE s.userId = :userId OR s.sharedWithAll = true OR u.id = :userId")
    List<EmailSequence> findAccessibleByUserId(@Param("userId") Long userId);

    @Query("SELECT DISTINCT s FROM EmailSequence s LEFT JOIN s.sharedWithUsers u " +
           "WHERE s.active = true AND (s.userId = :userId OR s.sharedWithAll = true OR u.id = :userId)")
    List<EmailSequence> findAccessibleByUserIdAndActiveTrue(@Param("userId") Long userId);
}
