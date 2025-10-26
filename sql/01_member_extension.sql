-- 그누보드 회원 테이블에 구독 정보 추가
ALTER TABLE g5_member ADD COLUMN mb_premium_type VARCHAR(20) DEFAULT 'free' COMMENT '구독 유형 (free, premium, enterprise)';
ALTER TABLE g5_member ADD COLUMN mb_premium_start DATE NULL COMMENT '구독 시작일';
ALTER TABLE g5_member ADD COLUMN mb_premium_end DATE NULL COMMENT '구독 종료일';
ALTER TABLE g5_member ADD COLUMN mb_premium_auto TINYINT(1) DEFAULT 0 COMMENT '자동결제 여부';
ALTER TABLE g5_member ADD COLUMN mb_capture_count INT DEFAULT 0 COMMENT '오늘 캡처 횟수';
ALTER TABLE g5_member ADD COLUMN mb_capture_date DATE NULL COMMENT '마지막 캡처 날짜';

-- 인덱스 추가
ALTER TABLE g5_member ADD INDEX idx_premium_end (mb_premium_end);
ALTER TABLE g5_member ADD INDEX idx_premium_type (mb_premium_type);