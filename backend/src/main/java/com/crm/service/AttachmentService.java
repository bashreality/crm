package com.crm.service;

import com.crm.model.Attachment;
import com.crm.repository.AttachmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-size:26214400}") // 25MB default
    private long maxFileSize;

    /**
     * Upload a file and save attachment metadata
     */
    @Transactional
    public Attachment uploadFile(MultipartFile file, Long userId) throws IOException {
        // Validate file size
        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("Plik jest za duży. Maksymalny rozmiar: " + (maxFileSize / 1024 / 1024) + "MB");
        }

        // Validate file is not empty
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Plik jest pusty");
        }

        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String uniqueFilename = UUID.randomUUID().toString() + extension;

        // Save file to disk
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Create attachment record
        Attachment attachment = new Attachment();
        attachment.setFilename(uniqueFilename);
        attachment.setOriginalName(originalFilename != null ? originalFilename : "file" + extension);
        attachment.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        attachment.setSize(file.getSize());
        attachment.setPath(filePath.toString());
        attachment.setUserId(userId);

        Attachment saved = attachmentRepository.save(attachment);
        log.info("Uploaded attachment: {} ({})", saved.getOriginalName(), saved.getId());

        return saved;
    }

    /**
     * Get attachment by ID
     */
    public Attachment getById(Long id) {
        return attachmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Załącznik nie znaleziony: " + id));
    }

    /**
     * Get attachments by IDs
     */
    public List<Attachment> getByIds(List<Long> ids) {
        return attachmentRepository.findByIdIn(ids);
    }

    /**
     * Get all attachments for a user
     */
    public List<Attachment> getByUserId(Long userId) {
        return attachmentRepository.findByUserId(userId);
    }

    /**
     * Get file bytes for an attachment
     */
    public byte[] getFileBytes(Attachment attachment) throws IOException {
        Path filePath = Paths.get(attachment.getPath());
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Plik nie istnieje na dysku: " + attachment.getOriginalName());
        }
        return Files.readAllBytes(filePath);
    }

    /**
     * Delete attachment and its file
     */
    @Transactional
    public void delete(Long id) {
        Attachment attachment = getById(id);
        
        // Delete file from disk
        try {
            Path filePath = Paths.get(attachment.getPath());
            Files.deleteIfExists(filePath);
            log.info("Deleted file from disk: {}", filePath);
        } catch (IOException e) {
            log.warn("Could not delete file from disk: {}", attachment.getPath(), e);
        }

        // Delete database record
        attachmentRepository.deleteById(id);
        log.info("Deleted attachment record: {}", id);
    }

    /**
     * Get file path for attachment
     */
    public Path getFilePath(Attachment attachment) {
        return Paths.get(attachment.getPath());
    }
}

