package com.crm.repository;

import com.crm.model.WorkflowExecution;
import com.crm.model.WorkflowExecution.ExecutionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, Long> {

    /**
     * Znajdź wykonania dla danej reguły
     */
    List<WorkflowExecution> findByRuleIdOrderByCreatedAtDesc(Long ruleId);

    /**
     * Znajdź wykonania dla danej reguły (z paginacją)
     */
    Page<WorkflowExecution> findByRuleIdOrderByCreatedAtDesc(Long ruleId, Pageable pageable);

    /**
     * Znajdź wykonania dla kontaktu
     */
    List<WorkflowExecution> findByContactIdOrderByCreatedAtDesc(Long contactId);

    /**
     * Policz wykonania według statusu
     */
    long countByRuleIdAndStatus(Long ruleId, ExecutionStatus status);

    /**
     * Policz wykonania w okresie
     */
    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.rule.id = :ruleId " +
           "AND e.createdAt BETWEEN :startDate AND :endDate")
    long countByRuleIdAndDateRange(
            @Param("ruleId") Long ruleId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Sprawdź czy istnieje wykonanie dla klucza (zapobieganie duplikatom)
     */
    @Query("SELECT COUNT(e) > 0 FROM WorkflowExecution e WHERE e.rule.id = :ruleId " +
           "AND e.contact.id = :contactId AND e.email.id = :emailId AND e.status = 'COMPLETED'")
    boolean existsCompletedExecution(
            @Param("ruleId") Long ruleId,
            @Param("contactId") Long contactId,
            @Param("emailId") Long emailId);

    /**
     * Sprawdź czy istnieje wykonanie dla reguły i kontaktu
     */
    @Query("SELECT COUNT(e) > 0 FROM WorkflowExecution e WHERE e.rule.id = :ruleId " +
           "AND e.contact.id = :contactId AND e.status = 'COMPLETED'")
    boolean existsCompletedExecutionForContact(
            @Param("ruleId") Long ruleId,
            @Param("contactId") Long contactId);

    /**
     * Znajdź ostatnie N wykonań (dla dashboard)
     */
    List<WorkflowExecution> findTop20ByOrderByCreatedAtDesc();

    /**
     * Znajdź wykonania użytkownika (przez rule.userId)
     */
    @Query("SELECT e FROM WorkflowExecution e WHERE e.rule.userId = :userId ORDER BY e.createdAt DESC")
    Page<WorkflowExecution> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    /**
     * Statystyki wykonań w okresie
     */
    @Query("SELECT e.status, COUNT(e) FROM WorkflowExecution e " +
           "WHERE e.rule.userId = :userId AND e.createdAt >= :since " +
           "GROUP BY e.status")
    List<Object[]> getExecutionStatsByUser(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    /**
     * Średni czas wykonania reguły
     */
    @Query("SELECT AVG(e.executionTimeMs) FROM WorkflowExecution e " +
           "WHERE e.rule.id = :ruleId AND e.executionTimeMs IS NOT NULL")
    Double getAverageExecutionTime(@Param("ruleId") Long ruleId);

    /**
     * Znajdź nieudane wykonania do ponowienia
     */
    List<WorkflowExecution> findByStatusAndCreatedAtAfterOrderByCreatedAtAsc(
            ExecutionStatus status, LocalDateTime since);
}

