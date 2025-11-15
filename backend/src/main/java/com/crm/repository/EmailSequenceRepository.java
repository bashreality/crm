package com.crm.repository;

import com.crm.model.EmailSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmailSequenceRepository extends JpaRepository<EmailSequence, Long> {
    List<EmailSequence> findByActiveTrue();
    List<EmailSequence> findByNameContainingIgnoreCase(String name);
}
