package com.crm.controller;

import com.crm.model.AdminUser;
import com.crm.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@Slf4j
@RequiredArgsConstructor
public class AuthController {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Prosty endpoint logowania bez Spring Security
     * Username: admin
     * Password: admin123
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.getOrDefault("username", "").trim();
        String password = credentials.getOrDefault("password", "");

        log.info("Login attempt for user: {}", username);

        Map<String, Object> response = new HashMap<>();

        Optional<AdminUser> userOpt = adminUserRepository.findByUsername(username);

        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPasswordHash())) {
            response.put("success", true);
            response.put("message", "Zalogowano pomyślnie");
            response.put("user", Map.of(
                    "username", username,
                    "role", "admin"
            ));
            log.info("Successful login for user: {}", username);
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", "Nieprawidłowa nazwa użytkownika lub hasło");
        log.warn("Failed login attempt for user: {}", username);
        return ResponseEntity.status(401).body(response);
    }

    /**
     * Endpoint wylogowania
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Wylogowano pomyślnie");
        return ResponseEntity.ok(response);
    }

    /**
     * Zmiana hasła dla użytkownika administracyjnego
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.getOrDefault("username", "admin").trim();
        String currentPassword = payload.getOrDefault("currentPassword", "");
        String newPassword = payload.getOrDefault("newPassword", "");
        String confirmPassword = payload.getOrDefault("confirmPassword", "");

        Map<String, Object> response = new HashMap<>();

        if (username.isBlank() || currentPassword.isBlank() || newPassword.isBlank()) {
            response.put("success", false);
            response.put("message", "Uzupełnij wszystkie pola");
            return ResponseEntity.badRequest().body(response);
        }

        if (!newPassword.equals(confirmPassword)) {
            response.put("success", false);
            response.put("message", "Nowe hasło i potwierdzenie nie są takie same");
            return ResponseEntity.badRequest().body(response);
        }

        if (newPassword.length() < 8) {
            response.put("success", false);
            response.put("message", "Hasło powinno mieć co najmniej 8 znaków");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<AdminUser> userOpt = adminUserRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Użytkownik nie istnieje");
            return ResponseEntity.status(404).body(response);
        }

        AdminUser user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            response.put("success", false);
            response.put("message", "Aktualne hasło jest nieprawidłowe");
            return ResponseEntity.status(401).body(response);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        adminUserRepository.save(user);

        response.put("success", true);
        response.put("message", "Hasło zostało zmienione");
        return ResponseEntity.ok(response);
    }

    /**
     * Sprawdzenie czy użytkownik jest zalogowany
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkAuth() {
        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        return ResponseEntity.ok(response);
    }
}
