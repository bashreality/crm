package com.crm.repository;

import com.crm.model.EmailTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
    
    // Find by user
    List<EmailTemplate> findByUserId(Long userId);
    Page<EmailTemplate> findByUserId(Long userId, Pageable pageable);
    
    // Find by category
    List<EmailTemplate> findByUserIdAndCategory(Long userId, String category);
    Page<EmailTemplate> findByUserIdAndCategory(Long userId, String category, Pageable pageable);
    
    // Find favorites
    List<EmailTemplate> findByUserIdAndIsFavoriteTrue(Long userId);
    
    // Search by name
    @Query("SELECT t FROM EmailTemplate t WHERE t.userId = :userId AND LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<EmailTemplate> searchByName(@Param("userId") Long userId, @Param("query") String query);
    
    // Most used templates
    @Query("SELECT t FROM EmailTemplate t WHERE t.userId = :userId ORDER BY t.usageCount DESC")
    List<EmailTemplate> findMostUsed(@Param("userId") Long userId, Pageable pageable);
    
    // Count by category
    @Query("SELECT COUNT(t) FROM EmailTemplate t WHERE t.userId = :userId AND t.category = :category")
    Long countByUserIdAndCategory(@Param("userId") Long userId, @Param("category") String category);
    
    // Find by theme
    List<EmailTemplate> findByThemeId(Long themeId);
}