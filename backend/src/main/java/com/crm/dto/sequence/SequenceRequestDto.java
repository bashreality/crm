package com.crm.dto.sequence;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class SequenceRequestDto {

    @NotBlank(message = "Nazwa sekwencji jest wymagana")
    @Size(min = 2, max = 100, message = "Nazwa musi mieć od 2 do 100 znaków")
    private String name;

    @Size(max = 500, message = "Opis może mieć maksymalnie 500 znaków")
    private String description;

    private Boolean active;
    private String timezone;
    private LocalTime sendWindowStart;
    private LocalTime sendWindowEnd;
    private Boolean sendOnWeekends;

    @Min(value = 1, message = "Dzienny limit musi być większy niż 0")
    @Max(value = 1000, message = "Dzienny limit nie może przekraczać 1000")
    private Integer dailySendingLimit;

    @Min(value = 1, message = "Limit na godzinę musi być większy niż 0")
    @Max(value = 100, message = "Limit na godzinę nie może przekraczać 100")
    private Integer throttlePerHour;

    private Long emailAccountId;
    private Long tagId; // Tag docelowy dla odbiorców sekwencji
    private List<SequenceStepRequestDto> steps;
}

