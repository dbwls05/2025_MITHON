package com.topper.donut;

import com.topper.donut.entity.Auth;
import com.topper.donut.repository.AuthRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DonutApplication {

    public static void main(String[] args) {
        SpringApplication.run(DonutApplication.class, args);
    }

    @Bean
    public CommandLineRunner testInsert(AuthRepository authRepository) {
        return args -> {
            Auth auth = new Auth("testuser", "testpassword123");
            authRepository.save(auth);
            System.out.println("저장 완료! id: " + auth.getId());
        };
    }
}