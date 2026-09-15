package com.topper.donut.service;

import com.topper.donut.dto.auth.*;
import com.topper.donut.entity.Auth;
import com.topper.donut.repository.AuthRepository;
import com.topper.donut.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(AuthRepository authRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.authRepository = authRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public TokenResponseDto signUp(SignUpRequestDto request) {
        if (!request.password().equals(request.passwordConfirm())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        if (authRepository.existsByIdentifier(request.identifier())) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        Auth auth = new Auth(request.identifier(), passwordEncoder.encode(request.password()));
        authRepository.save(auth);

        return new TokenResponseDto(jwtTokenProvider.createSignupToken(auth.getId()));
    }

    public TokenResponseDto login(LoginRequestDto request) {
        Auth auth = authRepository.findByIdentifier(request.identifier())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다."));

        if (!passwordEncoder.matches(request.password(), auth.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        return new TokenResponseDto(jwtTokenProvider.createAccessToken(auth.getId()));
    }
}