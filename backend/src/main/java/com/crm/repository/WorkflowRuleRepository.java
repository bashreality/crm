package com.crm.repository;

import com.crm.model.WorkflowRule;
import com.crm.model.WorkflowRule.TriggerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, Long> {

    /**
     * Znajdź wszystkie aktywne reguły dla danego typu triggera
     */
    List<WorkflowRule> findByTriggerTypeAndActiveTrueOrderByPriorityAsc(TriggerType triggerType);

    /**
     * Znajdź wszystkie reguły użytkownika
     */
    List<WorkflowRule> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Znajdź aktywne reguły użytkownika
     */
    List<WorkflowRule> findByUserIdAndActiveTrueOrderByPriorityAsc(Long userId);

    /**
     * Znajdź reguły po typie triggera i użytkowniku
     */
    List<WorkflowRule> findByTriggerTypeAndUserIdAndActiveTrueOrderByPriorityAsc(
            TriggerType triggerType, Long userId);

    /**
     * Policz aktywne reguły użytkownika
     */
    long countByUserIdAndActiveTrue(Long userId);

    /**
     * Policz wykonania reguł użytkownika
     */
    @Query("SELECT SUM(r.executionCount) FROM WorkflowRule r WHERE r.userId = :userId")
    Long sumExecutionCountByUserId(@Param("userId") Long userId);

    /**
     * Zaktualizuj licznik wykonań i datę ostatniego wykonania
     */
    @Modifying
    @Query("UPDATE WorkflowRule r SET r.executionCount = r.executionCount + 1, " +
           "r.lastExecutedAt = :executedAt, r.updatedAt = :executedAt WHERE r.id = :ruleId")
    void incrementExecutionCount(@Param("ruleId") Long ruleId, @Param("executedAt") LocalDateTime executedAt);

    /**
     * Znajdź reguły po typie akcji
     */
    List<WorkflowRule> findByActionTypeAndActiveTrueOrderByPriorityAsc(WorkflowRule.ActionType actionType);

    /**
     * Znajdź wszystkie aktywne reguły globalne (bez userId)
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.active = true AND r.userId IS NULL ORDER BY r.priority ASC")
    List<WorkflowRule> findGlobalActiveRules();

    /**
     * Znajdź reguły triggera (globalne + użytkownika)
     */
    @Query("SELECT r FROM WorkflowRule r WHERE r.triggerType = :triggerType AND r.active = true " +
           "AND (r.userId IS NULL OR r.userId = :userId) ORDER BY r.priority ASC")
    List<WorkflowRule> findActiveRulesForTrigger(
            @Param("triggerType") TriggerType triggerType, 
            @Param("userId") Long userId);
}

