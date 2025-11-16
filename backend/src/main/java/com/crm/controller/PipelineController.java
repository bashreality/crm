package com.crm.controller;

import com.crm.model.Pipeline;
import com.crm.model.PipelineStage;
import com.crm.repository.PipelineRepository;
import com.crm.repository.PipelineStageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pipelines")
@CrossOrigin(origins = "*")
public class PipelineController {

    @Autowired
    private PipelineRepository pipelineRepository;

    @Autowired
    private PipelineStageRepository stageRepository;

    @GetMapping
    public List<Pipeline> getAllPipelines() {
        return pipelineRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pipeline> getPipelineById(@PathVariable Long id) {
        return pipelineRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/default")
    public ResponseEntity<Pipeline> getDefaultPipeline() {
        return pipelineRepository.findByIsDefaultTrue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/stages")
    public List<PipelineStage> getPipelineStages(@PathVariable Long id) {
        return stageRepository.findByPipelineIdOrderByPositionAsc(id);
    }

    @PostMapping
    public Pipeline createPipeline(@RequestBody Pipeline pipeline) {
        return pipelineRepository.save(pipeline);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pipeline> updatePipeline(@PathVariable Long id, @RequestBody Pipeline pipelineDetails) {
        return pipelineRepository.findById(id)
                .map(pipeline -> {
                    pipeline.setName(pipelineDetails.getName());
                    pipeline.setDescription(pipelineDetails.getDescription());
                    pipeline.setActive(pipelineDetails.getActive());
                    return ResponseEntity.ok(pipelineRepository.save(pipeline));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePipeline(@PathVariable Long id) {
        return pipelineRepository.findById(id)
                .map(pipeline -> {
                    pipelineRepository.delete(pipeline);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
