<?php
// 그누보드 설정 파일 포함
include_once('./_common.php');
include_once('./premium_functions.php');

// 로그인 체크
if (!$is_member) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    goto_url(G5_BBS_URL.'/login.php?url='.urlencode(G5_HTTP_BBS_URL.'/video-frame-capture/'));
    exit;
}

// 구독 상태 확인
$premium_info = check_premium_status($member['mb_id']);
if (!$premium_info) {
    alert('회원 정보를 확인할 수 없습니다.');
    exit;
}

// 일일 사용 제한 확인
$remaining_captures = get_remaining_captures($member['mb_id']);

// 무료 회원 제한 확인
if ($premium_info['mb_premium_type'] == 'free' && $remaining_captures == 0) {
    echo "<script>
    if(confirm('오늘의 무료 사용 횟수(3회)를 모두 사용했습니다.\\n프리미엄으로 업그레이드하시겠습니까?')) {
        location.href = './premium_plans.php';
    } else {
        history.back();
    }
    </script>";
    exit;
}

// 구독 만료 알림
if ($premium_info['mb_premium_type'] != 'free' && $premium_info['mb_premium_end']) {
    $days_left = floor((strtotime($premium_info['mb_premium_end']) - time()) / 86400);
    if ($days_left <= 3 && $days_left > 0) {
        $expire_notice = "구독이 {$days_left}일 후 만료됩니다.";
    }
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>영상 마지막 프레임 캡처 앱 ver 1.2</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="wrap">
        <header>
            <h1>영상 마지막 프레임 캡처 <span class="version">ver 1.2</span></h1>
            <p>동영상을 업로드하면 <strong>마지막 프레임</strong>을 이미지로 저장합니다. (로컬에서만 처리, 서버 전송 없음)</p>
            
            <div class="user-info">
                <div class="user-details">
                    <span>접속자: <strong><?php echo $member['mb_nick']; ?></strong></span>
                    <span class="plan-badge plan-<?php echo $premium_info['mb_premium_type']; ?>">
                        <?php 
                        $plan_names = ['free' => '무료', 'premium' => '프리미엄', 'enterprise' => '기업용'];
                        echo $plan_names[$premium_info['mb_premium_type']];
                        ?>
                    </span>
                </div>
                <div class="usage-info">
                    <?php if ($remaining_captures >= 0): ?>
                        <span>남은 횟수: <strong><?php echo $remaining_captures; ?>회</strong></span>
                    <?php else: ?>
                        <span>무제한 사용</span>
                    <?php endif; ?>
                    
                    <?php if (isset($expire_notice)): ?>
                        <span class="expire-notice"><?php echo $expire_notice; ?></span>
                    <?php endif; ?>
                </div>
                <div class="user-actions">
                    <a href="premium_plans.php" class="premium-btn">구독 관리</a>
                    <a href="<?php echo G5_BBS_URL; ?>/logout.php" class="logout-btn">로그아웃</a>
                </div>
            </div>
        </header>

        <main>
            <div class="card">
                <div class="row">
                    <div class="panel">
                        <label for="file" class="hint">동영상 선택 (MP4, WebM 등 브라우저 지원 코덱)</label>
                        <input id="file" type="file" accept="video/*" />
                        <button id="captureBtn" class="btn" disabled>마지막 프레임 캡처</button>
                        <p id="status" class="hint">파일을 선택하세요.</p>
                        <p id="err" class="error" hidden></p>
                        <a id="download" class="btn download-btn" download="last-frame.png" style="display:none;">이미지 다운로드</a>

                        <details>
                            <summary>코덱이 재생되지 않으면?</summary>
                            <p class="hint">모바일 사파리 등에서 <code>HEVC/H.265</code> 같은 형식은 미지원일 수 있습니다. 이 경우 서버에서 <code>ffmpeg</code>로 호환 포맷(H.264 등)으로 변환하거나, <code>ffmpeg.wasm</code>을 사용할 수 있습니다.</p>
                        </details>
                    </div>
                    <div class="panel">
                        <canvas id="canvas" class="preview" width="0" height="0"></canvas>
                        <p class="hint canvas-info" id="canvasInfo" style="display:none;">캡처된 이미지 미리보기</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- 화면에 보이지 않는 비디오 요소 -->
        <video id="video" class="hidden" playsinline preload="metadata" muted></video>

        <footer>
            <p>Made by <strong>AI 5678</strong> Video Frame Capture App • All processing runs in your browser.</p>
        </footer>
    </div>

    <script src="js/main.js"></script>
</body>
</html>