package com.topper.donut.controller;

import com.topper.donut.dto.auth.TokenResponseDto;
import com.topper.donut.dto.user.IntroRequestDto;
import com.topper.donut.dto.user.ProfileRequestDto;
import com.topper.donut.security.JwtTokenProvider;
import com.topper.donut.service.UserProfileService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserProfileController extends BaseAuthController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService, JwtTokenProvider jwtTokenProvider) {
        super(jwtTokenProvider);
        this.userProfileService = userProfileService;
    }

    @PostMapping("/profile")
    public void createProfile(@RequestHeader("Authorization") String authHeader,
                              @RequestBody ProfileRequestDto request) {
        Integer authId = extractAuthId(authHeader);
        userProfileService.createProfile(authId, request);
    }

    @PostMapping("/intro")
    public TokenResponseDto completeIntro(@RequestHeader("Authorization") String authHeader,
                                          @RequestBody IntroRequestDto request) {
        Integer authId = extractAuthId(authHeader);
        return userProfileService.completeIntro(authId, request);
    }
}