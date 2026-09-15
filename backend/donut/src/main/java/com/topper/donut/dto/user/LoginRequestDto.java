package com.topper.donut.dto.user;

public record LoginRequestDto(
        String identifier,
        String password
) {}