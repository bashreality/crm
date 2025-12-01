package com.crm.repository;

import com.crm.model.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineStageRepository extends JpaRepository<PipelineStage, Long> {
    List<PipelineStage> findByPipelineIdOrderByPosition(Long pipelineId);
}
