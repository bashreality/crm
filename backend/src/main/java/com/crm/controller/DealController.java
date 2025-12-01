package com.crm.controller;

import com.crm.model.Deal;
import com.crm.model.Pipeline;
import com.crm.service.DealService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
public class DealController {

    private final DealService dealService;

    @GetMapping("/pipelines")
    public ResponseEntity<List<Pipeline>> getPipelines() {
        return ResponseEntity.ok(dealService.getAllPipelines());
    }

    @GetMapping("/pipeline/{id}")
    public ResponseEntity<List<Deal>> getDeals(@PathVariable Long id) {
        return ResponseEntity.ok(dealService.getDealsByPipeline(id));
    }

    @PostMapping
    public ResponseEntity<Deal> createDeal(@RequestBody Deal deal) {
        return ResponseEntity.ok(dealService.createDeal(deal));
    }

    @PutMapping("/{id}/stage")
    public ResponseEntity<Deal> updateStage(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        Long stageId = payload.get("stageId");
        return ResponseEntity.ok(dealService.updateDealStage(id, stageId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable Long id) {
        dealService.deleteDeal(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deal> updateDeal(@PathVariable Long id, @RequestBody Deal deal) {
        // For now, we only support updating basic deal info
        // Stage updates are handled by /stage endpoint
        return ResponseEntity.ok(dealService.createDeal(deal));
    }

    // Pipeline Management Endpoints
    @PostMapping("/pipelines")
    public ResponseEntity<Pipeline> createPipeline(@RequestBody Pipeline pipeline) {
        return ResponseEntity.ok(dealService.createPipeline(pipeline));
    }

    @PutMapping("/pipelines/{id}")
    public ResponseEntity<Pipeline> updatePipeline(@PathVariable Long id, @RequestBody Pipeline pipeline) {
        return ResponseEntity.ok(dealService.updatePipeline(id, pipeline));
    }

    @DeleteMapping("/pipelines/{id}")
    public ResponseEntity<Void> deletePipeline(@PathVariable Long id) {
        dealService.deletePipeline(id);
        return ResponseEntity.ok().build();
    }

    // Stage Management Endpoints
    @GetMapping("/pipelines/{pipelineId}/stages")
    public ResponseEntity<List<com.crm.model.PipelineStage>> getStages(@PathVariable Long pipelineId) {
        return ResponseEntity.ok(dealService.getStagesByPipeline(pipelineId));
    }

    @PostMapping("/pipelines/{pipelineId}/stages")
    public ResponseEntity<com.crm.model.PipelineStage> createStage(
            @PathVariable Long pipelineId,
            @RequestBody com.crm.model.PipelineStage stage) {
        return ResponseEntity.ok(dealService.createStage(pipelineId, stage));
    }

    @PutMapping("/stages/{id}")
    public ResponseEntity<com.crm.model.PipelineStage> updateStage(
            @PathVariable Long id,
            @RequestBody com.crm.model.PipelineStage stage) {
        return ResponseEntity.ok(dealService.updateStage(id, stage));
    }

    @DeleteMapping("/stages/{id}")
    public ResponseEntity<Void> deleteStage(@PathVariable Long id) {
        dealService.deleteStage(id);
        return ResponseEntity.ok().build();
    }
}
