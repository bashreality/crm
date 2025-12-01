package com.crm.repository;

import com.crm.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByContactIdOrderByDueDateAsc(Long contactId);
    List<Task> findByCompletedFalseOrderByDueDateAsc();

    // User-specific queries
    List<Task> findByUserIdOrderByDueDateAsc(Long userId);
    List<Task> findByUserIdAndCompletedFalseOrderByDueDateAsc(Long userId);
    List<Task> findByUserId(Long userId);
    List<Task> findByUserIdAndContactIdOrderByDueDateAsc(Long userId, Long contactId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false")
    Long countPendingTasks();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false AND t.dueDate < :now")
    Long countOverdueTasks(LocalDateTime now);

    // User-specific count queries
    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false AND t.userId = :userId")
    Long countPendingTasksByUser(Long userId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false AND t.dueDate < :now AND t.userId = :userId")
    Long countOverdueTasksByUser(LocalDateTime now, Long userId);
}
