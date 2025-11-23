package com.crm.service;

import com.crm.model.AdminUser;
import com.crm.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminUserInitializer implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String defaultUsername = System.getenv().getOrDefault("DEFAULT_ADMIN_USERNAME", "admin");
        String defaultPassword = System.getenv().getOrDefault("DEFAULT_ADMIN_PASSWORD", "admin123");

        adminUserRepository.findByUsername(defaultUsername).ifPresentOrElse(
            user -> {
                if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
                    user.setPasswordHash(passwordEncoder.encode(defaultPassword));
                    adminUserRepository.save(user);
                    log.info("Uzupełniono hasło domyślnego użytkownika {}", defaultUsername);
                }
            },
            () -> {
                AdminUser admin = new AdminUser();
                admin.setUsername(defaultUsername);
                admin.setPasswordHash(passwordEncoder.encode(defaultPassword));
                adminUserRepository.save(admin);
                log.info("Utworzono domyślnego użytkownika admin ({})", defaultUsername);
            }
        );
    }
}
