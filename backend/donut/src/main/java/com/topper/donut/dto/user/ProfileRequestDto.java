package com.topper.donut.dto.user;

public record ProfileRequestDto(
        String name,
        String school,
        Integer grade,
        Integer classNum
) {}