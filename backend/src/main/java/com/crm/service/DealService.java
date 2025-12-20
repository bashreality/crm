package com.crm.service;

import com.crm.model.Deal;
import com.crm.model.Pipeline;
import com.crm.model.PipelineStage;
import com.crm.model.Contact;
import com.crm.repository.DealRepository;
import com.crm.repository.PipelineRepository;
import com.crm.repository.PipelineStageRepository;
import com.crm.repository.ContactRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class DealService {

    private final DealRepository dealRepository;
    private final PipelineRepository pipelineRepository;
    private final PipelineStageRepository stageRepository;
    private final ContactRepository contactRepository;
    private final WorkflowAutomationService workflowAutomationService;
    private final UserContextService userContextService;

    @Autowired
    public DealService(
            DealRepository dealRepository,
            PipelineRepository pipelineRepository,
            PipelineStageRepository stageRepository,
            ContactRepository contactRepository,
            @Lazy WorkflowAutomationService workflowAutomationService,
            UserContextService userContextService) {
        this.dealRepository = dealRepository;
        this.pipelineRepository = pipelineRepository;
        this.stageRepository = stageRepository;
        this.contactRepository = contactRepository;
        this.workflowAutomationService = workflowAutomationService;
        this.userContextService = userContextService;
    }

    public List<Pipeline> getAllPipelines() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            log.warn("No authenticated user found when fetching pipelines");
            return List.of();
        }
        log.debug("Fetching pipelines for user {}", userId);
        return pipelineRepository.findAccessibleByUserIdWithStages(userId);
    }

    public Pipeline getDefaultPipeline() {
        return pipelineRepository.findByIsDefaultTrueWithStages()
                .orElseThrow(() -> new RuntimeException("No default pipeline found"));
    }

    public List<Deal> getDealsByPipeline(Long pipelineId) {
        return dealRepository.findByPipelineIdWithRelations(pipelineId);
    }

    @Transactional(readOnly = true)
    public List<Deal> getAllDeals() {
        return dealRepository.findAllWithRelations();
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
        Deal deal = dealRepository.findWithRelationsById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found"));
        
        PipelineStage oldStage = deal.getStage();
        PipelineStage newStage = stageRepository.findById(stageId)
                .orElseThrow(() -> new RuntimeException("Stage not found"));
        
        // Skip if stage hasn't changed
        if (oldStage != null && oldStage.getId().equals(newStage.getId())) {
            return deal;
        }
        
        deal.setStage(newStage);
        
        String oldStatus = deal.getStatus();
        boolean wasWon = "won".equals(oldStatus);
        boolean wasLost = "lost".equals(oldStatus);
        
        // Check if stage implies won/lost
        if ("Closed Won".equalsIgnoreCase(newStage.getName()) ||
            "Zamknięte (Wygrana)".equalsIgnoreCase(newStage.getName())) {
            deal.setStatus("won");
            deal.setWonAt(LocalDateTime.now());
        } else if ("Closed Lost".equalsIgnoreCase(newStage.getName()) ||
                   "Zamknięte (Przegrana)".equalsIgnoreCase(newStage.getName())) {
            deal.setStatus("lost");
            deal.setLostAt(LocalDateTime.now());
        } else {
            deal.setStatus("open");
        }
        
        Deal savedDeal = dealRepository.save(deal);
        
        // Trigger workflow automations
        try {
            // Always trigger stage changed
            workflowAutomationService.handleDealStageChanged(savedDeal, oldStage, newStage);
            log.debug("Triggered DEAL_STAGE_CHANGED workflow for deal {}", savedDeal.getId());
            
            // Trigger won/lost if status changed
            if ("won".equals(savedDeal.getStatus()) && !wasWon) {
                workflowAutomationService.handleDealWon(savedDeal);
                log.debug("Triggered DEAL_WON workflow for deal {}", savedDeal.getId());
            } else if ("lost".equals(savedDeal.getStatus()) && !wasLost) {
                workflowAutomationService.handleDealLost(savedDeal);
                log.debug("Triggered DEAL_LOST workflow for deal {}", savedDeal.getId());
            }
        } catch (Exception e) {
            log.error("Error triggering deal workflow for deal {}: {}",
                     savedDeal.getId(), e.getMessage(), e);
        }
        
        return savedDeal;
    }

    @Transactional
    public void deleteDeal(Long id) {
        dealRepository.deleteById(id);
    }

    // Pipeline Management
    @Transactional
    @CacheEvict(value = "pipelines", allEntries = true)
    public Pipeline createPipeline(Pipeline pipeline) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            throw new RuntimeException("User must be authenticated to create a pipeline");
        }

        pipeline.setUserId(userId);
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
    @CacheEvict(value = "pipelines", allEntries = true)
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
    @CacheEvict(value = "pipelines", allEntries = true)
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
    @CacheEvict(value = "pipelines", allEntries = true)
    public PipelineStage createStage(Long pipelineId, PipelineStage stage) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new RuntimeException("Pipeline not found"));

        stage.setPipeline(pipeline);
        return stageRepository.save(stage);
    }

    @Transactional
    @CacheEvict(value = "pipelines", allEntries = true)
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
    @CacheEvict(value = "pipelines", allEntries = true)
    public void deleteStage(Long stageId) {
        stageRepository.deleteById(stageId);
    }

    @Transactional(readOnly = true)
    public List<PipelineStage> getStagesByPipeline(Long pipelineId) {
        return stageRepository.findByPipelineIdOrderByPosition(pipelineId);
    }
}
