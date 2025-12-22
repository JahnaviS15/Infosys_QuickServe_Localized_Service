package com.booktrack.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookingStatusUpdateDto {
    @NotBlank
    private String status;
}
