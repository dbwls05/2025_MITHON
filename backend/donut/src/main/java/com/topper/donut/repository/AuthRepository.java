package com.topper.donut.repository;

import com.topper.donut.entity.Auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AuthRepository extends JpaRepository<Auth, Integer> {
    boolean existsByIdentifier(String identifier);
    Optional<Auth> findByIdentifier(String identifier);
}