package com.booktrack.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookingCreateDto {
    @NotBlank
    private String serviceId;
    @NotBlank
    private String date;
    @NotBlank
    private String time;
}
