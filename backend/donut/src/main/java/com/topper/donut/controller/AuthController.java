package com.topper.donut.controller;

import com.topper.donut.dto.auth.*;
import com.topper.donut.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public TokenResponseDto signUp(@RequestBody SignUpRequestDto request) {
        return authService.signUp(request);
    }

    @PostMapping("/login")
    public TokenResponseDto login(@RequestBody LoginRequestDto request) {
        return authService.login(request);
    }
}