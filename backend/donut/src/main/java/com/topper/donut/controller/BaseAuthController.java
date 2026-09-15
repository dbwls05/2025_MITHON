package com.topper.donut.controller;

import com.topper.donut.security.JwtTokenProvider;
import org.springframework.web.bind.annotation.RequestHeader;

public abstract class BaseAuthController {

    protected final JwtTokenProvider jwtTokenProvider;

    protected BaseAuthController(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    protected Integer extractAuthId(String bearerToken) {
        String token = bearerToken.replace("Bearer ", "");
        return jwtTokenProvider.getAuthId(token);
    }
}