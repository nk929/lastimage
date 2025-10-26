<?php
// 프리미엄 기능 관련 함수들

/**
 * 회원의 구독 상태 확인
 */
function check_premium_status($mb_id) {
    global $g5;
    
    $sql = "SELECT mb_premium_type, mb_premium_end, mb_capture_count, mb_capture_date 
            FROM {$g5['member_table']} 
            WHERE mb_id = '$mb_id'";
    $result = sql_fetch($sql);
    
    if (!$result) return false;
    
    // 구독 만료 확인
    if ($result['mb_premium_type'] != 'free' && $result['mb_premium_end']) {
        if (strtotime($result['mb_premium_end']) < time()) {
            // 구독 만료 처리
            expire_premium_membership($mb_id);
            $result['mb_premium_type'] = 'free';
        }
    }
    
    return $result;
}

/**
 * 구독 만료 처리
 */
function expire_premium_membership($mb_id) {
    global $g5;
    
    $sql = "UPDATE {$g5['member_table']} SET 
            mb_premium_type = 'free',
            mb_premium_end = NULL,
            mb_premium_auto = 0
            WHERE mb_id = '$mb_id'";
    sql_query($sql);
}

/**
 * 오늘 캡처 횟수 확인 및 업데이트
 */
function check_daily_limit($mb_id) {
    global $g5;
    
    $member_info = check_premium_status($mb_id);
    if (!$member_info) return false;
    
    $today = date('Y-m-d');
    
    // 날짜가 바뀌면 카운트 리셋
    if ($member_info['mb_capture_date'] != $today) {
        $sql = "UPDATE {$g5['member_table']} SET 
                mb_capture_count = 0,
                mb_capture_date = '$today'
                WHERE mb_id = '$mb_id'";
        sql_query($sql);
        $member_info['mb_capture_count'] = 0;
    }
    
    // 플랜별 제한 확인
    $plan_sql = "SELECT daily_limit FROM g5_premium_plans WHERE plan_id = '{$member_info['mb_premium_type']}'";
    $plan = sql_fetch($plan_sql);
    
    if ($plan['daily_limit'] > 0 && $member_info['mb_capture_count'] >= $plan['daily_limit']) {
        return false; // 일일 제한 초과
    }
    
    return true;
}

/**
 * 캡처 횟수 증가
 */
function increment_capture_count($mb_id, $file_info = array()) {
    global $g5;
    
    $today = date('Y-m-d');
    
    // 캡처 카운트 증가
    $sql = "UPDATE {$g5['member_table']} SET 
            mb_capture_count = mb_capture_count + 1,
            mb_capture_date = '$today'
            WHERE mb_id = '$mb_id'";
    sql_query($sql);
    
    // 사용량 로그 기록
    $file_name = isset($file_info['name']) ? addslashes($file_info['name']) : '';
    $file_size = isset($file_info['size']) ? (int)$file_info['size'] : 0;
    $resolution = isset($file_info['resolution']) ? addslashes($file_info['resolution']) : '';
    $ip = $_SERVER['REMOTE_ADDR'];
    $user_agent = addslashes($_SERVER['HTTP_USER_AGENT']);
    
    $log_sql = "INSERT INTO g5_usage_log 
                (mb_id, action_type, file_name, file_size, resolution, ip_address, user_agent) 
                VALUES 
                ('$mb_id', 'capture', '$file_name', $file_size, '$resolution', '$ip', '$user_agent')";
    sql_query($log_sql);
}

/**
 * 구독 플랜 정보 가져오기
 */
function get_premium_plans() {
    $sql = "SELECT * FROM g5_premium_plans WHERE is_active = 1 ORDER BY plan_price ASC";
    return sql_query($sql);
}

/**
 * 결제 완료 후 구독 활성화
 */
function activate_premium($mb_id, $plan_id, $payment_info) {
    global $g5;
    
    // 플랜 정보 조회
    $plan_sql = "SELECT * FROM g5_premium_plans WHERE plan_id = '$plan_id'";
    $plan = sql_fetch($plan_sql);
    
    if (!$plan) return false;
    
    // 구독 시작일과 종료일 계산
    $start_date = date('Y-m-d');
    $end_date = date('Y-m-d', strtotime("+{$plan['plan_duration']} days"));
    
    // 회원 정보 업데이트
    $sql = "UPDATE {$g5['member_table']} SET 
            mb_premium_type = '$plan_id',
            mb_premium_start = '$start_date',
            mb_premium_end = '$end_date',
            mb_premium_auto = " . (int)$payment_info['auto_payment'] . "
            WHERE mb_id = '$mb_id'";
    sql_query($sql);
    
    // 결제 내역 업데이트
    $payment_sql = "UPDATE g5_payment_history SET 
                   payment_status = 'completed',
                   paid_at = NOW()
                   WHERE payment_id = '{$payment_info['payment_id']}'";
    sql_query($payment_sql);
    
    return true;
}

/**
 * 회원의 남은 캡처 횟수 계산
 */
function get_remaining_captures($mb_id) {
    $member_info = check_premium_status($mb_id);
    if (!$member_info) return 0;
    
    // 플랜 정보 조회
    $plan_sql = "SELECT daily_limit FROM g5_premium_plans WHERE plan_id = '{$member_info['mb_premium_type']}'";
    $plan = sql_fetch($plan_sql);
    
    if ($plan['daily_limit'] == 0) return -1; // 무제한
    
    $today = date('Y-m-d');
    $used = ($member_info['mb_capture_date'] == $today) ? $member_info['mb_capture_count'] : 0;
    
    return max(0, $plan['daily_limit'] - $used);
}
?>