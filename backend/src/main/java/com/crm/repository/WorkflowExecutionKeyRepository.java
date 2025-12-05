package com.crm.repository;

import com.crm.model.WorkflowExecutionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface WorkflowExecutionKeyRepository extends JpaRepository<WorkflowExecutionKey, Long> {

    /**
     * Sprawdź czy klucz wykonania istnieje
     */
    boolean existsByRuleIdAndExecutionKey(Long ruleId, String executionKey);

    /**
     * Usuń stare klucze (czyszczenie)
     */
    @Modifying
    @Query("DELETE FROM WorkflowExecutionKey k WHERE k.createdAt < :before")
    int deleteOlderThan(@Param("before") LocalDateTime before);

    /**
     * Usuń klucze dla reguły
     */
    void deleteByRuleId(Long ruleId);
}

