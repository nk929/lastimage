# 그누보드 설치 가이드

## 📋 설치 방법

### 1. 파일 업로드
그누보드 루트 디렉토리에 `video-frame-capture` 폴더를 만들고 다음 파일들을 업로드:

```
/your-gnuboard-root/
├── video-frame-capture/
│   ├── auth_check.php      # 그누보드 인증 연동 메인 파일
│   ├── index.html          # 원본 HTML (직접 접근 차단됨)
│   ├── .htaccess           # 보안 설정
│   ├── css/
│   │   └── style.css       # 스타일시트
│   └── js/
│       └── main.js         # JavaScript 로직
└── ...
```

### 2. 접근 URL
설치 후 다음 URL로 접근:
```
https://your-domain.com/video-frame-capture/
```

## 🔐 접근 권한 설정

### A. 모든 로그인 회원 허용
`auth_check.php`에서 다음 부분 주석 처리:
```php
// 특정 레벨 제한 주석 처리
/*
if ($member['mb_level'] < 2) {
    alert('접근 권한이 없습니다.');
    exit;
}
*/

// 특정 사용자 제한 주석 처리
/*
$allowed_users = array('admin', 'user1', 'user2');
if (!in_array($member['mb_id'], $allowed_users)) {
    alert('접근 권한이 없습니다.');
    exit;
}
*/
```

### B. 특정 회원 레벨만 허용
```php
// 레벨 5 이상만 접근 허용
if ($member['mb_level'] < 5) {
    alert('접근 권한이 없습니다. (레벨 5 이상 필요)');
    exit;
}
```

### C. 특정 회원 ID만 허용
```php
// 허용할 사용자 ID 목록
$allowed_users = array('admin', 'manager', 'editor');
if (!in_array($member['mb_id'], $allowed_users)) {
    alert('접근 권한이 없습니다.');
    exit;
}
```

### D. 특정 그룹만 허용 (그룹 기능 사용 시)
```php
// 특정 그룹 ID만 접근 허용
$allowed_groups = array('video_editors', 'content_managers');
if (!in_array($member['mb_group'], $allowed_groups)) {
    alert('접근 권한이 없습니다.');
    exit;
}
```

## ⚙️ 설정 옵션

### 1. 경로 수정
그누보드가 서브 디렉토리에 설치된 경우 `auth_check.php` 수정:
```php
// 예: /board/ 디렉토리에 그누보드 설치된 경우
include_once('../_common.php');
```

### 2. 리다이렉트 URL 수정
```php
goto_url(G5_BBS_URL.'/login.php?url='.urlencode(G5_HTTP_BBS_URL.'/video-frame-capture/'));
```

### 3. 알림 메시지 커스터마이징
```php
alert('접근 권한이 없습니다. 관리자에게 문의하세요.');
```

## 🛡️ 보안 고려사항

### 1. .htaccess 보안
- `index.html` 직접 접근 차단
- PHP를 통한 인증된 접근만 허용
- 파일 브라우징 금지

### 2. 세션 보안
- 그누보드의 기본 세션 보안 활용
- CSRF 토큰 검증 (필요시)
- IP 기반 추가 검증 (선택사항)

### 3. 파일 업로드 보안
- 클라이언트 사이드 처리로 서버 업로드 없음
- 브라우저 내에서만 처리되어 안전

## 🔧 문제 해결

### Q. 접근 시 오류 발생
**A.** `_common.php` 경로 확인:
```php
// 그누보드 루트에 설치된 경우
include_once('../_common.php');

// 서브디렉토리에 설치된 경우
include_once('../../_common.php');
```

### Q. 로그인 후에도 접근 안됨
**A.** 회원 레벨 또는 권한 설정 확인:
```php
// 디버깅용 코드 (임시 사용)
echo "회원 레벨: " . $member['mb_level'];
echo "회원 ID: " . $member['mb_id'];
exit; // 확인 후 제거
```

### Q. CSS/JS 파일이 로드되지 않음
**A.** 파일 권한 확인 (644) 및 경로 확인

## 🚀 배포 완료 체크리스트

- [ ] 파일 업로드 완료
- [ ] 그누보드 경로 설정 확인
- [ ] 접근 권한 설정 완료
- [ ] .htaccess 보안 설정 적용
- [ ] 테스트 계정으로 접근 확인
- [ ] 권한이 없는 계정으로 차단 확인
- [ ] 앱 기능 정상 작동 확인

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 그누보드 버전 호환성
2. PHP 버전 (7.0 이상 권장)
3. 웹서버 설정 (.htaccess 지원)
4. 파일 권한 설정