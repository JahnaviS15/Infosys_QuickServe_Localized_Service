package com.booktrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ServiceCreateDto {
    @NotBlank
    private String name;
    @NotBlank
    private String description;
    @NotBlank
    private String category;
    @NotNull
    private Double price;
    @NotBlank
    private String location;
    @NotNull
    private Integer duration;
    @NotBlank
    private String imageUrl;
}
