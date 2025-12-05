package com.crm.repository;

import com.crm.model.Unsubscribe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UnsubscribeRepository extends JpaRepository<Unsubscribe, Long> {

    Optional<Unsubscribe> findByEmail(String email);
    
    Optional<Unsubscribe> findByToken(String token);
    
    boolean existsByEmail(String email);
    
    long countByCampaignId(Long campaignId);
}

