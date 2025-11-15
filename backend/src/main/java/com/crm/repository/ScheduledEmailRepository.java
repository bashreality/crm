package com.crm.repository;

import com.crm.model.ScheduledEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduledEmailRepository extends JpaRepository<ScheduledEmail, Long> {
    List<ScheduledEmail> findByStatus(String status);

    @Query("SELECT s FROM ScheduledEmail s WHERE s.status = 'pending' AND s.scheduledFor <= :now ORDER BY s.scheduledFor ASC")
    List<ScheduledEmail> findPendingEmailsDueBy(LocalDateTime now);

    List<ScheduledEmail> findByExecutionId(Long executionId);
}
