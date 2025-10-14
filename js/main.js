// 영상 마지막 프레임 캡처 앱 - 최적화된 버전
(function() {
  'use strict';
  
  // DOM 요소 참조 (간결한 헬퍼 함수)
  const $ = (id) => document.getElementById(id);
  
  // 주요 DOM 요소들
  const fileInput = $('file');
  const video = $('video');
  const canvas = $('canvas');
  const captureBtn = $('captureBtn');
  const downloadLink = $('download');
  const status = $('status');
  const errorMsg = $('err');
  const canvasInfo = $('canvasInfo');
  
  // 상태 관리 변수
  let currentVideoUrl = null;
  let currentDownloadUrl = null;

  // 초기 상태로 리셋
  function resetState() {
    captureBtn.disabled = true;
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
    status.textContent = '파일을 선택하세요.';
    status.className = 'hint';
    downloadLink.style.display = 'none';
    canvasInfo.style.display = 'none';
    
    // 캔버스 클리어
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    
    // URL 정리
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
      currentDownloadUrl = null;
    }
  }

  // 에러 표시
  function showError(message) {
    errorMsg.style.display = 'block';
    errorMsg.textContent = message;
    status.textContent = '오류 발생';
    status.className = 'hint error';
  }

  // 상태 메시지 업데이트
  function updateStatus(message, className = 'hint') {
    status.textContent = message;
    status.className = className;
  }

  // 시간을 포맷팅
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // 특정 시간으로 비디오 이동
  function seekToTime(targetTime) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      const handleSeeked = () => {
        cleanup();
        resolve();
      };
      
      const handleError = (e) => {
        cleanup();
        reject(e);
      };
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
      };
      
      // 이벤트 리스너 등록
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);
      
      // 시간 설정
      video.currentTime = targetTime;
      
      // 타임아웃 설정 (8초)
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('시간 탐색이 시간 초과되었습니다.'));
      }, 8000);
    });
  }

  // 캔버스에 비디오 프레임 그리기
  function drawVideoFrame() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    
    console.log(`Frame drawn: ${w}×${h} at ${video.currentTime.toFixed(2)}s`);
  }

  // 다운로드 링크 생성
  function createDownloadLink() {
    canvas.toBlob((blob) => {
      if (!blob) {
        showError('이미지 생성에 실패했습니다.');
        return;
      }
      
      // 기존 다운로드 URL 정리
      if (currentDownloadUrl) {
        URL.revokeObjectURL(currentDownloadUrl);
      }
      
      // 새 다운로드 URL 생성
      currentDownloadUrl = URL.createObjectURL(blob);
      downloadLink.href = currentDownloadUrl;
      downloadLink.style.display = 'inline-block';
      
      // 타임스탬프를 포함한 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      downloadLink.download = `last-frame-${timestamp}.png`;
      
      canvasInfo.style.display = 'block';
      
    }, 'image/png', 0.95);
  }

  // 파일 선택 이벤트 처리
  fileInput.addEventListener('change', async () => {
    resetState();
    
    const file = fileInput.files?.[0];
    if (!file) return;
    
    // 비디오 파일 타입 확인
    if (!file.type.startsWith('video/')) {
      showError('동영상 파일만 업로드할 수 있습니다.');
      return;
    }
    
    // URL 정리 및 새 URL 생성
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }
    currentVideoUrl = URL.createObjectURL(file);
    video.src = currentVideoUrl;
    
    updateStatus('메타데이터 로딩 중...', 'hint loading');
    
    try {
      // 메타데이터 로드 대기
      await new Promise((resolve, reject) => {
        const handleLoad = () => {
          cleanup();
          resolve();
        };
        
        const handleError = (e) => {
          cleanup();
          reject(e);
        };
        
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', handleLoad);
          video.removeEventListener('error', handleError);
        };
        
        video.addEventListener('loadedmetadata', handleLoad);
        video.addEventListener('error', handleError);
      });
      
      // 메타데이터 정보 표시
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (!isFinite(duration)) {
        throw new Error('동영상 길이를 확인할 수 없습니다.');
      }
      
      updateStatus(`길이: ${formatDuration(duration)}, 해상도: ${width}×${height}`, 'hint success');
      captureBtn.disabled = false;
      
    } catch (error) {
      console.error('Video load error:', error);
      showError('메타데이터를 읽을 수 없습니다. 브라우저가 해당 코덱을 지원하지 않을 수 있습니다.');
    }
  });

  // 캡처 버튼 이벤트 처리
  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      updateStatus('마지막 프레임으로 이동 중...', 'hint loading');
      
      // 마지막 프레임 시간 계산 (0.05초 앞에서 캡처)
      const duration = video.duration;
      if (!isFinite(duration)) {
        throw new Error('동영상 길이를 알 수 없습니다.');
      }
      
      const lastFrameTime = Math.max(0, duration - 0.05);
      
      // 마지막 프레임으로 이동
      await seekToTime(lastFrameTime);
      
      // 프레임 그리기 및 다운로드 링크 생성
      drawVideoFrame();
      createDownloadLink();
      
      updateStatus('마지막 프레임 캡처 완료!', 'hint success');
      
    } catch (error) {
      console.error('Capture error:', error);
      showError('지정 시점으로 이동에 실패했습니다. 브라우저나 코덱 제한일 수 있습니다.');
    } finally {
      captureBtn.disabled = false;
    }
  });

  // 페이지 언로드 시 리소스 정리
  window.addEventListener('beforeunload', () => {
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
    }
  });

  // 앱 초기화 로그
  console.log('Video Frame Capturer App initialized (optimized version)');

})();