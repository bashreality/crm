package com.crm.service;

import com.crm.model.Campaign;
import com.crm.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class CampaignService {
    
    private final CampaignRepository campaignRepository;
    
    public List<Campaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }
    
    public Optional<Campaign> getCampaignById(Long id) {
        return campaignRepository.findById(id);
    }
    
    public Campaign createCampaign(Campaign campaign) {
        return campaignRepository.save(campaign);
    }
    
    public Campaign updateCampaign(Long id, Campaign campaignDetails) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found with id: " + id));
        
        campaign.setName(campaignDetails.getName());
        campaign.setDescription(campaignDetails.getDescription());
        campaign.setStatus(campaignDetails.getStatus());
        campaign.setTotalContacts(campaignDetails.getTotalContacts());
        campaign.setSentCount(campaignDetails.getSentCount());
        
        if ("completed".equals(campaignDetails.getStatus()) && campaign.getCompletedAt() == null) {
            campaign.setCompletedAt(LocalDateTime.now());
        }
        
        return campaignRepository.save(campaign);
    }
    
    public void deleteCampaign(Long id) {
        campaignRepository.deleteById(id);
    }
    
    public List<Campaign> getCampaignsByStatus(String status) {
        return campaignRepository.findByStatus(status);
    }
    
    public List<Campaign> searchCampaigns(String query) {
        return campaignRepository.findByNameContainingIgnoreCase(query);
    }
}
