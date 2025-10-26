<?php
include_once('./_common.php');

$code = $_GET['code'] ?? '';
$message = $_GET['message'] ?? '결제가 취소되었습니다.';
$orderId = $_GET['orderId'] ?? '';

// 실패한 결제 기록 업데이트
if ($orderId) {
    $update_sql = "UPDATE g5_payment_history SET 
                  payment_status = 'failed'
                  WHERE order_id = '$orderId'";
    sql_query($update_sql);
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>결제 실패</title>
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
        color: #ff3b30;
    }
    </style>
</head>
<body>
    <div class="result-container">
        <div class="result-icon">❌</div>
        <h1>결제 실패</h1>
        <p><?php echo htmlspecialchars($message); ?></p>
        
        <div style="margin-top: 32px;">
            <a href="./premium_plans.php" class="btn">다시 시도</a>
            <a href="./" class="btn secondary">메인으로</a>
        </div>
    </div>
</body>
</html>