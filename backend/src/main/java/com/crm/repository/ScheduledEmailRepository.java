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

    ScheduledEmail findFirstByExecutionSequenceIdAndStatusOrderByScheduledForAsc(Long sequenceId, String status);

    @Query("SELECT COUNT(s) FROM ScheduledEmail s WHERE s.execution.sequence.id = :sequenceId")
    long countBySequenceId(Long sequenceId);

    @Query("SELECT COUNT(s) FROM ScheduledEmail s WHERE s.execution.sequence.id = :sequenceId AND s.status = :status")
    long countBySequenceIdAndStatus(Long sequenceId, String status);

    @Query("SELECT COUNT(s) FROM ScheduledEmail s WHERE s.execution.sequence.id = :sequenceId AND s.scheduledFor BETWEEN :start AND :end")
    long countScheduledForSequenceBetween(Long sequenceId, LocalDateTime start, LocalDateTime end);

    long countByStatus(String status);

    void deleteByStepId(Long stepId);

    /**
     * Znajdź wysłane emaile bez odpowiedzi dla konkretnej sekwencji
     */
    @Query("SELECT s FROM ScheduledEmail s WHERE s.execution.sequence.id = :sequenceId " +
           "AND s.status = 'sent' AND s.sentAt < :cutoffDate " +
           "AND NOT EXISTS (SELECT 1 FROM Email e WHERE e.sender LIKE CONCAT('%', s.recipientEmail, '%') " +
           "AND e.receivedAt > s.sentAt)")
    List<ScheduledEmail> findSentEmailsWithoutReply(Long sequenceId, LocalDateTime cutoffDate);

    /**
     * Znajdź wszystkie wysłane emaile bez odpowiedzi (wszystkie sekwencje)
     */
    @Query("SELECT s FROM ScheduledEmail s WHERE s.status = 'sent' AND s.sentAt < :cutoffDate " +
           "AND NOT EXISTS (SELECT 1 FROM Email e WHERE e.sender LIKE CONCAT('%', s.recipientEmail, '%') " +
           "AND e.receivedAt > s.sentAt)")
    List<ScheduledEmail> findAllSentEmailsWithoutReply(LocalDateTime cutoffDate);
}
