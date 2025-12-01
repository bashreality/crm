package com.crm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContactDto {

    private Long id;

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Company is required")
    private String company;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    private String phone;

    private String position;

    private Integer emailCount;

    private Integer meetingCount;

    private Integer dealCount;

    private Integer score;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private java.util.Set<com.crm.model.Tag> tags;

    private Boolean inActiveSequence; // Czy kontakt jest obecnie w aktywnej sekwencji
}
