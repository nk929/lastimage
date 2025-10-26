<?php
include_once('./_common.php');
include_once('./premium_functions.php');

if (!$is_member) {
    goto_url(G5_BBS_URL.'/login.php');
    exit;
}

$plan_id = $_GET['plan'] ?? '';
if (!$plan_id) {
    alert('올바르지 않은 플랜입니다.');
    goto_url('./premium_plans.php');
    exit;
}

// 플랜 정보 조회
$plan_sql = "SELECT * FROM g5_premium_plans WHERE plan_id = '$plan_id' AND is_active = 1";
$plan = sql_fetch($plan_sql);

if (!$plan) {
    alert('존재하지 않는 플랜입니다.');
    goto_url('./premium_plans.php');
    exit;
}

// 주문 ID 생성
$order_id = 'VFC_' . date('YmdHis') . '_' . $member['mb_id'];
$payment_id = 'PAY_' . uniqid();

// 결제 정보 임시 저장
$payment_sql = "INSERT INTO g5_payment_history 
                (payment_id, mb_id, plan_id, amount, order_id, payment_status) 
                VALUES 
                ('$payment_id', '{$member['mb_id']}', '$plan_id', {$plan['plan_price']}, '$order_id', 'pending')";
sql_query($payment_sql);

// 토스페이먼츠 클라이언트 키 (실제 서비스에서는 환경변수로 관리)
$toss_client_key = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'; // 테스트 키
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>결제하기 - <?php echo $plan['plan_name']; ?></title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://js.tosspayments.com/v1/payment"></script>
    <style>
    .payment-container {
        max-width: 600px;
        margin: 40px auto;
        padding: 24px;
    }
    .payment-info {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
    }
    .payment-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--border);
    }
    .payment-row:last-child {
        border-bottom: none;
        font-weight: 600;
        font-size: 18px;
        color: var(--brand);
    }
    .payment-methods {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin: 24px 0;
    }
    .payment-method {
        padding: 16px;
        border: 2px solid var(--border);
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--card-bg);
    }
    .payment-method:hover {
        border-color: var(--brand);
    }
    .payment-method.selected {
        border-color: var(--brand);
        background: rgba(90, 200, 250, 0.1);
    }
    .agreement {
        margin: 20px 0;
    }
    .agreement label {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 14px;
        color: var(--fg);
    }
    .agreement input {
        margin-right: 8px;
    }
    </style>
</head>
<body>
    <div class="payment-container">
        <h1>결제 정보 확인</h1>
        
        <div class="payment-info">
            <div class="payment-row">
                <span>플랜</span>
                <span><?php echo $plan['plan_name']; ?></span>
            </div>
            <div class="payment-row">
                <span>구독 기간</span>
                <span><?php echo $plan['plan_duration']; ?>일</span>
            </div>
            <div class="payment-row">
                <span>결제 금액</span>
                <span><?php echo number_format($plan['plan_price']); ?>원</span>
            </div>
        </div>

        <h3>결제 수단 선택</h3>
        <div class="payment-methods">
            <div class="payment-method selected" data-method="카드">
                <div>💳</div>
                <div>신용카드</div>
            </div>
            <div class="payment-method" data-method="계좌이체">
                <div>🏦</div>
                <div>계좌이체</div>
            </div>
            <div class="payment-method" data-method="가상계좌">
                <div>📄</div>
                <div>가상계좌</div>
            </div>
        </div>

        <div class="agreement">
            <label>
                <input type="checkbox" id="agree-terms" required>
                결제 서비스 이용약관 및 개인정보 처리방침에 동의합니다.
            </label>
        </div>

        <button id="payment-button" class="btn" style="width: 100%; padding: 16px; font-size: 16px;" disabled>
            <?php echo number_format($plan['plan_price']); ?>원 결제하기
        </button>

        <div style="text-align: center; margin-top: 20px;">
            <a href="premium_plans.php" class="btn secondary">취소</a>
        </div>
    </div>

    <script>
    const clientKey = '<?php echo $toss_client_key; ?>';
    const payment = TossPayments(clientKey);
    
    let selectedMethod = '카드';
    
    // 결제 수단 선택
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            selectedMethod = this.dataset.method;
        });
    });
    
    // 약관 동의 체크
    document.getElementById('agree-terms').addEventListener('change', function() {
        document.getElementById('payment-button').disabled = !this.checked;
    });
    
    // 결제 버튼 클릭
    document.getElementById('payment-button').addEventListener('click', function() {
        payment.requestPayment(selectedMethod, {
            amount: <?php echo $plan['plan_price']; ?>,
            orderId: '<?php echo $order_id; ?>',
            orderName: '<?php echo $plan['plan_name']; ?> 구독',
            customerName: '<?php echo $member['mb_name']; ?>',
            customerEmail: '<?php echo $member['mb_email']; ?>',
            successUrl: window.location.origin + '/video-frame-capture/payment_success.php',
            failUrl: window.location.origin + '/video-frame-capture/payment_fail.php',
        }).catch(function (error) {
            console.error('결제 실패:', error);
            alert('결제 중 오류가 발생했습니다: ' + error.message);
        });
    });
    </script>
</body>
</html>