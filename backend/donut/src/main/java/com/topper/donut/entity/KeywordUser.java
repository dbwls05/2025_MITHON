package com.topper.donut.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "keyword_user", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "keyword_id"})
})
public class KeywordUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "keyword_id", nullable = false)
    private Integer keywordId;

    protected KeywordUser() {}

    public KeywordUser(Integer userId, Integer keywordId) {
        this.userId = userId;
        this.keywordId = keywordId;
    }
}