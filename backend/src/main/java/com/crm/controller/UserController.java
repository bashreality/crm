package com.crm.controller;

import com.crm.dto.auth.UserDto;
import com.crm.model.AdminUser;
import com.crm.repository.AdminUserRepository;
import com.crm.service.UserContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AdminUserRepository adminUserRepository;
    private final UserContextService userContextService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser() {
        Long userId = userContextService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AdminUser user = adminUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(toDto(user));
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        if (!userContextService.isCurrentUserAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<UserDto> users = adminUserRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        Long currentUserId = userContextService.getCurrentUserId();
        boolean isAdmin = userContextService.isCurrentUserAdmin();

        // Users can view their own profile, admins can view any profile
        if (!isAdmin && !id.equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        AdminUser user = adminUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(toDto(user));
    }

    @PostMapping
    public ResponseEntity<UserDto> createUser(@RequestBody UserDto userDto) {
        if (!userContextService.isCurrentUserAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Check if username or email already exists
        if (adminUserRepository.findByUsername(userDto.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        if (userDto.getEmail() != null && adminUserRepository.findByEmail(userDto.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        AdminUser user = new AdminUser();
        user.setUsername(userDto.getUsername());
        user.setPasswordHash(passwordEncoder.encode(userDto.getPassword()));
        user.setEmail(userDto.getEmail());
        user.setFirstName(userDto.getFirstName());
        user.setLastName(userDto.getLastName());
        user.setRole(userDto.getRole() != null ? userDto.getRole() : "USER");
        user.setActive(userDto.getActive() != null ? userDto.getActive() : true);

        AdminUser savedUser = adminUserRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(savedUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        Long currentUserId = userContextService.getCurrentUserId();
        boolean isAdmin = userContextService.isCurrentUserAdmin();

        // Users can update their own profile, admins can update any profile
        if (!isAdmin && !id.equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        AdminUser user = adminUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Only admins can change role and active status
        if (isAdmin) {
            user.setRole(userDto.getRole());
            user.setActive(userDto.getActive());
        }

        // Everyone can update basic profile info
        if (userDto.getEmail() != null) {
            user.setEmail(userDto.getEmail());
        }
        if (userDto.getFirstName() != null) {
            user.setFirstName(userDto.getFirstName());
        }
        if (userDto.getLastName() != null) {
            user.setLastName(userDto.getLastName());
        }

        // Update password if provided
        if (userDto.getPassword() != null && !userDto.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(userDto.getPassword()));
        }

        AdminUser updatedUser = adminUserRepository.save(user);

        return ResponseEntity.ok(toDto(updatedUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userContextService.isCurrentUserAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Prevent deleting yourself
        if (id.equals(userContextService.getCurrentUserId())) {
            return ResponseEntity.badRequest().build();
        }

        adminUserRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private UserDto toDto(AdminUser user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setRole(user.getRole());
        dto.setActive(user.getActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }
}
