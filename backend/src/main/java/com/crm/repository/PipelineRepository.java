package com.crm.repository;

import com.crm.model.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PipelineRepository extends JpaRepository<Pipeline, Long> {
    Optional<Pipeline> findByIsDefaultTrue();
}
