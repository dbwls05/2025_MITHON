package com.topper.donut.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user")
public class User {

    @Id
    private Integer id; // auth.id 와 동일한 값 (공유 PK)

    @Column(nullable = false, length = 16)
    private String name;

    @Column(length = 255)
    private String img;

    @Column(length = 255)
    private String comment;

    @Column(nullable = false)
    private String school;

    @Column(nullable = false)
    private Integer grade;

    @Column(name = "class", nullable = false)
    private Integer classNum;

    protected User() {}

    public User(Integer id, String name, String school, Integer grade, Integer classNum) {
        this.id = id;
        this.name = name;
        this.school = school;
        this.grade = grade;
        this.classNum = classNum;
    }

    public Integer getId() { return id; }
    public String getComment() { return comment; }
    public void updateComment(String comment) { this.comment = comment; }
}