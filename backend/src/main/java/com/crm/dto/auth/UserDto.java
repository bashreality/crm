package com.crm.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String password; // Only used for create/update, never returned
    private String email;
    private String firstName;
    private String lastName;
    private String role; // USER, ADMIN
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
