package com.topper.donut.dto.user;

import java.util.List;

public record KeywordSelectRequestDto(
        List<Integer> keywordIds
) {}