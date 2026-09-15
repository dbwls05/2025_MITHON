package com.topper.donut.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auth")
public class Auth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String identifier;

    @Column(nullable = false)
    private String password;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    // 기본 생성자 (JPA 필수)
    protected Auth() {}

    // insert용 생성자
    public Auth(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }

    // Getter
    public Integer getId() { return id; }
    public String getIdentifier() { return identifier; }
    public String getPassword() { return password; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}