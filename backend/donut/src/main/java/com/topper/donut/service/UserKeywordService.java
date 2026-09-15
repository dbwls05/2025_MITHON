package com.topper.donut.service;

import com.topper.donut.dto.user.KeywordSelectRequestDto;
import com.topper.donut.entity.KeywordUser;
import com.topper.donut.repository.KeywordUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserKeywordService {

    private static final int MAX_KEYWORD_COUNT = 3;
    private final KeywordUserRepository keywordUserRepository;

    public UserKeywordService(KeywordUserRepository keywordUserRepository) {
        this.keywordUserRepository = keywordUserRepository;
    }

    @Transactional
    public void selectKeywords(Integer userId, KeywordSelectRequestDto request) {
        if (request.keywordIds().size() > MAX_KEYWORD_COUNT) {
            throw new IllegalArgumentException("키워드는 최대 " + MAX_KEYWORD_COUNT + "개까지 선택 가능합니다.");
        }

        keywordUserRepository.deleteByUserId(userId); // 재선택 대비 초기화
        request.keywordIds().forEach(keywordId ->
                keywordUserRepository.save(new KeywordUser(userId, keywordId))
        );
    }
}