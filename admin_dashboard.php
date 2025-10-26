<?php
include_once('./_common.php');
include_once('./premium_functions.php');

// 관리자 권한 확인
if (!$is_admin) {
    alert('관리자만 접근할 수 있습니다.');
    goto_url('./');
    exit;
}

// 통계 데이터 조회
$stats = [];

// 전체 회원 수
$stats['total_members'] = sql_fetch("SELECT COUNT(*) as count FROM {$g5['member_table']}")['count'];

// 구독자 수
$stats['premium_members'] = sql_fetch("SELECT COUNT(*) as count FROM {$g5['member_table']} WHERE mb_premium_type != 'free'")['count'];

// 이번 달 매출
$this_month = date('Y-m');
$stats['monthly_revenue'] = sql_fetch("SELECT SUM(amount) as total FROM g5_payment_history WHERE payment_status = 'completed' AND DATE_FORMAT(paid_at, '%Y-%m') = '$this_month'")['total'] ?? 0;

// 오늘 사용량
$today = date('Y-m-d');
$stats['daily_usage'] = sql_fetch("SELECT COUNT(*) as count FROM g5_usage_log WHERE DATE(created_at) = '$today'")['count'];

// 최근 결제 내역
$recent_payments = sql_query("
    SELECT p.*, m.mb_nick, pl.plan_name 
    FROM g5_payment_history p 
    JOIN {$g5['member_table']} m ON p.mb_id = m.mb_id 
    JOIN g5_premium_plans pl ON p.plan_id = pl.plan_id 
    WHERE p.payment_status = 'completed' 
    ORDER BY p.paid_at DESC 
    LIMIT 10
");

// 구독 현황
$subscription_stats = sql_query("
    SELECT p.plan_name, COUNT(*) as count, SUM(p.plan_price) as revenue
    FROM {$g5['member_table']} m 
    JOIN g5_premium_plans p ON m.mb_premium_type = p.plan_id 
    WHERE m.mb_premium_type != 'free' 
    GROUP BY m.mb_premium_type
");
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>관리자 대시보드 - 영상 캡처 앱</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
    .admin-container {
        max-width: 1400px;
        margin: 40px auto;
        padding: 24px;
    }
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }
    .stat-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
    }
    .stat-number {
        font-size: 36px;
        font-weight: 700;
        color: var(--brand);
        margin-bottom: 8px;
    }
    .stat-label {
        color: var(--muted);
        font-size: 14px;
    }
    .dashboard-section {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
    }
    .section-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--fg);
    }
    .payment-table {
        width: 100%;
        border-collapse: collapse;
    }
    .payment-table th,
    .payment-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border);
    }
    .payment-table th {
        background: rgba(90, 200, 250, 0.1);
        color: var(--brand);
        font-weight: 600;
    }
    .status-completed {
        color: #34c759;
        font-weight: 600;
    }
    .admin-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
    }
    </style>
</head>
<body>
    <div class="admin-container">
        <h1>관리자 대시보드</h1>
        
        <div class="admin-actions">
            <a href="./" class="btn secondary">앱으로 돌아가기</a>
            <a href="premium_plans.php" class="btn secondary">구독 플랜 관리</a>
            <a href="#export-data" class="btn secondary">데이터 내보내기</a>
        </div>

        <!-- 통계 요약 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?php echo number_format($stats['total_members']); ?></div>
                <div class="stat-label">전체 회원</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo number_format($stats['premium_members']); ?></div>
                <div class="stat-label">구독 회원</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo number_format($stats['monthly_revenue']); ?>원</div>
                <div class="stat-label">이번 달 매출</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo number_format($stats['daily_usage']); ?></div>
                <div class="stat-label">오늘 사용량</div>
            </div>
        </div>

        <!-- 구독 현황 -->
        <div class="dashboard-section">
            <h2 class="section-title">구독 현황</h2>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>플랜</th>
                        <th>구독자 수</th>
                        <th>월 매출</th>
                        <th>점유율</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($sub = sql_fetch_array($subscription_stats)): ?>
                    <tr>
                        <td><?php echo $sub['plan_name']; ?></td>
                        <td><?php echo number_format($sub['count']); ?>명</td>
                        <td><?php echo number_format($sub['revenue']); ?>원</td>
                        <td><?php echo round(($sub['count'] / $stats['premium_members']) * 100, 1); ?>%</td>
                    </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>

        <!-- 최근 결제 내역 -->
        <div class="dashboard-section">
            <h2 class="section-title">최근 결제 내역</h2>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>결제일시</th>
                        <th>회원</th>
                        <th>플랜</th>
                        <th>금액</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($payment = sql_fetch_array($recent_payments)): ?>
                    <tr>
                        <td><?php echo date('Y-m-d H:i', strtotime($payment['paid_at'])); ?></td>
                        <td><?php echo $payment['mb_nick']; ?></td>
                        <td><?php echo $payment['plan_name']; ?></td>
                        <td><?php echo number_format($payment['amount']); ?>원</td>
                        <td><span class="status-completed">완료</span></td>
                    </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>