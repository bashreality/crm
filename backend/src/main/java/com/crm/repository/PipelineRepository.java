package com.crm.repository;

import com.crm.model.Pipeline;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineRepository extends JpaRepository<Pipeline, Long> {
    
    Optional<Pipeline> findByIsDefaultTrue();
    
    // Load pipeline with stages eagerly
    @EntityGraph(attributePaths = {"stages"})
    @Query("SELECT p FROM Pipeline p WHERE p.isDefault = true")
    Optional<Pipeline> findByIsDefaultTrueWithStages();
    
    @EntityGraph(attributePaths = {"stages"})
    @Query("SELECT p FROM Pipeline p WHERE p.id = :id")
    Optional<Pipeline> findByIdWithStages(Long id);
    
    @EntityGraph(attributePaths = {"stages"})
    @Query("SELECT p FROM Pipeline p")
    List<Pipeline> findAllWithStages();
    
    // User-specific queries
    List<Pipeline> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"stages"})
    @Query("SELECT DISTINCT p FROM Pipeline p LEFT JOIN p.sharedWithUsers u WHERE p.userId = :userId OR p.sharedWithAll = true OR u.id = :userId")
    List<Pipeline> findAccessibleByUserIdWithStages(@Param("userId") Long userId);
}
