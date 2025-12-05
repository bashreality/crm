package com.crm.repository;

import com.crm.model.CampaignRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {

    List<CampaignRecipient> findByCampaignId(Long campaignId);
    
    Page<CampaignRecipient> findByCampaignId(Long campaignId, Pageable pageable);
    
    List<CampaignRecipient> findByCampaignIdAndStatus(Long campaignId, String status);
    
    Page<CampaignRecipient> findByCampaignIdAndStatus(Long campaignId, String status, Pageable pageable);
    
    long countByCampaignId(Long campaignId);
    
    long countByCampaignIdAndStatus(Long campaignId, String status);
    
    Optional<CampaignRecipient> findByCampaignIdAndContactId(Long campaignId, Long contactId);
    
    Optional<CampaignRecipient> findByTrackingId(String trackingId);
    
    boolean existsByCampaignIdAndContactId(Long campaignId, Long contactId);
    
    /**
     * Pobierz następnych odbiorców do wysłania (pending, z limitem)
     */
    @Query("SELECT cr FROM CampaignRecipient cr WHERE cr.campaign.id = :campaignId " +
           "AND cr.status = 'pending' ORDER BY cr.createdAt ASC")
    List<CampaignRecipient> findPendingRecipients(@Param("campaignId") Long campaignId, Pageable pageable);
    
    /**
     * Policz wysłane w ciągu ostatniej godziny
     */
    @Query("SELECT COUNT(cr) FROM CampaignRecipient cr WHERE cr.campaign.id = :campaignId " +
           "AND cr.status = 'sent' AND cr.sentAt >= :sinceTime")
    long countSentSince(@Param("campaignId") Long campaignId, 
                        @Param("sinceTime") java.time.LocalDateTime sinceTime);
    
    /**
     * Usuń wszystkich odbiorców kampanii
     */
    @Modifying
    void deleteByCampaignId(Long campaignId);

    /**
     * Znajdź odbiorców dla kontaktu (dla analizy engagement)
     */
    List<CampaignRecipient> findByContactId(Long contactId);
}

