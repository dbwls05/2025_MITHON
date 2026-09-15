package com.topper.donut.dto.auth;

public record SignUpRequestDto(
        String identifier,
        String password,
        String passwordConfirm
) {}