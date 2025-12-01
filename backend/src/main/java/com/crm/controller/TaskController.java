package com.crm.controller;

import com.crm.model.Task;
import com.crm.model.Activity;
import com.crm.repository.TaskRepository;
import com.crm.repository.ActivityRepository;
import com.crm.service.UserContextService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private UserContextService userContextService;

    @GetMapping
    public List<Task> getAllTasks() {
        Long userId = userContextService.getCurrentUserId();
        if (userId != null) {
            return taskRepository.findByUserIdOrderByDueDateAsc(userId);
        }
        return List.of();
    }

    @GetMapping("/pending")
    public List<Task> getPendingTasks() {
        Long userId = userContextService.getCurrentUserId();
        if (userId != null) {
            return taskRepository.findByUserIdAndCompletedFalseOrderByDueDateAsc(userId);
        }
        return List.of();
    }

    @GetMapping("/contact/{contactId}")
    public List<Task> getTasksByContact(@PathVariable Long contactId) {
        Long userId = userContextService.getCurrentUserId();
        if (userId != null) {
            return taskRepository.findByUserIdAndContactIdOrderByDueDateAsc(userId, contactId);
        }
        return List.of();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        Long userId = userContextService.getCurrentUserId();
        if (userId != null) {
            task.setUserId(userId);
        } else {
            // For testing - set to admin ID (1) if null
            task.setUserId(1L);
        }
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @RequestBody Task taskDetails) {
        Long userId = userContextService.getCurrentUserId();
        return taskRepository.findById(id)
                .map(task -> {
                    // Check if user owns this task
                    if (userId != null && !userId.equals(task.getUserId())) {
                        return ResponseEntity.status(403).<Task>build();
                    }
                    task.setTitle(taskDetails.getTitle());
                    task.setDescription(taskDetails.getDescription());
                    task.setType(taskDetails.getType());
                    task.setDueDate(taskDetails.getDueDate());
                    task.setPriority(taskDetails.getPriority());
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Task> completeTask(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        return taskRepository.findById(id)
                .map(task -> {
                    // Check if user owns this task
                    if (userId != null && !userId.equals(task.getUserId())) {
                        return ResponseEntity.status(403).<Task>build();
                    }
                    task.setCompleted(true);
                    task.setCompletedAt(LocalDateTime.now());
                    Task completedTask = taskRepository.save(task);

                    // Create activity
                    Activity activity = new Activity();
                    activity.setType("task_completed");
                    activity.setTitle("Task completed: " + task.getTitle());
                    activity.setDescription("Task of type: " + task.getType());
                    activity.setContact(task.getContact());
                    activity.setUserId(userId);
                    activityRepository.save(activity);

                    return ResponseEntity.ok(completedTask);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        Long userId = userContextService.getCurrentUserId();
        return taskRepository.findById(id)
                .map(task -> {
                    // Check if user owns this task
                    if (userId != null && !userId.equals(task.getUserId())) {
                        return ResponseEntity.status(403).<Void>build();
                    }
                    taskRepository.delete(task);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
