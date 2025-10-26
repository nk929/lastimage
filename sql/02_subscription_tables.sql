-- 구독 플랜 테이블
CREATE TABLE g5_premium_plans (
    plan_id VARCHAR(20) PRIMARY KEY,
    plan_name VARCHAR(50) NOT NULL,
    plan_price INT NOT NULL,
    plan_duration INT NOT NULL COMMENT '구독 기간 (일)',
    daily_limit INT DEFAULT 0 COMMENT '일일 캡처 제한 (0=무제한)',
    features TEXT COMMENT '기능 설명 JSON',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 플랜 데이터 삽입
INSERT INTO g5_premium_plans VALUES 
('free', '무료 플랜', 0, 0, 3, '{"watermark": true, "resolution": "HD"}', 1, NOW()),
('premium', '프리미엄', 9900, 30, 0, '{"watermark": false, "resolution": "Full HD", "batch": false}', 1, NOW()),
('enterprise', '기업용', 49900, 30, 0, '{"watermark": false, "resolution": "4K", "batch": true, "api": true}', 1, NOW());

-- 결제 내역 테이블
CREATE TABLE g5_payment_history (
    payment_id VARCHAR(50) PRIMARY KEY,
    mb_id VARCHAR(20) NOT NULL,
    plan_id VARCHAR(20) NOT NULL,
    amount INT NOT NULL,
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending',
    order_id VARCHAR(50) UNIQUE,
    pg_tid VARCHAR(100),
    paid_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mb_id) REFERENCES g5_member(mb_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES g5_premium_plans(plan_id)
);

-- 사용량 로그 테이블
CREATE TABLE g5_usage_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    mb_id VARCHAR(20) NOT NULL,
    action_type VARCHAR(20) DEFAULT 'capture',
    file_name VARCHAR(255),
    file_size INT,
    resolution VARCHAR(20),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mb_id (mb_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (mb_id) REFERENCES g5_member(mb_id) ON DELETE CASCADE
);