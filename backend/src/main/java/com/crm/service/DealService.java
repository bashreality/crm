package com.crm.service;

import com.crm.model.Deal;
import com.crm.model.Pipeline;
import com.crm.model.PipelineStage;
import com.crm.model.Contact;
import com.crm.repository.DealRepository;
import com.crm.repository.PipelineRepository;
import com.crm.repository.PipelineStageRepository;
import com.crm.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DealService {

    private final DealRepository dealRepository;
    private final PipelineRepository pipelineRepository;
    private final PipelineStageRepository stageRepository;
    private final ContactRepository contactRepository;

    public List<Pipeline> getAllPipelines() {
        return pipelineRepository.findAll();
    }

    public Pipeline getDefaultPipeline() {
        return pipelineRepository.findByIsDefaultTrue()
                .orElseThrow(() -> new RuntimeException("No default pipeline found"));
    }

    public List<Deal> getDealsByPipeline(Long pipelineId) {
        return dealRepository.findByPipelineId(pipelineId);
    }

    @Transactional
    public Deal createDeal(Deal deal) {
        if (deal.getPipeline() == null || deal.getPipeline().getId() == null) {
            deal.setPipeline(getDefaultPipeline());
        } else {
            // Fetch full pipeline to ensure we have stages
            Pipeline pipeline = pipelineRepository.findById(deal.getPipeline().getId())
                    .orElseThrow(() -> new RuntimeException("Pipeline not found"));
            deal.setPipeline(pipeline);
        }
        
        // Fetch full contact
        if (deal.getContact() != null && deal.getContact().getId() != null) {
            Contact contact = contactRepository.findById(deal.getContact().getId())
                    .orElseThrow(() -> new RuntimeException("Contact not found"));
            deal.setContact(contact);
        } else {
            throw new IllegalArgumentException("Contact is required");
        }
        
        if (deal.getStage() == null) {
            // Set first stage of pipeline
            Pipeline pipeline = deal.getPipeline();
            
            if (pipeline.getStages() != null && !pipeline.getStages().isEmpty()) {
                deal.setStage(pipeline.getStages().get(0));
            } else {
                throw new RuntimeException("Pipeline has no stages");
            }
        }
        
        return dealRepository.save(deal);
    }

    @Transactional
    public Deal updateDealStage(Long dealId, Long stageId) {
        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found"));
        
        PipelineStage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new RuntimeException("Stage not found"));
        
        deal.setStage(stage);
        
        // Check if stage implies won/lost
        if ("Closed Won".equalsIgnoreCase(stage.getName())) {
            deal.setStatus("won");
            deal.setWonAt(LocalDateTime.now());
        } else if ("Closed Lost".equalsIgnoreCase(stage.getName())) {
            deal.setStatus("lost");
            deal.setLostAt(LocalDateTime.now());
        } else {
            deal.setStatus("open");
        }
        
        return dealRepository.save(deal);
    }

    @Transactional
    public void deleteDeal(Long id) {
        dealRepository.deleteById(id);
    }

    // Pipeline Management
    @Transactional
    public Pipeline createPipeline(Pipeline pipeline) {
        pipeline.setCreatedAt(LocalDateTime.now());
        if (pipeline.getActive() == null) {
            pipeline.setActive(true);
        }
        Pipeline savedPipeline = pipelineRepository.save(pipeline);

        // Add default stages
        List<PipelineStage> defaultStages = List.of(
            new PipelineStage(null, savedPipeline, "Nowy", 0, "#3B82F6", 10.0),
            new PipelineStage(null, savedPipeline, "W trakcie", 1, "#F59E0B", 50.0),
            new PipelineStage(null, savedPipeline, "Negocjacje", 2, "#8B5CF6", 80.0),
            new PipelineStage(null, savedPipeline, "Zamknięte (Wygrana)", 3, "#10B981", 100.0),
            new PipelineStage(null, savedPipeline, "Zamknięte (Przegrana)", 4, "#EF4444", 0.0)
        );
        List<PipelineStage> savedStages = stageRepository.saveAll(defaultStages);
        
        // Ustaw zapisane stages bezpośrednio w pipeline
        savedPipeline.setStages(savedStages);

        return savedPipeline;
    }

    @Transactional
    public Pipeline updatePipeline(Long id, Pipeline pipelineData) {
        Pipeline pipeline = pipelineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pipeline not found"));

        pipeline.setName(pipelineData.getName());
        pipeline.setDescription(pipelineData.getDescription());
        pipeline.setActive(pipelineData.getActive());
        pipeline.setIsDefault(pipelineData.getIsDefault());
        pipeline.setUpdatedAt(LocalDateTime.now());

        return pipelineRepository.save(pipeline);
    }

    @Transactional
    public void deletePipeline(Long id) {
        Pipeline pipeline = pipelineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pipeline not found"));

        // Usuń wszystkie deals powiązane z tym pipeline (poprzez stages)
        List<PipelineStage> stages = stageRepository.findByPipelineId(id);
        for (PipelineStage stage : stages) {
            List<Deal> deals = dealRepository.findByStageId(stage.getId());
            dealRepository.deleteAll(deals);
        }

        // Usuń wszystkie stages powiązane z tym pipeline
        stageRepository.deleteAll(stages);

        // Usuń pipeline
        pipelineRepository.deleteById(id);
    }

    // Stage Management
    @Transactional
    public PipelineStage createStage(Long pipelineId, PipelineStage stage) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new RuntimeException("Pipeline not found"));

        stage.setPipeline(pipeline);
        return stageRepository.save(stage);
    }

    @Transactional
    public PipelineStage updateStage(Long stageId, PipelineStage stageData) {
        PipelineStage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new RuntimeException("Stage not found"));

        stage.setName(stageData.getName());
        stage.setColor(stageData.getColor());
        stage.setPosition(stageData.getPosition());
        stage.setProbability(stageData.getProbability());

        return stageRepository.save(stage);
    }

    @Transactional
    public void deleteStage(Long stageId) {
        stageRepository.deleteById(stageId);
    }

    public List<PipelineStage> getStagesByPipeline(Long pipelineId) {
        return stageRepository.findByPipelineIdOrderByPosition(pipelineId);
    }
}
