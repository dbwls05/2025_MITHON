package com.topper.donut.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private static final long SIGNUP_EXPIRATION = 1000L * 60 * 30;      // 30분
    private static final long ACCESS_EXPIRATION = 1000L * 60 * 60 * 24; // 24시간

    public JwtTokenProvider(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String createSignupToken(Integer authId) {
        return createToken(authId, "SIGNUP", SIGNUP_EXPIRATION);
    }

    public String createAccessToken(Integer authId) {
        return createToken(authId, "ACCESS", ACCESS_EXPIRATION);
    }

    private String createToken(Integer authId, String scope, long expiration) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(authId))
                .claim("scope", scope)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiration))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }

    public Integer getAuthId(String token) {
        return Integer.valueOf(parseClaims(token).getSubject());
    }

    public boolean isSignupScope(String token) {
        return "SIGNUP".equals(parseClaims(token).get("scope", String.class));
    }
}