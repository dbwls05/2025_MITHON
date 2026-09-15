package com.topper.donut.service;

import com.topper.donut.dto.auth.TokenResponseDto;
import com.topper.donut.dto.user.IntroRequestDto;
import com.topper.donut.dto.user.ProfileRequestDto;
import com.topper.donut.entity.User;
import com.topper.donut.repository.UserRepository;
import com.topper.donut.security.JwtTokenProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public UserProfileService(UserRepository userRepository, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public void createProfile(Integer authId, ProfileRequestDto request) {
        User user = new User(authId, request.name(), request.school(), request.grade(), request.classNum());
        userRepository.save(user);
    }

    @Transactional
    public TokenResponseDto completeIntro(Integer authId, IntroRequestDto request) {
        User user = userRepository.findById(authId)
                .orElseThrow(() -> new IllegalArgumentException("프로필이 존재하지 않습니다."));
        user.updateComment(request.comment());

        // 자기소개까지 끝나면 가입 완료 → 정식 토큰 발급
        return new TokenResponseDto(jwtTokenProvider.createAccessToken(authId));
    }
}