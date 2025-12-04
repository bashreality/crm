package com.crm.repository;

import com.crm.model.EmailTemplateTheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailTemplateThemeRepository extends JpaRepository<EmailTemplateTheme, Long> {
    
    // Find system themes
    List<EmailTemplateTheme> findByIsSystemTrue();
    
    // Find user themes
    List<EmailTemplateTheme> findByUserId(Long userId);
    
    // Find all accessible themes (system + user's own)
    @Query("SELECT t FROM EmailTemplateTheme t WHERE t.isSystem = true OR t.userId = :userId ORDER BY t.isSystem DESC, t.name ASC")
    List<EmailTemplateTheme> findAccessibleByUserId(@Param("userId") Long userId);
    
    // Check if theme is in use
    @Query("SELECT COUNT(t) FROM EmailTemplate t WHERE t.theme.id = :themeId")
    Long countTemplatesUsingTheme(@Param("themeId") Long themeId);
}