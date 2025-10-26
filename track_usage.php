<?php
include_once('./_common.php');
include_once('./premium_functions.php');

// AJAX 요청만 처리
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!$is_member) {
    http_response_code(401);
    echo json_encode(['error' => '로그인이 필요합니다.']);
    exit;
}

// 사용 제한 확인
if (!check_daily_limit($member['mb_id'])) {
    http_response_code(429);
    echo json_encode(['error' => '일일 사용 제한을 초과했습니다.']);
    exit;
}

// 파일 정보 받기
$file_info = [
    'name' => $_POST['fileName'] ?? '',
    'size' => (int)($_POST['fileSize'] ?? 0),
    'resolution' => $_POST['resolution'] ?? ''
];

// 사용량 기록
increment_capture_count($member['mb_id'], $file_info);

// 남은 사용량 반환
$remaining = get_remaining_captures($member['mb_id']);

echo json_encode([
    'success' => true,
    'remaining' => $remaining,
    'message' => '캡처가 완료되었습니다.'
]);
?>