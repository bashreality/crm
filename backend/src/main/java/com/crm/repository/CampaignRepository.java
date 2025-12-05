package com.crm.repository;

import com.crm.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    List<Campaign> findByStatus(String status);
    List<Campaign> findByNameContainingIgnoreCase(String name);
    Long countByStatus(String status);
    
    // User-specific queries
    List<Campaign> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Campaign> findByUserIdAndStatus(Long userId, String status);
    Long countByUserId(Long userId);
    Long countByUserIdAndStatus(Long userId, String status);
    
    // Scheduled campaigns ready to send
    @Query("SELECT c FROM Campaign c WHERE c.status = 'scheduled' " +
           "AND c.scheduledAt IS NOT NULL AND c.scheduledAt <= :now")
    List<Campaign> findScheduledCampaignsReady(@Param("now") LocalDateTime now);
}
