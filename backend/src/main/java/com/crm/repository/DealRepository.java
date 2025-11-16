package com.crm.repository;

import com.crm.model.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {
    List<Deal> findByPipelineIdOrderByStageIdAsc(Long pipelineId);
    List<Deal> findByContactId(Long contactId);
    List<Deal> findByStatus(String status);

    @Query("SELECT COUNT(d) FROM Deal d WHERE d.status = 'open'")
    Long countOpenDeals();

    @Query("SELECT SUM(d.value) FROM Deal d WHERE d.status = 'open'")
    Double sumOpenDealsValue();

    @Query("SELECT SUM(d.value) FROM Deal d WHERE d.status = 'won'")
    Double sumWonDealsValue();

    @Query("SELECT COUNT(d) FROM Deal d WHERE d.status = 'won'")
    Long countWonDeals();

    @Query("SELECT COUNT(d) FROM Deal d WHERE d.status = 'lost'")
    Long countLostDeals();
}
