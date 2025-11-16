package com.crm.repository;

import com.crm.model.SequenceExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SequenceExecutionRepository extends JpaRepository<SequenceExecution, Long> {
    List<SequenceExecution> findByStatus(String status);
    List<SequenceExecution> findBySequenceId(Long sequenceId);
    List<SequenceExecution> findByContactId(Long contactId);
    List<SequenceExecution> findByRecipientEmail(String email);

    long countBySequenceId(Long sequenceId);

    long countBySequenceIdAndStatus(Long sequenceId, String status);

    long countByStatus(String status);
}
