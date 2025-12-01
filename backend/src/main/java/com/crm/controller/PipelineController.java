package com.crm.controller;

import com.crm.model.AdminUser;
import com.crm.model.Pipeline;
import com.crm.repository.AdminUserRepository;
import com.crm.repository.PipelineRepository;
import com.crm.service.UserContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pipelines")
@RequiredArgsConstructor
public class PipelineController {

    private final PipelineRepository pipelineRepository;
    private final AdminUserRepository adminUserRepository;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<Pipeline>> getAllPipelines() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Get pipelines owned by user or shared with them
        List<Pipeline> pipelines = pipelineRepository.findAll().stream()
                .filter(p -> (p.getUserId() != null && p.getUserId().equals(userId)) ||
                            p.getSharedWithAll() ||
                            p.getSharedWithUsers().stream().anyMatch(u -> u.getId().equals(userId)))
                .collect(Collectors.toList());

        return ResponseEntity.ok(pipelines);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pipeline> getPipeline(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pipeline pipeline = pipelineRepository.findById(id)
                .orElse(null);

        if (pipeline == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user has access
        if ((pipeline.getUserId() == null || !pipeline.getUserId().equals(userId)) &&
            !pipeline.getSharedWithAll() &&
            pipeline.getSharedWithUsers().stream().noneMatch(u -> u.getId().equals(userId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(pipeline);
    }

    @GetMapping("/{id}/shared-users")
    public ResponseEntity<Map<String, Object>> getSharedUsers(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pipeline pipeline = pipelineRepository.findById(id)
                .orElse(null);

        if (pipeline == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can see shared users list
        if (pipeline.getUserId() == null || !pipeline.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("sharedWithAll", pipeline.getSharedWithAll());
        result.put("sharedUsers", pipeline.getSharedWithUsers().stream()
                .map(u -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", u.getId());
                    userInfo.put("username", u.getUsername());
                    userInfo.put("email", u.getEmail());
                    userInfo.put("firstName", u.getFirstName());
                    userInfo.put("lastName", u.getLastName());
                    return userInfo;
                })
                .collect(Collectors.toList()));

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<Map<String, String>> sharePipeline(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pipeline pipeline = pipelineRepository.findById(id)
                .orElse(null);

        if (pipeline == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can share
        if (pipeline.getUserId() == null || !pipeline.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Handle sharing with all users
        if (request.containsKey("sharedWithAll")) {
            Boolean sharedWithAll = (Boolean) request.get("sharedWithAll");
            pipeline.setSharedWithAll(sharedWithAll);
        }

        // Handle sharing with specific users
        if (request.containsKey("userIds")) {
            @SuppressWarnings("unchecked")
            List<Integer> userIds = (List<Integer>) request.get("userIds");
            Set<AdminUser> users = userIds.stream()
                    .map(uid -> adminUserRepository.findById(uid.longValue()).orElse(null))
                    .filter(u -> u != null)
                    .collect(Collectors.toSet());
            pipeline.setSharedWithUsers(users);
        }

        pipelineRepository.save(pipeline);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Pipeline sharing updated successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/share/{targetUserId}")
    public ResponseEntity<Map<String, String>> unsharePipeline(
            @PathVariable Long id,
            @PathVariable Long targetUserId) {

        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pipeline pipeline = pipelineRepository.findById(id)
                .orElse(null);

        if (pipeline == null) {
            return ResponseEntity.notFound().build();
        }

        // Only owner can unshare
        if (pipeline.getUserId() == null || !pipeline.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Remove user from shared users
        pipeline.getSharedWithUsers().removeIf(u -> u.getId().equals(targetUserId));
        pipelineRepository.save(pipeline);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User removed from pipeline sharing");
        return ResponseEntity.ok(response);
    }
}
