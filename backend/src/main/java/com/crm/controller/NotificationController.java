package com.crm.controller;

import com.crm.model.Notification;
import com.crm.repository.NotificationRepository;
import com.crm.service.UserContextService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Kontroler REST API dla powiadomień
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserContextService userContextService;

    /**
     * Pobierz powiadomienia bieżącego użytkownika
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestParam(defaultValue = "50") int limit) {
        Long userId = userContextService.getCurrentUserId();
        Page<Notification> page = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit));
        return ResponseEntity.ok(page.getContent());
    }

    /**
     * Pobierz nieprzeczytane powiadomienia
     */
    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications() {
        Long userId = userContextService.getCurrentUserId();
        List<Notification> notifications = notificationRepository
                .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Pobierz liczbę nieprzeczytanych powiadomień
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long userId = userContextService.getCurrentUserId();
        long count = notificationRepository.countByUserIdAndIsReadFalse(userId);
        Map<String, Long> result = new HashMap<>();
        result.put("unreadCount", count);
        return ResponseEntity.ok(result);
    }

    /**
     * Oznacz powiadomienie jako przeczytane
     */
    @PostMapping("/{id}/read")
    @Transactional
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        Long userId = userContextService.getCurrentUserId();
        if (!notification.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        
        notification.markAsRead();
        notificationRepository.save(notification);
        return ResponseEntity.ok(notification);
    }

    /**
     * Oznacz wszystkie powiadomienia jako przeczytane
     */
    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, Integer>> markAllAsRead() {
        Long userId = userContextService.getCurrentUserId();
        int count = notificationRepository.markAllAsReadForUser(userId);
        
        Map<String, Integer> result = new HashMap<>();
        result.put("markedAsRead", count);
        return ResponseEntity.ok(result);
    }

    /**
     * Usuń powiadomienie
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        Long userId = userContextService.getCurrentUserId();
        if (!notification.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        
        notificationRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

