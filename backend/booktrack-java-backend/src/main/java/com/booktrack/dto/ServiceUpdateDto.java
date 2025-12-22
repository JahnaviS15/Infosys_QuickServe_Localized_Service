package com.booktrack.dto;

import lombok.Data;

@Data
public class ServiceUpdateDto {
    private String name;
    private String description;
    private String category;
    private Double price;
    private String location;
    private Integer duration;
    private String imageUrl;
}
