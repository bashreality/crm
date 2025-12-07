package com.crm.repository;

import com.crm.model.Deal;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {
    
    // Methods with EntityGraph to load relations eagerly when needed
    @EntityGraph(attributePaths = {"contact", "pipeline", "stage"})
    @Query("SELECT d FROM Deal d WHERE d.pipeline.id = :pipelineId")
    List<Deal> findByPipelineIdWithRelations(@Param("pipelineId") Long pipelineId);
    
    @EntityGraph(attributePaths = {"contact", "pipeline", "stage"})
    Optional<Deal> findWithRelationsById(Long id);
    
    List<Deal> findByPipelineId(Long pipelineId);
    List<Deal> findByStageId(Long stageId);
    List<Deal> findByContactId(Long contactId);
    List<Deal> findByContactIdAndStatus(Long contactId, String status);
    List<Deal> findByStatus(String status);

    // User-specific queries
    List<Deal> findByUserId(Long userId);
    List<Deal> findByUserIdAndStatus(Long userId, String status);
    
    @EntityGraph(attributePaths = {"contact", "pipeline", "stage"})
    @Query("SELECT d FROM Deal d WHERE d.userId = :userId AND d.pipeline.id = :pipelineId")
    List<Deal> findByUserIdAndPipelineIdWithRelations(@Param("userId") Long userId, @Param("pipelineId") Long pipelineId);
    
    List<Deal> findByUserIdAndPipelineId(Long userId, Long pipelineId);
    List<Deal> findByUserIdAndContactId(Long userId, Long contactId);
    Long countByUserId(Long userId);
    Long countByUserIdAndStatus(Long userId, String status);
}
