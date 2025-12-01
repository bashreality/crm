package com.crm.controller;

import com.crm.model.Email;
import com.crm.repository.EmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/track")
@RequiredArgsConstructor
@Slf4j
public class TrackingController {

    private final EmailRepository emailRepository;
    
    // 1x1 transparent PNG pixel
    private static final byte[] PIXEL_BYTES = {
        (byte)0x89, (byte)0x50, (byte)0x4E, (byte)0x47, (byte)0x0D, (byte)0x0A, (byte)0x1A, (byte)0x0A,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x0D, (byte)0x49, (byte)0x48, (byte)0x44, (byte)0x52,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x01, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x01,
        (byte)0x08, (byte)0x06, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x1F, (byte)0x15, (byte)0xC4,
        (byte)0x89, (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x0A, (byte)0x49, (byte)0x44, (byte)0x41,
        (byte)0x54, (byte)0x78, (byte)0x9C, (byte)0x63, (byte)0x00, (byte)0x01, (byte)0x00, (byte)0x00,
        (byte)0x05, (byte)0x00, (byte)0x01, (byte)0x0D, (byte)0x0A, (byte)0x2D, (byte)0xB4, (byte)0x00,
        (byte)0x00, (byte)0x00, (byte)0x00, (byte)0x49, (byte)0x45, (byte)0x4E, (byte)0x44, (byte)0xAE,
        (byte)0x42, (byte)0x60, (byte)0x82
    };

    @GetMapping("/pixel.png")
    public ResponseEntity<byte[]> trackEmail(@RequestParam(required = false) String id) {
        if (id != null && !id.isEmpty()) {
            try {
                // Find email by tracking ID
                Optional<Email> emailOpt = emailRepository.findByTrackingId(id);
                if (emailOpt.isPresent()) {
                    Email email = emailOpt.get();
                    
                    // Update stats
                    if (!Boolean.TRUE.equals(email.getIsOpened())) {
                        email.setIsOpened(true);
                        email.setOpenedAt(LocalDateTime.now());
                        log.info("Email opened for the first time: {} (Subject: {})", id, email.getSubject());
                    }
                    
                    email.setOpenCount(email.getOpenCount() == null ? 1 : email.getOpenCount() + 1);
                    emailRepository.save(email);
                }
            } catch (Exception e) {
                log.error("Error tracking email open: {}", id, e);
            }
        }

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(PIXEL_BYTES);
    }
}
