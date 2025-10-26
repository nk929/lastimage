<?php
include_once('./_common.php');
include_once('./premium_functions.php');

if (!$is_member) {
    goto_url(G5_BBS_URL.'/login.php');
    exit;
}

$current_premium = check_premium_status($member['mb_id']);
$plans_result = get_premium_plans();
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>프리미엄 구독 - 영상 마지막 프레임 캡처</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
    .pricing-container {
        max-width: 1200px;
        margin: 40px auto;
        padding: 24px;
    }
    .pricing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-top: 32px;
    }
    .pricing-card {
        background: var(--card-bg);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 32px 24px;
        text-align: center;
        position: relative;
        transition: all 0.3s ease;
    }
    .pricing-card.recommended {
        border-color: var(--brand);
        transform: scale(1.05);
    }
    .pricing-card.current {
        border-color: #34c759;
        background: rgba(52, 199, 89, 0.05);
    }
    .plan-name {
        font-size: 24px;
        font-weight: 700;
        color: var(--fg);
        margin-bottom: 8px;
    }
    .plan-price {
        font-size: 36px;
        font-weight: 800;
        color: var(--brand);
        margin-bottom: 4px;
    }
    .plan-period {
        color: var(--muted);
        font-size: 14px;
        margin-bottom: 24px;
    }
    .features-list {
        list-style: none;
        padding: 0;
        margin: 24px 0;
    }
    .features-list li {
        padding: 8px 0;
        color: var(--fg);
        font-size: 14px;
    }
    .features-list li:before {
        content: '✓';
        color: #34c759;
        font-weight: bold;
        margin-right: 8px;
    }
    .plan-button {
        width: 100%;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
        text-align: center;
        transition: all 0.2s ease;
    }
    .plan-button.primary {
        background: var(--brand);
        color: #001019;
    }
    .plan-button.primary:hover {
        background: #4bb3e6;
    }
    .plan-button.secondary {
        background: transparent;
        color: var(--muted);
        border: 1px solid var(--border);
    }
    .plan-button.current {
        background: #34c759;
        color: white;
    }
    .recommended-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--brand);
        color: #001019;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    .current-status {
        background: rgba(52, 199, 89, 0.1);
        border: 1px solid rgba(52, 199, 89, 0.3);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 32px;
        text-align: center;
    }
    </style>
</head>
<body>
    <div class="pricing-container">
        <header>
            <h1>프리미엄 구독 플랜</h1>
            <p>더 많은 기능과 무제한 사용으로 작업 효율을 높이세요</p>
        </header>

        <?php if ($current_premium['mb_premium_type'] != 'free'): ?>
        <div class="current-status">
            <h3>현재 구독 중: <?php 
                $plan_names = ['premium' => '프리미엄', 'enterprise' => '기업용'];
                echo $plan_names[$current_premium['mb_premium_type']] ?? $current_premium['mb_premium_type'];
            ?></h3>
            <p>구독 만료일: <?php echo $current_premium['mb_premium_end']; ?></p>
        </div>
        <?php endif; ?>

        <div class="pricing-grid">
            <?php 
            $plan_features = [
                'free' => [
                    '일 3회 캡처',
                    'HD 해상도',
                    '워터마크 포함',
                    '기본 지원'
                ],
                'premium' => [
                    '무제한 캡처',
                    'Full HD 해상도',
                    '워터마크 제거',
                    '우선 지원',
                    'Sora 비디오 최적화'
                ],
                'enterprise' => [
                    '무제한 캡처',
                    '4K 해상도 지원',
                    '워터마크 제거',
                    '배치 처리',
                    'API 접근',
                    '전담 지원'
                ]
            ];
            
            while ($plan = sql_fetch_array($plans_result)):
                $is_current = ($current_premium['mb_premium_type'] == $plan['plan_id']);
                $is_recommended = ($plan['plan_id'] == 'premium');
            ?>
            <div class="pricing-card <?php echo $is_recommended ? 'recommended' : ''; ?> <?php echo $is_current ? 'current' : ''; ?>">
                <?php if ($is_recommended): ?>
                <div class="recommended-badge">추천</div>
                <?php endif; ?>
                
                <div class="plan-name"><?php echo $plan['plan_name']; ?></div>
                <div class="plan-price"><?php echo number_format($plan['plan_price']); ?>원</div>
                <div class="plan-period"><?php echo $plan['plan_duration'] > 0 ? '/ 월' : '무료'; ?></div>
                
                <ul class="features-list">
                    <?php foreach ($plan_features[$plan['plan_id']] as $feature): ?>
                    <li><?php echo $feature; ?></li>
                    <?php endforeach; ?>
                </ul>
                
                <?php if ($is_current): ?>
                    <button class="plan-button current" disabled>현재 플랜</button>
                <?php elseif ($plan['plan_id'] == 'free'): ?>
                    <a href="javascript:void(0)" class="plan-button secondary" onclick="downgradePlan()">다운그레이드</a>
                <?php else: ?>
                    <a href="payment_process.php?plan=<?php echo $plan['plan_id']; ?>" class="plan-button primary">
                        <?php echo ($current_premium['mb_premium_type'] == 'free') ? '구독하기' : '업그레이드'; ?>
                    </a>
                <?php endif; ?>
            </div>
            <?php endwhile; ?>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="./" class="btn secondary">앱으로 돌아가기</a>
        </div>
    </div>

    <script>
    function downgradePlan() {
        if (confirm('정말로 무료 플랜으로 다운그레이드하시겠습니까?\n현재 구독이 즉시 취소됩니다.')) {
            location.href = 'cancel_subscription.php';
        }
    }
    </script>
</body>
</html>