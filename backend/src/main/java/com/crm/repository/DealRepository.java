package com.crm.repository;

import com.crm.model.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {
    List<Deal> findByPipelineId(Long pipelineId);
    List<Deal> findByStageId(Long stageId);
    List<Deal> findByContactId(Long contactId);
    List<Deal> findByStatus(String status);

    // User-specific queries
    List<Deal> findByUserId(Long userId);
    List<Deal> findByUserIdAndStatus(Long userId, String status);
    List<Deal> findByUserIdAndPipelineId(Long userId, Long pipelineId);
    List<Deal> findByUserIdAndContactId(Long userId, Long contactId);
    Long countByUserId(Long userId);
    Long countByUserIdAndStatus(Long userId, String status);
}
