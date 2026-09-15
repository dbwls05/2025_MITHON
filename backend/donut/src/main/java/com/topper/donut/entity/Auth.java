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

    protected Auth() {}

    public Auth(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }

    public Integer getId() { return id; }
    public String getIdentifier() { return identifier; }
    public String getPassword() { return password; }
}