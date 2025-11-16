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
    List<Task> findByDealIdOrderByDueDateAsc(Long dealId);
    List<Task> findByCompletedFalseOrderByDueDateAsc();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false")
    Long countPendingTasks();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false AND t.dueDate < :now")
    Long countOverdueTasks(LocalDateTime now);
}
