package com.crm.controller;

import com.crm.dto.EmailAccountDTO;
import com.crm.model.EmailAccount;
import com.crm.service.EmailAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/email-accounts")
public class EmailAccountController {

    @Autowired
    private EmailAccountService emailAccountService;

    @GetMapping
    public ResponseEntity<List<EmailAccountDTO>> getAllAccounts() {
        List<EmailAccount> accounts = emailAccountService.getAllAccounts();
        List<EmailAccountDTO> dtos = accounts.stream()
                .map(EmailAccountDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/enabled")
    public ResponseEntity<List<EmailAccountDTO>> getEnabledAccounts() {
        List<EmailAccount> accounts = emailAccountService.getEnabledAccounts();
        List<EmailAccountDTO> dtos = accounts.stream()
                .map(EmailAccountDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailAccountDTO> getAccountById(@PathVariable Long id) {
        return emailAccountService.getAccountById(id)
                .map(account -> ResponseEntity.ok(new EmailAccountDTO(account)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EmailAccountDTO> createAccount(@RequestBody EmailAccount account) {
        try {
            EmailAccount created = emailAccountService.createAccount(account);
            return ResponseEntity.ok(new EmailAccountDTO(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailAccountDTO> updateAccount(
            @PathVariable Long id,
            @RequestBody EmailAccount account) {
        try {
            EmailAccount updated = emailAccountService.updateAccount(id, account);
            return ResponseEntity.ok(new EmailAccountDTO(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long id) {
        emailAccountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }
}
