package com.crm.repository;

import com.crm.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    
    List<Attachment> findByUserId(Long userId);
    
    List<Attachment> findByIdIn(List<Long> ids);
}

