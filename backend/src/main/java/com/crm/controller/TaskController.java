package com.crm.controller;

import com.crm.model.Task;
import com.crm.model.Activity;
import com.crm.repository.TaskRepository;
import com.crm.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @GetMapping("/pending")
    public List<Task> getPendingTasks() {
        return taskRepository.findByCompletedFalseOrderByDueDateAsc();
    }

    @GetMapping("/contact/{contactId}")
    public List<Task> getTasksByContact(@PathVariable Long contactId) {
        return taskRepository.findByContactIdOrderByDueDateAsc(contactId);
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id)
                .map(task -> {
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
        return taskRepository.findById(id)
                .map(task -> {
                    task.setCompleted(true);
                    task.setCompletedAt(LocalDateTime.now());
                    Task completedTask = taskRepository.save(task);

                    // Create activity
                    Activity activity = new Activity();
                    activity.setType("task_completed");
                    activity.setTitle("Task completed: " + task.getTitle());
                    activity.setDescription("Task of type: " + task.getType());
                    activity.setContact(task.getContact());
                    activityRepository.save(activity);

                    return ResponseEntity.ok(completedTask);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(task -> {
                    taskRepository.delete(task);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
