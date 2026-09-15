package com.topper.donut.controller;

import com.topper.donut.dto.user.KeywordSelectRequestDto;
import com.topper.donut.security.JwtTokenProvider;
import com.topper.donut.service.UserKeywordService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserKeywordController extends BaseAuthController {

    private final UserKeywordService userKeywordService;

    public UserKeywordController(UserKeywordService userKeywordService, JwtTokenProvider jwtTokenProvider) {
        super(jwtTokenProvider);
        this.userKeywordService = userKeywordService;
    }

    @PostMapping("/keywords")
    public void selectKeywords(@RequestHeader("Authorization") String authHeader,
                               @RequestBody KeywordSelectRequestDto request) {
        Integer authId = extractAuthId(authHeader);
        userKeywordService.selectKeywords(authId, request);
    }
}