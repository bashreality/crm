package com.crm.controller;

import com.crm.model.Activity;
import com.crm.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "*")
public class ActivityController {

    @Autowired
    private ActivityRepository activityRepository;

    @GetMapping
    public List<Activity> getAllActivities() {
        return activityRepository.findAll();
    }

    @GetMapping("/recent")
    public List<Activity> getRecentActivities() {
        return activityRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @GetMapping("/contact/{contactId}")
    public List<Activity> getActivitiesByContact(@PathVariable Long contactId) {
        return activityRepository.findByContactIdOrderByCreatedAtDesc(contactId);
    }

    @PostMapping
    public Activity createActivity(@RequestBody Activity activity) {
        return activityRepository.save(activity);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(@PathVariable Long id) {
        return activityRepository.findById(id)
                .map(activity -> {
                    activityRepository.delete(activity);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
