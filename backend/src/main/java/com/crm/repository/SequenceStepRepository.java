package com.crm.repository;

import com.crm.model.SequenceStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SequenceStepRepository extends JpaRepository<SequenceStep, Long> {
    List<SequenceStep> findBySequenceIdOrderByStepOrderAsc(Long sequenceId);

    long countBySequenceId(Long sequenceId);
}
