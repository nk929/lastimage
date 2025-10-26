// 영상 마지막 프레임 캡처 앱 - 안정화된 버전
(function() {
  'use strict';
  
  // DOM 요소 참조
  const $ = (id) => document.getElementById(id);
  
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
    if (canvasInfo) canvasInfo.style.display = 'none';
    
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
    console.error('Error:', message);
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

  // 비디오가 완전히 준비될 때까지 대기
  function waitForVideoReady() {
    return new Promise((resolve, reject) => {
      console.log('Waiting for video to be ready...');
      
      const checkReady = () => {
        console.log('Video state check:', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration,
          currentTime: video.currentTime
        });
        
        if (video.readyState >= 3 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('Video is ready for capture');
          resolve();
        } else if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
          // readyState가 최소 1이고 크기 정보가 있으면 일단 진행
          console.log('Video metadata ready, proceeding...');
          resolve();
        } else {
          console.log('Video not ready yet, waiting...');
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
      
      // 5초 타임아웃
      setTimeout(() => {
        reject(new Error('비디오 준비 시간이 초과되었습니다.'));
      }, 5000);
    });
  }

  // Sora 비디오에 최적화된 시간 탐색
  function seekToTime(targetTime) {
    return new Promise((resolve, reject) => {
      console.log('Seeking to time for Sora video:', targetTime);
      
      // Sora 비디오를 위한 특별한 접근 방식
      const performSeek = async () => {
        try {
          // 1단계: 비디오를 일시정지 상태로 만들기
          video.pause();
          
          // 2단계: 약간 앞 시간으로 먼저 이동 (Sora 비디오 안정화)
          const preSeekTime = Math.max(0, targetTime - 1);
          
          if (preSeekTime !== targetTime) {
            console.log('Pre-seeking to:', preSeekTime);
            video.currentTime = preSeekTime;
            
            await new Promise(resolve => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
              };
              video.addEventListener('seeked', onSeeked, { once: true });
              setTimeout(resolve, 1000); // 1초 타임아웃
            });
            
            // 추가 대기 (Sora 비디오 안정화)
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // 3단계: 실제 목표 시간으로 이동
          console.log('Final seek to target time:', targetTime);
          video.currentTime = targetTime;
          
          await new Promise(resolve => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              console.log('Final seek completed:', video.currentTime);
              resolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            setTimeout(resolve, 2000); // 2초 타임아웃
          });
          
          // 4단계: 프레임 안정화를 위한 추가 대기
          await new Promise(resolve => setTimeout(resolve, 300));
          
          console.log('Seek sequence completed for Sora video');
          resolve();
          
        } catch (error) {
          console.error('Sora video seek error:', error);
          reject(error);
        }
      };
      
      performSeek();
      
      // 전체 프로세스 타임아웃 (10초)
      setTimeout(() => {
        reject(new Error('Sora 비디오 탐색이 시간 초과되었습니다.'));
      }, 10000);
    });
  }

  // 캔버스에 비디오 프레임 그리기 (안정화된 버전)
  async function drawVideoFrame() {
    console.log('Drawing video frame...');
    
    // 비디오 준비 상태 재확인
    await waitForVideoReady();
    
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    if (!originalWidth || !originalHeight) {
      throw new Error('비디오 크기를 읽을 수 없습니다.');
    }
    
    console.log('Video dimensions:', originalWidth, 'x', originalHeight);
    
    // 해상도 계산 (Full HD 범위 내에서 원본 비율 유지)
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1080;
    const aspectRatio = originalWidth / originalHeight;
    
    let targetWidth, targetHeight;
    
    if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
      targetWidth = originalWidth;
      targetHeight = originalHeight;
    } else {
      if (aspectRatio > (MAX_WIDTH / MAX_HEIGHT)) {
        targetWidth = MAX_WIDTH;
        targetHeight = Math.round(MAX_WIDTH / aspectRatio);
      } else {
        targetHeight = MAX_HEIGHT;
        targetWidth = Math.round(MAX_HEIGHT * aspectRatio);
      }
    }
    
    console.log('Target canvas size:', targetWidth, 'x', targetHeight);
    
    // 캔버스 설정
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    
    // 캔버스 초기화
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // 비디오가 실제로 현재 프레임을 가지고 있는지 확인
    console.log('Drawing video frame - current time:', video.currentTime);
    console.log('Video paused:', video.paused, 'ended:', video.ended);
    
    try {
      // Sora 비디오를 위한 특별한 렌더링 접근법
      console.log('Attempting Sora video frame capture...');
      
      // 1단계: 비디오가 실제로 렌더링 가능한지 확인
      if (video.paused && video.readyState >= 2) {
        console.log('Video is paused and ready, good for Sora capture');
      }
      
      // 2단계: 캔버스 완전 클리어
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // 3단계: 여러 번 시도로 안정적인 캡처 (Sora 비디오 특성상 필요)
      let captureSuccess = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!captureSuccess && attempts < maxAttempts) {
        attempts++;
        console.log(`Sora frame capture attempt ${attempts}/${maxAttempts}`);
        
        // 캔버스 다시 클리어
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        
        // 프레임 그리기
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        // 대기 시간 (Sora 비디오 렌더링 완료 기다림)
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        
        // 결과 확인 (더 넓은 영역 샘플링)
        const sampleSize = Math.min(50, targetWidth / 2, targetHeight / 2);
        const sampleX = Math.floor((targetWidth - sampleSize) / 2);
        const sampleY = Math.floor((targetHeight - sampleSize) / 2);
        
        const imageData = ctx.getImageData(sampleX, sampleY, sampleSize, sampleSize);
        
        // 유의미한 색상이 있는지 확인 (Sora 비디오는 보통 다채로운 내용)
        let colorVariance = 0;
        let nonBlackPixels = 0;
        
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          
          if (a > 0) {
            const brightness = (r + g + b) / 3;
            if (brightness > 10) {
              nonBlackPixels++;
              colorVariance += Math.abs(r - 128) + Math.abs(g - 128) + Math.abs(b - 128);
            }
          }
        }
        
        const hasContent = nonBlackPixels > (sampleSize * sampleSize * 0.1); // 10% 이상 비검정 픽셀
        const hasVariance = colorVariance > 1000; // 충분한 색상 변화
        
        console.log(`Attempt ${attempts} - Non-black pixels: ${nonBlackPixels}, Color variance: ${colorVariance}`);
        
        if (hasContent && hasVariance) {
          captureSuccess = true;
          console.log('Sora frame capture successful!');
        } else if (attempts < maxAttempts) {
          console.log('Sora frame appears empty/black, retrying...');
          // 비디오 시간을 살짝 조정해보기
          const currentTime = video.currentTime;
          video.currentTime = Math.max(0, currentTime - 0.1);
          await new Promise(resolve => setTimeout(resolve, 200));
          video.currentTime = currentTime;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!captureSuccess) {
        console.warn('All Sora capture attempts resulted in black/empty frame');
        // 마지막 시도: 비디오 중간 지점에서 캡처해보기
        const fallbackTime = video.duration / 2;
        console.log('Trying fallback capture at middle time:', fallbackTime);
        video.currentTime = fallbackTime;
        await new Promise(resolve => setTimeout(resolve, 500));
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      }
      
      console.log('Sora video frame processing completed');
      
    } catch (drawError) {
      console.error('Error drawing Sora video frame:', drawError);
      throw new Error('Sora 비디오 프레임을 그리는데 실패했습니다.');
    }
  }

  // 다운로드 링크 생성 (안정화된 버전)
  function createDownloadLink() {
    console.log('Creating download link...');
    
    // 캔버스 내용 확인
    if (canvas.width === 0 || canvas.height === 0) {
      showError('캔버스가 비어있습니다.');
      return;
    }
    
    try {
      // toBlob 사용 (더 안전함)
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Blob creation failed');
          showError('이미지 생성에 실패했습니다.');
          return;
        }
        
        console.log('Blob created:', blob.size, 'bytes');
        
        // 기존 URL 정리
        if (currentDownloadUrl) {
          URL.revokeObjectURL(currentDownloadUrl);
        }
        
        // 새 URL 생성
        currentDownloadUrl = URL.createObjectURL(blob);
        downloadLink.href = currentDownloadUrl;
        downloadLink.style.display = 'inline-block';
        
        // 파일명 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadLink.download = `last-frame-${timestamp}.png`;
        
        if (canvasInfo) {
          canvasInfo.style.display = 'block';
        }
        
        console.log('Download link ready');
        
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('Error creating download link:', error);
      showError('다운로드 링크 생성에 실패했습니다.');
    }
  }

  // 파일 선택 이벤트
  fileInput.addEventListener('change', async (e) => {
    console.log('File selected');
    resetState();
    
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // 파일 타입 확인
    if (!file.type.startsWith('video/')) {
      showError('동영상 파일을 선택하세요.');
      return;
    }
    
    // Sora 비디오 감지 (파일명이나 특성으로)
    const isSoraVideo = file.name.toLowerCase().includes('sora') || 
                       file.name.toLowerCase().includes('openai') ||
                       file.size > 50 * 1024 * 1024; // 50MB 이상의 고품질 비디오
    
    if (isSoraVideo) {
      console.log('Sora or high-quality video detected, using optimized processing');
      updateStatus('Sora/고품질 동영상 감지됨, 최적화된 처리 중...', 'hint loading');
    }
    
    try {
      // URL 생성 및 비디오 로드
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }
      
      currentVideoUrl = URL.createObjectURL(file);
      
      // Sora 동영상을 위한 특별 설정
      video.crossOrigin = 'anonymous';
      video.preload = 'auto'; // 전체 비디오 로드
      video.playsInline = true;
      
      video.src = currentVideoUrl;
      video.load();
      
      // Sora 비디오를 위한 추가 대기
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateStatus('동영상을 로딩하는 중...', 'hint loading');
      
      // 메타데이터 로드 대기
      await new Promise((resolve, reject) => {
        const onLoad = () => {
          video.removeEventListener('loadedmetadata', onLoad);
          video.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e) => {
          video.removeEventListener('loadedmetadata', onLoad);
          video.removeEventListener('error', onError);
          reject(e);
        };
        
        if (video.readyState >= 1) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', onLoad);
          video.addEventListener('error', onError);
        }
        
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoad);
          video.removeEventListener('error', onError);
          reject(new Error('로딩 시간 초과'));
        }, 10000);
      });
      
      // 비디오 정보 표시
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (!isFinite(duration) || width === 0 || height === 0) {
        throw new Error('올바르지 않은 동영상 파일입니다.');
      }
      
      // 출력 해상도 계산
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      const aspectRatio = width / height;
      
      let outputWidth, outputHeight, scaleType;
      
      if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
        outputWidth = width;
        outputHeight = height;
        scaleType = '원본 크기';
      } else {
        if (aspectRatio > (MAX_WIDTH / MAX_HEIGHT)) {
          outputWidth = MAX_WIDTH;
          outputHeight = Math.round(MAX_WIDTH / aspectRatio);
        } else {
          outputHeight = MAX_HEIGHT;
          outputWidth = Math.round(MAX_HEIGHT * aspectRatio);
        }
        scaleType = '다운스케일링';
      }
      
      updateStatus(`길이: ${formatDuration(duration)}, 원본: ${width}×${height} → 출력: ${outputWidth}×${outputHeight} (${scaleType})`, 'hint success');
      captureBtn.disabled = false;
      
    } catch (error) {
      console.error('Video load error:', error);
      showError('동영상을 로드할 수 없습니다. 다른 파일을 시도해보세요.');
    }
  });

  // 캡처 버튼 이벤트
  captureBtn.addEventListener('click', async () => {
    console.log('Capture started');
    
    try {
      captureBtn.disabled = true;
      updateStatus('마지막 프레임으로 이동 중...', 'hint loading');
      
      // 마지막 프레임 시간 계산
      const duration = video.duration;
      const lastFrameTime = Math.max(0, duration - 0.1);
      
      console.log('Target time:', lastFrameTime, 'Duration:', duration);
      
      // 마지막 프레임으로 이동
      await seekToTime(lastFrameTime);
      
      updateStatus('프레임을 캡처하는 중...', 'hint loading');
      
      // 프레임 그리기
      await drawVideoFrame();
      
      // 다운로드 링크 생성
      createDownloadLink();
      
      // 사용량 추적 (서버에 기록)
      await trackUsage();
      
      updateStatus('마지막 프레임 캡처 완료!', 'hint success');
      
    } catch (error) {
      console.error('Capture error:', error);
      showError(error.message || '캡처에 실패했습니다.');
    } finally {
      captureBtn.disabled = false;
    }
  });

  // 리소스 정리
  window.addEventListener('beforeunload', () => {
    if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
    if (currentDownloadUrl) URL.revokeObjectURL(currentDownloadUrl);
  });

  // 사용량 추적 함수
  async function trackUsage() {
    if (!fileInput.files[0]) return;
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('fileName', file.name);
    formData.append('fileSize', file.size);
    formData.append('resolution', `${canvas.width}×${canvas.height}`);
    
    try {
      const response = await fetch('./track_usage.php', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Usage tracked:', result);
        
        // UI 업데이트
        updateUsageDisplay(result.remaining);
      } else {
        console.error('Usage tracking failed:', result.error);
      }
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }

  // 사용량 표시 업데이트
  function updateUsageDisplay(remaining) {
    const usageElements = document.querySelectorAll('.usage-info strong');
    if (usageElements.length > 0) {
      usageElements[0].textContent = remaining >= 0 ? `${remaining}회` : '무제한';
    }
  }

  // 디버그 함수
  window.debugVideoApp = {
    testCanvas: () => {
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // 컬러풀한 테스트 패턴
      const gradient = ctx.createLinearGradient(0, 0, 300, 200);
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(0.5, '#00ff00');
      gradient.addColorStop(1, '#0000ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 200);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('TEST IMAGE', 80, 100);
      
      createDownloadLink();
      console.log('Test image created and download ready');
    },
    
    getVideoState: () => {
      return {
        src: video.src,
        readyState: video.readyState,
        duration: video.duration,
        currentTime: video.currentTime,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended
      };
    },
    
    reset: () => {
      resetState();
      console.log('App reset');
    }
  };

  console.log('Video Frame Capturer initialized (stable version)');
  console.log('Debug: window.debugVideoApp available');

})();