package com.topper.donut.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "keyword")
public class Keyword {

    @Id
    private Integer id;

    @Column(nullable = false, unique = true, length = 16)
    private String word;

    protected Keyword() {}

    public Integer getId() { return id; }
    public String getWord() { return word; }
}