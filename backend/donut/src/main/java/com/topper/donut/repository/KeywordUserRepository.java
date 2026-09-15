package com.topper.donut.repository;

import com.topper.donut.entity.KeywordUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KeywordUserRepository extends JpaRepository<KeywordUser, Integer> {
    List<KeywordUser> findByUserId(Integer userId);
    long countByUserId(Integer userId);
    void deleteByUserId(Integer userId);
}