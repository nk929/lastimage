<?php
include_once('./_common.php');
include_once('./premium_functions.php');

// 토스페이먼츠에서 전달받은 결제 정보
$paymentKey = $_GET['paymentKey'] ?? '';
$orderId = $_GET['orderId'] ?? '';
$amount = $_GET['amount'] ?? 0;

if (!$paymentKey || !$orderId) {
    alert('결제 정보가 올바르지 않습니다.');
    goto_url('./premium_plans.php');
    exit;
}

// 결제 내역 조회
$payment_sql = "SELECT * FROM g5_payment_history WHERE order_id = '$orderId'";
$payment_info = sql_fetch($payment_sql);

if (!$payment_info) {
    alert('결제 정보를 찾을 수 없습니다.');
    goto_url('./premium_plans.php');
    exit;
}

// 토스페이먼츠 API로 결제 확인 (실제 서비스에서는 서버에서 검증)
$secret_key = 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'; // 테스트 시크릿 키

// 결제 승인 API 호출
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.tosspayments.com/v1/payments/confirm');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . base64_encode($secret_key . ':'),
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'paymentKey' => $paymentKey,
    'orderId' => $orderId,
    'amount' => (int)$amount
]));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    
    // 결제 성공 - 구독 활성화
    $activate_result = activate_premium($payment_info['mb_id'], $payment_info['plan_id'], [
        'payment_id' => $payment_info['payment_id'],
        'auto_payment' => 0 // 첫 결제는 수동
    ]);
    
    if ($activate_result) {
        // 결제 완료 정보 업데이트
        $update_sql = "UPDATE g5_payment_history SET 
                      payment_method = '{$result['method']}',
                      payment_status = 'completed',
                      pg_tid = '{$result['paymentKey']}',
                      paid_at = NOW()
                      WHERE payment_id = '{$payment_info['payment_id']}'";
        sql_query($update_sql);
        
        $success = true;
        $plan_info = sql_fetch("SELECT * FROM g5_premium_plans WHERE plan_id = '{$payment_info['plan_id']}'");
    } else {
        $success = false;
        $error_message = '구독 활성화에 실패했습니다.';
    }
} else {
    $success = false;
    $error_response = json_decode($response, true);
    $error_message = $error_response['message'] ?? '결제 확인에 실패했습니다.';
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo $success ? '결제 완료' : '결제 실패'; ?></title>
    <link rel="stylesheet" href="css/style.css">
    <style>
    .result-container {
        max-width: 600px;
        margin: 60px auto;
        padding: 24px;
        text-align: center;
    }
    .result-icon {
        font-size: 64px;
        margin-bottom: 24px;
    }
    .success { color: #34c759; }
    .error { color: #ff3b30; }
    .result-info {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        text-align: left;
    }
    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
    }
    .info-row:last-child {
        border-bottom: none;
    }
    </style>
</head>
<body>
    <div class="result-container">
        <?php if ($success): ?>
            <div class="result-icon success">✅</div>
            <h1>결제가 완료되었습니다!</h1>
            <p>프리미엄 구독이 활성화되었습니다.</p>
            
            <div class="result-info">
                <div class="info-row">
                    <span>플랜</span>
                    <span><?php echo $plan_info['plan_name']; ?></span>
                </div>
                <div class="info-row">
                    <span>결제 금액</span>
                    <span><?php echo number_format($payment_info['amount']); ?>원</span>
                </div>
                <div class="info-row">
                    <span>구독 시작일</span>
                    <span><?php echo date('Y-m-d'); ?></span>
                </div>
                <div class="info-row">
                    <span>구독 만료일</span>
                    <span><?php echo date('Y-m-d', strtotime('+' . $plan_info['plan_duration'] . ' days')); ?></span>
                </div>
            </div>
            
            <a href="./" class="btn" style="margin-right: 12px;">앱 사용하기</a>
            <a href="./premium_plans.php" class="btn secondary">구독 관리</a>
            
        <?php else: ?>
            <div class="result-icon error">❌</div>
            <h1>결제에 실패했습니다</h1>
            <p><?php echo $error_message; ?></p>
            
            <div style="margin-top: 32px;">
                <a href="./premium_plans.php" class="btn">다시 시도</a>
                <a href="./" class="btn secondary">메인으로</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>