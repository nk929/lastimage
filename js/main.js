// Image Prompt Builder - Main JavaScript

class ImagePromptBuilder {
    constructor() {
        this.selectedOptions = {
            subject: new Set(),
            description: new Set(),
            style: new Set(),
            camera: new Set(),
            aspectratio: null, // 단일 선택값
            lighting: new Set(),
            quality: new Set()
        };
        
        this.translationTimer = null;
        
        // 이전 상태 저장을 위한 변수들
        this.previousEnglishText = '';
        this.previousKoreanText = '';
        
        // 현재 매핑 관계 저장
        this.currentMappings = {
            'en-to-ko': new Map(),
            'ko-to-en': new Map()
        };

        this.optionTranslations = {
            // Subject translations
            'person': 'person',
            'animal': 'animal',
            'landscape': 'landscape',
            'architecture': 'architecture',
            'object': 'object',
            'vehicle': 'vehicle',
            'food': 'food',
            'abstract': 'abstract concept',

            // Description translations
            'beautiful': 'beautiful',
            'detailed': 'highly detailed',
            'realistic': 'realistic',
            'elegant': 'elegant',
            'dramatic': 'dramatic',
            'vintage': 'vintage',
            'futuristic': 'futuristic',
            'colorful': 'colorful',
            'minimalist': 'minimalist',

            // Style translations
            'photorealistic': 'photorealistic',
            'anime': 'anime style',
            'oil_painting': 'oil painting',
            'watercolor': 'watercolor painting',
            'digital_art': 'digital art',
            'sketch': 'pencil sketch',
            'cartoon': 'cartoon style',
            'concept_art': 'concept art',

            // Camera translations
            'close_up': 'close-up shot',
            'medium_shot': 'medium shot',
            'wide_shot': 'wide shot',
            'birds_eye': 'bird\'s eye view',
            'low_angle': 'low angle',
            'high_angle': 'high angle',
            'front_view': 'front view',
            'side_view': 'side view',

            // Aspect Ratio translations
            'square': '--ar 1:1',
            'landscape': '--ar 4:3',
            'widescreen': '--ar 16:9',
            'portrait': '--ar 9:16',
            'standard': '--ar 3:4',
            'ultrawide': '--ar 21:9',
            'cinema': '--ar 2.35:1',
            'banner': '--ar 3:1',

            // Lighting translations
            'natural': 'natural lighting',
            'golden_hour': 'golden hour lighting',
            'blue_hour': 'blue hour lighting',
            'studio': 'studio lighting',
            'dramatic': 'dramatic lighting',
            'soft': 'soft lighting',
            'backlit': 'backlit',
            'neon': 'neon lighting',

            // Quality translations
            'highly_detailed': 'highly detailed',
            'masterpiece': 'masterpiece',
            'best_quality': 'best quality',
            '8k': '8k resolution',
            'sharp_focus': 'sharp focus',
            'professional': 'professional photography',
            'award_winning': 'award winning',
            'trending': 'trending on artstation'
        };

        this.init();
    }

    init() {
        // Add event listeners for custom inputs
        this.setupCustomInputListeners();
        
        // Add event listeners for generated prompt editing
        this.setupPromptEditListeners();
        

        
        // Initial stats update
        this.updateStats();
        
        // Auto-generate prompt on any change
        this.setupAutoGeneration();
    }

    setupCustomInputListeners() {
        const customInputs = [
            'subject-custom', 'description-custom', 'style-custom', 
            'camera-custom', 'lighting-custom', 'quality-custom'
        ];
        
        customInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.generatePrompt();
                    this.updateStats();
                });
            }
        });
    }

    setupPromptEditListeners() {
        const englishPrompt = document.getElementById('generated-english');
        const koreanPrompt = document.getElementById('generated-korean');
        
        if (englishPrompt) {
            // 초기 상태 저장
            this.previousEnglishText = englishPrompt.value;
            
            // 입력 이벤트 처리
            englishPrompt.addEventListener('input', () => {
                this.updateWordCount();
                englishPrompt.dataset.userEdited = 'true';
                
                // 영문 프롬프트 수정 시 한글로 번역
                this.handleBidirectionalTranslation(englishPrompt.value, 'english-to-korean');
            });
            
            // 붙여넣기 이벤트 처리
            englishPrompt.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.updateWordCount();
                    englishPrompt.dataset.userEdited = 'true';
                    
                    // 붙여넣기된 내용을 한글로 번역
                    this.handleBidirectionalTranslation(englishPrompt.value, 'english-to-korean');
                }, 10);
            });
            
            // 포커스 잃을 때 사용자 편집 플래그 제거
            englishPrompt.addEventListener('blur', () => {
                setTimeout(() => {
                    delete englishPrompt.dataset.userEdited;
                }, 1000);
            });
        }
        
        if (koreanPrompt) {
            // 초기 상태 저장
            this.previousKoreanText = koreanPrompt.value;
            
            // 입력 이벤트 처리
            koreanPrompt.addEventListener('input', () => {
                this.updateWordCount();
                koreanPrompt.dataset.userEdited = 'true';
                
                // 한글 프롬프트 수정 시 영문으로 번역
                this.handleBidirectionalTranslation(koreanPrompt.value, 'korean-to-english');
            });
            
            // 붙여넣기 이벤트 처리
            koreanPrompt.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.updateWordCount();
                    koreanPrompt.dataset.userEdited = 'true';
                    
                    // 붙여넣기된 내용을 영문으로 번역
                    this.handleBidirectionalTranslation(koreanPrompt.value, 'korean-to-english');
                }, 10);
            });
            
            // 포커스 잃을 때 사용자 편집 플래그 제거
            koreanPrompt.addEventListener('blur', () => {
                setTimeout(() => {
                    delete koreanPrompt.dataset.userEdited;
                }, 1000);
            });
        }
    }

    handleBidirectionalTranslation(text, direction) {
        // Clear previous debounce timer
        if (this.translationTimer) {
            clearTimeout(this.translationTimer);
        }

        // 즉시 번역 시도 (빠른 반응성을 위해)
        if (direction === 'english-to-korean') {
            this.translateEnglishPromptToKorean(text);
        } else if (direction === 'korean-to-english') {
            this.translateKoreanPromptToEnglish(text);
        }

        // 추가적인 정밀 번역을 위한 디바운스
        this.translationTimer = setTimeout(() => {
            if (direction === 'english-to-korean') {
                this.performDetailedTranslation(text, 'english-to-korean');
            } else if (direction === 'korean-to-english') {
                this.performDetailedTranslation(text, 'korean-to-english');
            }
        }, 1000); // 1초 후 정밀 번역
    }

    performDetailedTranslation(text, direction) {
        // 더 정확한 번역을 위한 두 번째 패스
        if (direction === 'english-to-korean') {
            const koreanPrompt = document.getElementById('generated-korean');
            if (koreanPrompt && !koreanPrompt.dataset.userEdited) {
                const detailedTranslation = this.performAdvancedTranslation(text, 'en-to-ko');
                if (detailedTranslation !== koreanPrompt.value) {
                    koreanPrompt.value = detailedTranslation;
                    this.updateWordCount();
                }
            }
        } else if (direction === 'korean-to-english') {
            const englishPrompt = document.getElementById('generated-english');
            if (englishPrompt && !englishPrompt.dataset.userEdited) {
                const detailedTranslation = this.performAdvancedTranslation(text, 'ko-to-en');
                if (detailedTranslation !== englishPrompt.value) {
                    englishPrompt.value = detailedTranslation;
                    this.updateWordCount();
                }
            }
        }
    }

    translateEnglishPromptToKorean(englishText) {
        const koreanPrompt = document.getElementById('generated-korean');
        if (!koreanPrompt) return;
        
        if (!englishText.trim()) {
            if (!koreanPrompt.dataset.userEdited) {
                koreanPrompt.value = '';
                this.previousEnglishText = '';
                this.previousKoreanText = '';
                this.updateWordCount();
            }
            return;
        }

        // 사용자가 편집 중이 아닐 때만 번역
        if (!koreanPrompt.dataset.userEdited) {
            const currentKoreanText = koreanPrompt.value;
            
            // 한국어 문법 구조를 고려한 선별적 번역 수행
            const translatedText = this.performKoreanAwareTranslation(
                englishText,           // 현재 영문 텍스트
                this.previousEnglishText, // 이전 영문 텍스트
                currentKoreanText,     // 현재 한글 텍스트
                'en-to-ko'            // 번역 방향
            );
            
            // 번역 결과가 현재와 다른 경우에만 업데이트
            if (translatedText !== currentKoreanText) {
                koreanPrompt.value = translatedText;
                this.previousKoreanText = translatedText;
                this.updateWordCount();
            }
            
            // 현재 상태 저장
            this.previousEnglishText = englishText;
        }
    }

    translateKoreanPromptToEnglish(koreanText) {
        const englishPrompt = document.getElementById('generated-english');
        if (!englishPrompt) return;
        
        if (!koreanText.trim()) {
            englishPrompt.value = '';
            this.previousEnglishText = '';
            this.previousKoreanText = '';
            this.updateWordCount();
            return;
        }

        // 항상 번역 실행 (userEdited 조건 제거)
        const currentEnglishText = englishPrompt.value;
        
        // 한국어 문법 구조를 고려한 선별적 번역 수행
        const translatedText = this.performKoreanAwareTranslation(
            koreanText,              // 현재 한글 텍스트
            this.previousKoreanText, // 이전 한글 텍스트
            currentEnglishText,      // 현재 영문 텍스트
            'ko-to-en'              // 번역 방향
        );
        
        // 번역 결과가 현재와 다른 경우에만 업데이트
        if (translatedText !== currentEnglishText) {
            englishPrompt.value = translatedText;
            this.previousEnglishText = translatedText;
            this.updateWordCount();
        }
        
        // 현재 상태 저장
        this.previousKoreanText = koreanText;
    }

    performAdvancedTranslation(text, direction) {
        if (!text.trim()) return '';
        
        const translationDict = this.getTranslationDict();
        const dict = translationDict[direction] || {};
        
        // 쉼표로 구분된 프롬프트 요소들을 분리
        const elements = text.split(',').map(item => item.trim());
        const translatedElements = [];
        
        elements.forEach(element => {
            if (!element) return;
            
            let translatedElement = this.translateSingleElement(element, dict);
            translatedElements.push(translatedElement);
        });
        
        // 중복 요소 제거 및 정리
        const uniqueElements = [...new Set(translatedElements.filter(el => el.trim() !== ''))];
        return uniqueElements.join(', ');
    }

    translateSingleElement(element, dict) {
        let result = element;
        
        // 0. 빈 요소 처리
        if (!element || !element.trim()) {
            return element;
        }
        
        // 1. 완전 일치 번역 (전체 요소가 사전에 있는 경우)
        const exactMatch = Object.entries(dict).find(([source]) => 
            source.toLowerCase() === element.toLowerCase()
        );
        if (exactMatch) {
            return exactMatch[1];
        }
        
        // 2. 구문 패턴 매칭 (복합 표현)
        const phrasePatterns = this.getPhrasePatterns(dict);
        for (const [pattern, replacement] of phrasePatterns) {
            const regex = new RegExp(pattern, 'gi');
            if (regex.test(element)) {
                result = element.replace(regex, replacement);
                break;
            }
        }
        
        // 3. 단어별 번역 (부분 번역)
        if (result === element) {
            // 공백으로 분리된 단어들을 개별 번역
            const words = element.split(/\s+/);
            const translatedWords = words.map(word => {
                // 구두점 제거하여 매칭
                const cleanWord = word.replace(/[^\w가-힣]/g, '');
                const punctuation = word.replace(/[\w가-힣]/g, '');
                
                const wordMatch = Object.entries(dict).find(([source]) => 
                    source.toLowerCase() === cleanWord.toLowerCase()
                );
                
                return wordMatch ? wordMatch[1] + punctuation : word;
            });
            
            result = translatedWords.join(' ');
        }
        
        // 4. 부분 단어 매칭 (접두사/접미사 포함)
        if (result === element) {
            Object.entries(dict).forEach(([source, target]) => {
                const regex = new RegExp('\\b' + source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                result = result.replace(regex, target);
            });
        }
        
        // 5. 번역되지 않은 한국어가 남아있는 경우 추가 처리
        if (/[가-힣]/.test(result) && result === element) {
            // 한국어 단어 목록에서 직접 검색
            const foundTranslation = Object.entries(dict).find(([ko, en]) => 
                ko === element || ko.includes(element) || element.includes(ko)
            );
            
            if (foundTranslation) {
                result = foundTranslation[1];
            } else {
                // 여전히 번역되지 않은 한국어가 있으면 부분 번역 시도
                result = this.performPartialTranslation(element, dict);
            }
        }
        
        // 6. 최종적으로 남은 한국어 처리
        result = this.handleRemainingKorean(result, dict);
        
        return result;
    }
    
    // 남은 한국어를 처리하는 함수
    handleRemainingKorean(text, dict) {
        let result = text;
        
        // 한국어 조사와 문법 요소 제거/변환
        const koreanParticles = {
            '에서': '',
            '에게서': 'from',
            '에게': 'to',
            '으로부터': 'from',
            '까지': 'to',
            '에': '',
            '에다': '',
            '한테': 'to',
            '한테서': 'from',
            '더러': 'to',
            '보고': 'to'
        };
        
        // 조사 제거/변환
        for (const [korean, english] of Object.entries(koreanParticles)) {
            const regex = new RegExp(korean, 'g');
            result = result.replace(regex, english ? ` ${english}` : '');
        }
        
        // 연속된 공백 정리
        result = result.replace(/\s+/g, ' ').trim();
        
        // 남은 한국어 단어들을 개별 처리
        const koreanWords = result.match(/[가-힣]+/g);
        if (koreanWords) {
            koreanWords.forEach(koreanWord => {
                // 사전에서 부분 매칭 시도
                const partialMatch = Object.entries(dict).find(([ko, en]) => {
                    return ko.includes(koreanWord) || koreanWord.includes(ko);
                });
                
                if (partialMatch) {
                    result = result.replace(koreanWord, partialMatch[1]);
                } else {
                    // 마지막 수단: 한국어 단어를 빈 문자열로 제거
                    console.warn(`번역되지 않은 한국어: ${koreanWord}`);
                    result = result.replace(koreanWord, '');
                }
            });
        }
        
        // 불필요한 구두점과 공백 정리
        result = result.replace(/[.,]\s*[.,]/g, ','); // 연속된 쉼표 제거
        result = result.replace(/\s*,\s*/g, ', '); // 쉼표 정리
        result = result.replace(/\s+/g, ' ').trim(); // 공백 정리
        result = result.replace(/^[,\s]+|[,\s]+$/g, ''); // 시작/끝 쉼표 제거
        
        // 영문법 개선
        result = result.replace(/doing is\.?/g, 'doing'); // "doing is" 수정
        result = result.replace(/\bis\./g, ''); // 불필요한 "is." 제거
        result = result.replace(/man man/g, 'man'); // 중복된 단어 제거
        result = result.replace(/wearing inside/g, 'wearing, inside'); // 문법 개선
        result = result.replace(/pants in jeans/g, 'jeans pants'); // 어순 개선
        result = result.replace(/\s+/g, ' ').trim(); // 최종 공백 정리
        
        return result;
    }
    
    // 긴 한국어 텍스트를 효과적으로 번역하는 함수
    translateLongKoreanText(koreanText) {
        const dict = this.getTranslationDict()['ko-to-en'];
        
        // 1. 먼저 쉼표로 분리된 요소들을 처리
        const elements = this.parsePromptElements(koreanText);
        const translatedElements = [];
        
        elements.forEach(element => {
            const trimmedElement = element.trim();
            if (!trimmedElement) return;
            
            if (/[가-힣]/.test(trimmedElement)) {
                // 한국어가 포함된 요소를 문장 단위로 번역
                const translatedElement = this.translateKoreanSentence(trimmedElement, dict);
                translatedElements.push(translatedElement);
            } else {
                translatedElements.push(trimmedElement);
            }
        });
        
        const uniqueElements = [...new Set(translatedElements.filter(el => el.trim() !== ''))];
        return uniqueElements.join(', ');
    }
    
    // 한국어 문장을 단어별로 세밀하게 번역
    translateKoreanSentence(sentence, dict) {
        let result = sentence;
        
        // 1. 전체 문장이 사전에 있는지 확인
        if (dict[sentence]) {
            return dict[sentence];
        }
        
        // 2. 문장을 공백으로 분리하여 단어별 번역
        const words = sentence.split(/\s+/);
        const translatedWords = [];
        
        words.forEach(word => {
            if (/[가-힣]/.test(word)) {
                let translatedWord = this.translateSingleElement(word, dict);
                
                // 여전히 한국어가 남아있으면 추가 처리
                if (/[가-힣]/.test(translatedWord)) {
                    translatedWord = this.performAdvancedKoreanTranslation(word, dict);
                }
                
                translatedWords.push(translatedWord);
            } else {
                translatedWords.push(word);
            }
        });
        
        let finalResult = translatedWords.join(' ');
        
        // 3. 번역 후 정리 작업
        finalResult = this.cleanUpTranslation(finalResult);
        
        return finalResult;
    }
    
    // 번역 결과를 정리하는 함수
    cleanUpTranslation(text) {
        let result = text;
        
        // 1. 연속된 공백 제거
        result = result.replace(/\s+/g, ' ');
        
        // 2. 불필요한 단어들 제거
        result = result.replace(/\b(doing is|is doing)\b/g, 'is');
        result = result.replace(/\b(wearing\.)\b/g, 'wearing');
        result = result.replace(/\bbusking is\b/g, 'is busking');
        result = result.replace(/\bwearing\s+wearing\b/g, 'wearing');
        
        // 3. 문장 구조 개선
        result = result.replace(/man in his thirties Korean man/g, 'Korean man in his thirties');
        result = result.replace(/pants in jeans/g, 'wearing jeans');
        result = result.replace(/cardigan inside/g, 'cardigan with');
        result = result.replace(/Seoul Daehangno Marronnier in the park/g, 'in Marronnier Park on Daehangno, Seoul');
        
        // 4. 구두점 정리
        result = result.replace(/\.\s*,/g, ',');
        result = result.replace(/,\s*\./g, '.');
        
        return result.trim();
    }
    
    // 고급 한국어 번역 - 형태소 분석 유사 기능
    performAdvancedKoreanTranslation(word, dict) {
        let result = word;
        
        // 한국어 단어에서 가능한 모든 부분 문자열을 찾아 번역 시도
        for (let len = word.length; len > 0; len--) {
            for (let start = 0; start <= word.length - len; start++) {
                const substring = word.substring(start, start + len);
                
                if (dict[substring]) {
                    const before = word.substring(0, start);
                    const after = word.substring(start + len);
                    
                    let translatedBefore = before;
                    let translatedAfter = after;
                    
                    // 앞뒤 부분도 번역 시도
                    if (/[가-힣]/.test(before) && before.length > 0) {
                        translatedBefore = this.performAdvancedKoreanTranslation(before, dict);
                    }
                    if (/[가-힣]/.test(after) && after.length > 0) {
                        translatedAfter = this.performAdvancedKoreanTranslation(after, dict);
                    }
                    
                    result = (translatedBefore + ' ' + dict[substring] + ' ' + translatedAfter).trim();
                    
                    // 연속된 공백 제거
                    result = result.replace(/\s+/g, ' ');
                    
                    return result;
                }
            }
        }
        
        return result;
    }

    // 부분 번역 함수 - 한국어 문자를 하나씩 또는 조합으로 번역 시도
    performPartialTranslation(element, dict) {
        let result = element;
        
        // 한국어 부분 문자열 매칭 시도
        for (let i = element.length; i > 0; i--) {
            for (let j = 0; j <= element.length - i; j++) {
                const substring = element.substring(j, j + i);
                if (/[가-힣]/.test(substring) && dict[substring]) {
                    const before = element.substring(0, j);
                    const after = element.substring(j + i);
                    result = before + dict[substring] + after;
                    
                    // 재귀적으로 나머지 부분도 번역 시도
                    if (/[가-힣]/.test(result)) {
                        return this.performPartialTranslation(result, dict);
                    }
                    return result;
                }
            }
        }
        
        return result;
    }

    getPhrasePatterns(dict) {
        // 복합 표현들을 위한 패턴 매핑
        const patterns = [];
        
        Object.entries(dict).forEach(([source, target]) => {
            // 공백이 포함된 표현들을 패턴으로 변환
            if (source.includes(' ')) {
                const pattern = source.replace(/\s+/g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                patterns.push([pattern, target]);
            }
        });
        
        // 자주 사용되는 패턴들을 우선순위로 정렬
        return patterns.sort((a, b) => b[0].length - a[0].length);
    }

    // 한국어 문법 구조를 고려한 번역 함수
    performKoreanAwareTranslation(currentText, previousText, targetText, direction) {
        if (!currentText.trim()) return '';
        
        // 한국어에서 영어로의 번역인 경우 특별 처리
        if (direction === 'ko-to-en') {
            return this.performKoreanToEnglishTranslation(currentText, previousText, targetText);
        }
        
        // 영어에서 한국어로의 번역은 기존 한국어 문법 보존
        return this.performEnglishToKoreanTranslation(currentText, previousText, targetText);
    }

    // 영어 → 한국어 번역 시 기존 한국어 문법 보존
    performEnglishToKoreanTranslation(currentEnglishText, previousEnglishText, currentKoreanText) {
        if (!currentEnglishText.trim()) return '';
        
        const currentElements = this.parsePromptElements(currentEnglishText);
        const previousElements = this.parsePromptElements(previousEnglishText);
        const koreanElements = this.parsePromptElements(currentKoreanText);
        
        // 변경사항 감지
        const changes = this.detectChanges(currentElements, previousElements);
        
        // 기존 한국어 텍스트를 기반으로 업데이트
        const updatedElements = [...koreanElements];
        
        // 추가된 영어 요소들만 번역
        changes.added.forEach(change => {
            const englishElement = change.element.trim();
            
            // 영어 요소를 한국어로 번역
            const translatedElement = this.translateEnglishElementSafely(englishElement, koreanElements);
            
            if (change.index >= updatedElements.length) {
                updatedElements.push(translatedElement);
            } else {
                updatedElements.splice(change.index, 0, translatedElement);
            }
        });
        
        // 수정된 요소들 처리
        changes.modified.forEach(change => {
            if (change.index < updatedElements.length) {
                const englishElement = change.newElement.trim();
                
                // 해당 위치의 기존 한국어 요소가 완성된 문법인지 확인
                const existingKoreanElement = updatedElements[change.index];
                
                if (this.isKoreanGrammaticalElement(existingKoreanElement)) {
                    // 기존 한국어 문법 요소는 그대로 유지
                    // 새로운 영어 요소는 뒤에 추가
                    const translatedElement = this.translateEnglishElementSafely(englishElement, koreanElements);
                    // 기존 요소를 대체하지 않고 별도로 추가
                    updatedElements.splice(change.index + 1, 0, translatedElement);
                } else {
                    // 기존 요소가 일반 한국어라면 대체
                    const translatedElement = this.translateEnglishElementSafely(englishElement, koreanElements);
                    updatedElements[change.index] = translatedElement;
                }
            }
        });
        
        // 삭제된 요소들 제거
        changes.removed.sort((a, b) => b.index - a.index).forEach(change => {
            if (change.index < updatedElements.length) {
                updatedElements.splice(change.index, 1);
            }
        });
        
        // 중복 요소 제거 및 정리
        const uniqueElements = [...new Set(updatedElements.filter(el => el.trim() !== ''))];
        return uniqueElements.join(', ');
    }

    // 한국어 → 영어 번역 시 문법 구조 보존
    performKoreanToEnglishTranslation(currentKoreanText, previousKoreanText, currentEnglishText) {
        if (!currentKoreanText.trim()) return '';
        
        // 한국어가 포함된 경우 무조건 전체 번역 수행
        const hasKorean = /[가-힣]/.test(currentKoreanText);
        
        if (hasKorean) {
            // 긴 문장을 더 작은 단위로 분할하여 번역
            const translatedText = this.translateLongKoreanText(currentKoreanText);
            return translatedText;
        }
        
        // 한국어가 없는 경우 기존 로직 사용
        const currentElements = this.parsePromptElements(currentKoreanText);
        const previousElements = this.parsePromptElements(previousKoreanText);
        const englishElements = this.parsePromptElements(currentEnglishText);
        
        // 변경사항 감지
        const changes = this.detectChanges(currentElements, previousElements);
        
        // 기존 영어 텍스트를 기반으로 업데이트
        const updatedElements = [...englishElements];
        
        // 추가된 한국어 요소들만 번역
        changes.added.forEach(change => {
            // 한국어 요소를 분석하여 번역 필요 여부 판단
            const koreanElement = change.element.trim();
            
            // 이미 한국어로 완성된 문장/구문인지 확인
            if (this.isCompleteKoreanPhrase(koreanElement)) {
                // 완성된 한국어 구문의 경우 어근만 번역하고 문법 요소는 제거
                const translatedElement = this.translateKoreanPhraseSafely(koreanElement);
                
                if (change.index >= updatedElements.length) {
                    updatedElements.push(translatedElement);
                } else {
                    updatedElements.splice(change.index, 0, translatedElement);
                }
            } else {
                // 단순한 단어의 경우 일반 번역
                const translatedElement = this.translateSingleElement(
                    koreanElement, 
                    this.getTranslationDict()['ko-to-en']
                );
                
                if (change.index >= updatedElements.length) {
                    updatedElements.push(translatedElement);
                } else {
                    updatedElements.splice(change.index, 0, translatedElement);
                }
            }
        });
        
        // 수정된 요소들 처리
        changes.modified.forEach(change => {
            if (change.index < updatedElements.length) {
                const koreanElement = change.newElement.trim();
                
                if (this.isCompleteKoreanPhrase(koreanElement)) {
                    const translatedElement = this.translateKoreanPhraseSafely(koreanElement);
                    updatedElements[change.index] = translatedElement;
                } else {
                    const translatedElement = this.translateSingleElement(
                        koreanElement, 
                        this.getTranslationDict()['ko-to-en']
                    );
                    updatedElements[change.index] = translatedElement;
                }
            }
        });
        
        // 삭제된 요소들 제거
        changes.removed.sort((a, b) => b.index - a.index).forEach(change => {
            if (change.index < updatedElements.length) {
                updatedElements.splice(change.index, 1);
            }
        });
        
        // 중복 요소 제거 및 정리
        const uniqueElements = [...new Set(updatedElements.filter(el => el.trim() !== ''))];
        return uniqueElements.join(', ');
    }

    // 완성된 한국어 구문인지 판단
    isCompleteKoreanPhrase(text) {
        // 한국어 어미 패턴 (동사/형용사의 활용형)
        const koreanEndingPatterns = [
            // 동사 어미
            /.*[하다]$/, // 하다 동사
            /.*[이다]$/, // 이다 동사  
            /.*[되다]$/, // 되다 동사
            /.*[가다]$/, // 가다 동사
            /.*[오다]$/, // 오다 동사
            /.*[보다]$/, // 보다 동사
            /.*[있다]$/, // 있다 동사
            /.*[없다]$/, // 없다 동사
            
            // 형용사 어미
            /.*[한]$/, // -한 (어미)
            /.*[는]$/, // -는 (관형형 어미)
            /.*[은]$/, // -은 (관형형 어미) 
            /.*[을]$/, // -을 (관형형 어미)
            /.*[된]$/, // -된 (과거분사)
            /.*[있는]$/, // -있는 (현재분사)
            /.*[하는]$/, // -하는 (현재분사)
            /.*[되는]$/, // -되는 (현재분사)
            /.*[가는]$/, // -가는 (현재분사)
            
            // 조사 
            /.*[이]$/, // 주격 조사
            /.*[가]$/, // 주격 조사
            /.*[을]$/, // 목적격 조사
            /.*[를]$/, // 목적격 조사
            /.*[에]$/, // 부사격 조사
            /.*[에서]$/, // 부사격 조사
            /.*[으로]$/, // 부사격 조사
            /.*[로]$/, // 부사격 조사
            /.*[에게]$/, // 부사격 조사
            /.*[와]$/, // 부사격 조사
            /.*[과]$/, // 부사격 조사
            /.*[이라]$/, // 비교격 조사
            /.*[처럼]$/, // 비교격 조사
            
            // 경어법
            /.*[십시오]$/, // 경어법
            /.*[세요]$/, // 경어법
            /.*[아요|어요]$/, // 반말
            
            // 형용사 어미 (분류 더 세분화)
            /.*[로운]$/, // -로운 
            /.*[운]$/, // -운 
            /.*[인]$/, // -인 
        ];
        
        return koreanEndingPatterns.some(pattern => pattern.test(text.trim()));
    }

    // 영어에서 한국어로의 번역 시 기존 한국어 문법 보존
    isKoreanGrammaticalElement(text) {
        // 이미 한국어로 작성된 문법적 요소들을 식별
        const hasKorean = /[가-힣]/.test(text);
        const isComplete = this.isCompleteKoreanPhrase(text);
        
        return hasKorean && isComplete;
    }

    // 한국어 구문을 안전하게 번역 (문법 요소 제거)
    translateKoreanPhraseSafely(koreanPhrase) {
        // 어근 추출을 위한 패턴 (우선순위에 따라 정렬)
        const rootExtractionPatterns = [
            // 복합 어미 처리 (먼저)
            { pattern: /(.+)[있는]$/, replacement: '$1' },
            { pattern: /(.+)[하는]$/, replacement: '$1' },
            { pattern: /(.+)[되는]$/, replacement: '$1' },
            { pattern: /(.+)[가는]$/, replacement: '$1' },
            { pattern: /(.+)[에서]$/, replacement: '$1' },
            { pattern: /(.+)[으로]$/, replacement: '$1' },
            { pattern: /(.+)[에게]$/, replacement: '$1' },
            { pattern: /(.+)[처럼]$/, replacement: '$1' },
            { pattern: /(.+)[이라]$/, replacement: '$1' },
            { pattern: /(.+)[십시오]$/, replacement: '$1' },
            { pattern: /(.+)[세요]$/, replacement: '$1' },
            { pattern: /(.+)[아요|어요]$/, replacement: '$1' },
            
            // 단순 어미 처리
            { pattern: /(.+)[하다]$/, replacement: '$1' },
            { pattern: /(.+)[이다]$/, replacement: '$1' },
            { pattern: /(.+)[되다]$/, replacement: '$1' },
            { pattern: /(.+)[가다]$/, replacement: '$1' },
            { pattern: /(.+)[오다]$/, replacement: '$1' },
            { pattern: /(.+)[보다]$/, replacement: '$1' },
            { pattern: /(.+)[있다]$/, replacement: '$1' },
            { pattern: /(.+)[없다]$/, replacement: '$1' },
            { pattern: /(.+)[된]$/, replacement: '$1' },
            { pattern: /(.+)[한]$/, replacement: '$1' },
            { pattern: /(.+)[는]$/, replacement: '$1' },
            { pattern: /(.+)[은]$/, replacement: '$1' },
            { pattern: /(.+)[을]$/, replacement: '$1' },
            { pattern: /(.+)[를]$/, replacement: '$1' },
            // { pattern: /(.+)[이]$/, replacement: '$1' }, // "고양이" 같은 단어 보호를 위해 비활성화
            { pattern: /(.+)[가]$/, replacement: '$1' },
            { pattern: /(.+)[에]$/, replacement: '$1' },
            { pattern: /(.+)[로]$/, replacement: '$1' },
            { pattern: /(.+)[와]$/, replacement: '$1' },
            { pattern: /(.+)[과]$/, replacement: '$1' },
            { pattern: /(.+)[로운]$/, replacement: '$1' },
            { pattern: /(.+)[운]$/, replacement: '$1' },
            { pattern: /(.+)[인]$/, replacement: '$1' },
        ];
        
        let rootWord = koreanPhrase.trim();
        
        // 어근 추출 (가장 긴 패턴부터 매칭)
        for (const {pattern, replacement} of rootExtractionPatterns) {
            if (pattern.test(rootWord)) {
                rootWord = rootWord.replace(pattern, replacement);
                break;
            }
        }
        
        // 추출된 어근이 비어있는지 확인
        if (!rootWord || rootWord.trim() === '') {
            return koreanPhrase; // 어근을 추출할 수 없으면 원본 그대로 반환
        }
        
        // 추출된 어근을 번역
        const translatedRoot = this.translateSingleElement(
            rootWord,
            this.getTranslationDict()['ko-to-en']
        );
        
        return translatedRoot;
    }

    // 역방향 번역에서 기존 한국어 요소 보호
    translateEnglishElementSafely(englishElement, targetKoreanElements) {
        // 영어 요소를 한국어로 번역할 때 기존 한국어 문법 보호
        const translatedElement = this.translateSingleElement(
            englishElement,
            this.getTranslationDict()['en-to-ko']
        );
        
        // 기존 한국어 요소들과 비교하여 채우지 않습니다.
        // 단순하게 번역만 수행합니다.
        
        return translatedElement;
    }

    // 실시간 동기화를 위한 개선된 번역 함수
    // 정밀한 차이 감지 및 선별적 번역
    performSelectiveTranslation(currentText, previousText, targetText, direction) {
        if (!currentText.trim()) return '';
        
        const currentElements = this.parsePromptElements(currentText);
        const previousElements = this.parsePromptElements(previousText);
        const targetElements = this.parsePromptElements(targetText);
        
        // 변경사항 감지
        const changes = this.detectChanges(currentElements, previousElements);
        
        // 대상 텍스트를 기준으로 업데이트
        const updatedElements = [...targetElements];
        
        // 추가된 요소들 번역
        changes.added.forEach(change => {
            const translatedElement = this.translateSingleElement(
                change.element, 
                this.getTranslationDict()[direction]
            );
            
            // 적절한 위치에 추가
            if (change.index >= updatedElements.length) {
                updatedElements.push(translatedElement);
            } else {
                updatedElements.splice(change.index, 0, translatedElement);
            }
            
            // 매핑 관계 저장
            this.updateMapping(change.element, translatedElement, direction);
        });
        
        // 수정된 요소들 번역
        changes.modified.forEach(change => {
            if (change.index < updatedElements.length) {
                const translatedElement = this.translateSingleElement(
                    change.newElement, 
                    this.getTranslationDict()[direction]
                );
                updatedElements[change.index] = translatedElement;
                
                // 매핑 관계 업데이트
                this.updateMapping(change.newElement, translatedElement, direction);
            }
        });
        
        // 삭제된 요소들 제거 (뒤에서부터 제거하여 인덱스 변경 방지)
        changes.removed.sort((a, b) => b.index - a.index).forEach(change => {
            if (change.index < updatedElements.length) {
                updatedElements.splice(change.index, 1);
                
                // 매핑 관계에서 제거
                this.removeMapping(change.element, direction);
            }
        });
        
        // 중복 요소 제거 및 정리
        const uniqueElements = [...new Set(updatedElements.filter(el => el.trim() !== ''))];
        return uniqueElements.join(', ');
    }
    
    parsePromptElements(text) {
        return text.split(',').map(element => element.trim()).filter(element => element.length > 0);
    }
    
    detectChanges(currentElements, previousElements) {
        const changes = {
            added: [],
            modified: [],
            removed: []
        };
        
        // 추가된 요소 찾기
        currentElements.forEach((element, index) => {
            if (index >= previousElements.length) {
                changes.added.push({ element, index });
            } else if (element !== previousElements[index]) {
                changes.modified.push({ 
                    oldElement: previousElements[index], 
                    newElement: element, 
                    index 
                });
            }
        });
        
        // 삭제된 요소 찾기
        if (previousElements.length > currentElements.length) {
            for (let i = currentElements.length; i < previousElements.length; i++) {
                changes.removed.push({ element: previousElements[i], index: i });
            }
        }
        
        return changes;
    }
    
    updateMapping(sourceElement, targetElement, direction) {
        this.currentMappings[direction].set(sourceElement, targetElement);
        
        // 역방향 매핑도 업데이트
        const reverseDirection = direction === 'en-to-ko' ? 'ko-to-en' : 'en-to-ko';
        this.currentMappings[reverseDirection].set(targetElement, sourceElement);
    }
    
    removeMapping(element, direction) {
        const mappedElement = this.currentMappings[direction].get(element);
        if (mappedElement) {
            const reverseDirection = direction === 'en-to-ko' ? 'ko-to-en' : 'en-to-ko';
            this.currentMappings[reverseDirection].delete(mappedElement);
        }
        this.currentMappings[direction].delete(element);
    }

    // 기존 함수들도 유지 (호환성을 위해)
    handlePromptTranslation(text, sourceLanguage) {
        // Clear previous debounce timer
        if (this.translationTimer) {
            clearTimeout(this.translationTimer);
        }

        // Set new debounce timer for translation
        this.translationTimer = setTimeout(() => {
            if (sourceLanguage === 'english') {
                // 영문 프롬프트에 한글이 입력된 경우 → 영문으로 번역
                this.translateKoreanToEnglish(text);
            } else {
                // 한글 프롬프트에 영문이 입력된 경우 → 한글로 번역
                this.translateEnglishToKorean(text);
            }
        }, 1000); // 1초 딜레이로 번역 실행
    }

    translateKoreanToEnglish(koreanText) {
        // 한글이 포함된 경우에만 번역 수행
        const hasKorean = /[가-힣]/.test(koreanText);
        if (!hasKorean || !koreanText.trim()) return;

        // 간단한 사전 기반 번역 (정적 웹사이트 제한으로 인한 기본 번역)
        const translatedText = this.performBasicTranslation(koreanText, 'ko-to-en');
        
        // 영문 프롬프트 업데이트 (사용자가 직접 입력한 경우가 아닐 때만)
        const englishPrompt = document.getElementById('generated-english');
        if (englishPrompt && !englishPrompt.dataset.userEdited) {
            const currentEnglish = englishPrompt.value;
            if (currentEnglish !== translatedText) {
                englishPrompt.value = translatedText;
                this.updateWordCount();
            }
        }
    }

    translateEnglishToKorean(englishText) {
        // 영문이 포함된 경우에만 번역 수행
        const hasEnglish = /[a-zA-Z]/.test(englishText);
        if (!hasEnglish || !englishText.trim()) return;

        // 간단한 사전 기반 번역
        const translatedText = this.performBasicTranslation(englishText, 'en-to-ko');
        
        // 한글 프롬프트 업데이트
        const koreanPrompt = document.getElementById('generated-korean');
        if (koreanPrompt && !koreanPrompt.dataset.userEdited) {
            const currentKorean = koreanPrompt.value;
            if (currentKorean !== translatedText) {
                koreanPrompt.value = translatedText;
                this.updateWordCount();
            }
        }
    }

    performBasicTranslation(text, direction) {
        const translationDict = this.getTranslationDict();
        let result = text;
        const dict = translationDict[direction];

        // 단어별 번역 수행
        Object.entries(dict).forEach(([source, target]) => {
            const regex = new RegExp('\\b' + source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
            result = result.replace(regex, target);
        });

        return result;
    }

    translateMixedText(text, direction) {
        // 혼합된 텍스트에서 특정 언어만 번역하는 함수
        if (direction === 'ko-to-en') {
            // 한글 단어들만 찾아서 번역
            const dict = this.getTranslationDict()['ko-to-en'];
            let result = text;
            
            Object.entries(dict).forEach(([korean, english]) => {
                const regex = new RegExp(korean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                result = result.replace(regex, english);
            });
            
            return result;
        } else if (direction === 'en-to-ko') {
            // 영문 단어들만 찾아서 번역
            const dict = this.getTranslationDict()['en-to-ko'];
            let result = text;
            
            Object.entries(dict).forEach(([english, korean]) => {
                const regex = new RegExp('\\b' + english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                result = result.replace(regex, korean);
            });
            
            return result;
        }
        
        return text;
    }

    getTranslationDict() {
        // 번역 사전을 반환하는 헬퍼 함수 (중복 코드 제거용)
        const translationDict = {
            'ko-to-en': {
                // 주제 관련
                '사람': 'person',
                '여성': 'woman', 
                '남성': 'man',
                '소녀': 'girl',
                '소년': 'boy',
                '아이': 'child',
                '어린이': 'children',
                '동물': 'animal',
                '고양이': 'cat',
                '개': 'dog',
                '새': 'bird',
                '말': 'horse',
                '풍경': 'landscape',
                '산': 'mountain',
                '바다': 'ocean',
                '호수': 'lake',
                '강': 'river',
                '숲': 'forest',
                '사막': 'desert',
                '해변': 'beach',
                '도시': 'city',
                '마을': 'village',
                '건축물': 'architecture',
                '건물': 'building',
                '집': 'house',
                '성': 'castle',
                '다리': 'bridge',
                '사물': 'object',
                '차량': 'vehicle',
                '자동차': 'car',
                '오토바이': 'motorcycle',
                '자전거': 'bicycle',
                '비행기': 'airplane',
                '배': 'ship',
                '음식': 'food',
                '과일': 'fruit',
                '꽃': 'flower',
                '나무': 'tree',
                '추상적': 'abstract',
                
                // 설명 관련
                '아름다운': 'beautiful',
                '예쁜': 'pretty',
                '귀여운': 'cute',
                '멋있는': 'cool',
                '좋은': 'good',
                '나쁜': 'bad',
                '큰': 'big',
                '작은': 'small',
                '긴': 'long',
                '짧은': 'short',
                '높은': 'high',
                '낮은': 'low',
                '넓은': 'wide',
                '좁은': 'narrow',
                '두꺼운': 'thick',
                '얇은': 'thin',
                '무거운': 'heavy',
                '가벼운': 'light',
                '빠른': 'fast',
                '느린': 'slow',
                '젊은': 'young',
                '늙은': 'old',
                '새로운': 'new',
                '오래된': 'old',
                '깨끗한': 'clean',
                '더러운': 'dirty',
                '따뜻한': 'warm',
                '뜨거운': 'hot',
                '시원한': 'cool',
                '상세한': 'detailed',
                '매우 상세한': 'highly detailed',
                '사실적인': 'realistic',
                '우아한': 'elegant',
                '드라마틱한': 'dramatic',
                '빈티지한': 'vintage',
                '미래적인': 'futuristic',
                '다채로운': 'colorful',
                '화려한': 'vibrant',
                '밝은': 'bright',
                '어두운': 'dark',
                '신비로운': 'mysterious',
                '로맨틱한': 'romantic',
                '평화로운': 'peaceful',
                '역동적인': 'dynamic',
                '강력한': 'powerful',
                '부드러운': 'soft',
                '거친': 'rough',
                '매끄러운': 'smooth',
                '미니멀한': 'minimalist',
                '복잡한': 'complex',
                '단순한': 'simple',
                
                // 스타일 관련
                '포토리얼리스틱': 'photorealistic',
                '애니메이션': 'anime style',
                '만화': 'cartoon style',
                '유화': 'oil painting',
                '수채화': 'watercolor painting',
                '디지털 아트': 'digital art',
                '스케치': 'pencil sketch',
                '카툰': 'cartoon',
                '컨셉 아트': 'concept art',
                '팝아트': 'pop art',
                '인상주의': 'impressionist',
                '입체파': 'cubist',
                '초현실주의': 'surrealist',
                
                // 카메라 관련
                '클로즈업': 'close-up shot',
                '미디엄샷': 'medium shot',
                '와이드샷': 'wide shot',
                '전신샷': 'full body shot',
                '조감도': 'bird\'s eye view',
                '저각도': 'low angle',
                '고각도': 'high angle',
                '정면': 'front view',
                '측면': 'side view',
                '뒷면': 'back view',
                '상반신': 'portrait',
                '얼굴 클로즈업': 'face close-up',
                
                // 조명 관련
                '조명': 'lighting',
                '자연광': 'natural lighting',
                '골든아워': 'golden hour lighting',
                '블루아워': 'blue hour lighting',
                '스튜디오': 'studio lighting',
                '부드러운 조명': 'soft lighting',
                '강한 조명': 'hard lighting',
                '역광': 'backlit',
                '측광': 'side lighting',
                '상단 조명': 'top lighting',
                '네온': 'neon lighting',
                '캔들라이트': 'candlelight',
                '달빛': 'moonlight',
                '햇빛': 'sunlight',
                
                // 품질 관련
                '걸작': 'masterpiece',
                '최고 품질': 'best quality',
                '고품질': 'high quality',
                '선명한 초점': 'sharp focus',
                '전문적인': 'professional',
                '수상작': 'award winning',
                '트렌딩': 'trending on artstation',
                '고해상도': 'high resolution',
                '초고화질': 'ultra high quality',
                '완벽한': 'perfect',
                
                // 감정/분위기 관련
                '행복한': 'happy',
                '슬픈': 'sad',
                '화난': 'angry',
                '평온한': 'calm',
                '흥미진진한': 'exciting',
                '무서운': 'scary',
                '따뜻한': 'warm',
                '차가운': 'cold',
                
                // 색상 관련
                '빨간': 'red',
                '파란': 'blue', 
                '초록': 'green',
                '노란': 'yellow',
                '보라': 'purple',
                '분홍': 'pink',
                '검은': 'black',
                '흰': 'white',
                '회색': 'gray',
                '금색': 'golden',
                '은색': 'silver',
                
                // 시간/계절 관련
                '봄': 'spring',
                '여름': 'summer',
                '가을': 'autumn',
                '겨울': 'winter',
                '아침': 'morning',
                '점심': 'noon',
                '저녁': 'evening',
                '밤': 'night',
                
                // 기타 유용한 표현
                '긴 머리': 'long hair',
                '짧은 머리': 'short hair',
                '웃고 있는': 'smiling',
                '서 있는': 'standing',
                '앉아 있는': 'sitting',
                '걷고 있는': 'walking',
                '뛰고 있는': 'running',
                '날고 있는': 'flying',
                '떠 있는': 'floating',
                
                // 추가 일상 표현
                '서른 대': 'in his thirties',
                '30대': 'in thirties',
                '버스킹': 'busking',
                '길거리 공연': 'street performance',
                '대학로': 'Daehak-ro',
                '가디건': 'cardigan',
                '입고 있는': 'wearing',
                '입은': 'wearing',
                '입었고': 'wearing',
                '청색': 'blue',
                '파란색': 'blue',
                '흰색': 'white',
                '검정색': 'black',
                '회색': 'gray',
                '바지': 'pants',
                '청바지': 'jeans',
                '운동화': 'sneakers',
                '신발': 'shoes',
                '드론샷': 'drone shot',
                '항공샷': 'aerial shot',
                '드라마틱 조명': 'dramatic lighting',
                '극적인 조명': 'dramatic lighting',
                
                // 장소 관련
                '서울': 'Seoul',
                '부산': 'Busan',
                '거리': 'street',
                '공원': 'park',
                '카페': 'cafe',
                '레스토랑': 'restaurant',
                
                // 동작 관련
                '하고 있는': 'doing',
                '하고': 'doing',
                '연주하는': 'playing',
                '노래하는': 'singing',
                '춤추는': 'dancing',
                '걸어가는': 'walking',
                '달리는': 'running',
                
                // 화면 비율 관련
                '정사각형': '--ar 1:1',
                '1대1': '--ar 1:1',
                '가로형': '--ar 4:3',
                '4대3': '--ar 4:3',
                '와이드스크린': '--ar 16:9',
                '16대9': '--ar 16:9',
                '세로형': '--ar 9:16',
                '9대16': '--ar 9:16',
                '표준': '--ar 3:4',
                '3대4': '--ar 3:4',
                '울트라와이드': '--ar 21:9',
                '21대9': '--ar 21:9',
                '시네마': '--ar 2.35:1',
                '배너': '--ar 3:1',
                '3대1': '--ar 3:1',
                '비율': 'aspect ratio',
                '화면 비율': 'aspect ratio',
                '화면비': 'aspect ratio',
                
                // 한국어 조사 및 문법 요소
                '에서': '',  // 장소 조사 - 제거
                '을': '',    // 목적격 조사 - 제거
                '를': '',    // 목적격 조사 - 제거
                '이': '',    // 주격 조사 - 제거
                '가': '',    // 주격 조사 - 제거
                '의': '',    // 소유격 조사 - 제거
                '와': 'and', // 접속 조사
                '과': 'and', // 접속 조사
                '는': '',    // 보조사 - 제거
                '은': '',    // 보조사 - 제거
                '도': '',    // 보조사 - 제거
                '만': 'only',
                '부터': 'from',
                '까지': 'to',
                '로': '',    // 방향 조사 - 제거
                '으로': '',  // 방향 조사 - 제거
                
                // 복합 표현 추가
                '가디건을': 'cardigan',
                '입었고': 'wearing',
                '안에는': 'inside',
                '바지는': 'pants',
                '신고': 'wearing',
                'is': '',  // 불필요한 영문 요소 제거
                
                // 의류 관련
                '티셔츠': 't-shirt',
                '셔츠': 'shirt',
                '드레스': 'dress',
                '재킷': 'jacket',
                '코트': 'coat',
                '모자': 'hat',
                '안경': 'glasses',
                
                // 자세/포즈 관련
                '서서': 'standing',
                '앉아서': 'sitting',
                '누워서': 'lying down',
                '포즈': 'pose',
                '자세': 'posture',
                
                // 추가 일반 형용사
                '조용한': 'quiet',
                '시끄러운': 'noisy',
                '재미있는': 'funny',
                '지루한': 'boring',
                '쉬운': 'easy',
                '어려운': 'difficult',
                '친절한': 'kind',
                '똑똑한': 'smart',
                '바쁜': 'busy',
                '자유로운': 'free',
                
                // 추가 명사
                '학교': 'school',
                '병원': 'hospital',
                '공원': 'park',
                '상점': 'store',
                '레스토랑': 'restaurant',
                '카페': 'cafe',
                '도서관': 'library',
                '은행': 'bank',
                '호텔': 'hotel',
                '공항': 'airport',
                
                // 감정 표현
                '기쁜': 'happy',
                '즐거운': 'joyful',
                '놀란': 'surprised',
                '걱정하는': 'worried',
                '불안한': 'anxious',
                '편안한': 'comfortable',
                
                // 동작 관련
                '달리는': 'running',
                '걷는': 'walking',
                '점프하는': 'jumping',
                '춤추는': 'dancing',
                '노래하는': 'singing',
                '요리하는': 'cooking',
                '공부하는': 'studying',
                '일하는': 'working',
                '잠자는': 'sleeping',
                '먹는': 'eating',
                '하고': 'doing',
                '있어': 'is',
                '신었어': 'wearing',
                '입고': 'wearing',
                
                // 나이/성별 관련
                '10대': 'teenage',
                '20대': 'twenties',
                '30대': 'thirties',
                '40대': 'forties',
                '50대': 'fifties',
                '30대의': 'man in his thirties',
                '남성': 'man',
                '남성이': 'man',
                '여성': 'woman',
                '여성이': 'woman',
                '사람이': 'person',
                
                // 장소 관련
                '한국': 'Korean',
                '서울': 'Seoul',
                '부산': 'Busan',
                '대구': 'Daegu',
                '인천': 'Incheon',
                '대학로': 'Daehangno',
                '마로니에': 'Marronnier',
                '공원에서': 'in the park',
                '공원에': 'in the park',
                '집에서': 'at home',
                '학교에서': 'at school',
                
                // 의류 관련
                '가디건': 'cardigan',
                '티셔츠': 't-shirt',
                '셔츠': 'shirt',
                '바지': 'pants',
                '바지는': 'pants',
                '청바지': 'jeans',
                '청바지에': 'in jeans',
                '운동화': 'sneakers',
                '운동화를': 'sneakers',
                '구두': 'dress shoes',
                '신발': 'shoes',
                '양말': 'socks',
                '모자': 'hat',
                '안경': 'glasses',
                
                // 색상 확장
                '베이지색': 'beige',
                '베이지': 'beige',
                '회색': 'gray',
                '갈색': 'brown',
                '주황': 'orange',
                '연두': 'light green',
                
                // 위치/방향
                '안에': 'inside',
                '밖에': 'outside',
                '위에': 'on top',
                '아래에': 'under',
                '옆에': 'next to',
                '앞에': 'in front of',
                '뒤에': 'behind',
                
                // 활동 관련
                '버스킹': 'busking',
                '버스킹을': 'busking',
                '공연': 'performance',
                '연주': 'playing music',
                '노래': 'singing',
                '춤': 'dancing'
            },
            'en-to-ko': {}
        };

        // 영문→한글 사전 자동 생성
        Object.entries(translationDict['ko-to-en']).forEach(([ko, en]) => {
            translationDict['en-to-ko'][en] = ko;
            // 단수/복수 형태도 추가
            translationDict['en-to-ko'][en + 's'] = ko;
        });

        return translationDict;
    }





    setupAutoGeneration() {
        // Auto-generate when options change
        document.addEventListener('optionChanged', () => {
            this.generatePrompt();
            this.updateStats();
        });
    }

    generatePrompt() {
        // Generate English prompt first
        const englishElements = this.collectAllElements();
        const englishPrompt = this.buildEnglishPrompt(englishElements);
        document.getElementById('generated-english').value = englishPrompt;
        
        // Generate Korean prompt separately
        const koreanElements = this.collectKoreanElements();
        const koreanPrompt = this.buildKoreanPromptDirect(koreanElements);
        document.getElementById('generated-korean').value = koreanPrompt;
        
        // Update word counts
        this.updateWordCount();
        
        // Update previous text to prevent unwanted translations
        this.previousEnglishText = englishPrompt;
        this.previousKoreanText = koreanPrompt;
    }

    collectAllElements() {
        const elements = {
            subject: [],
            description: [],
            style: [],
            camera: [],
            aspectratio: [],
            lighting: [],
            quality: []
        };

        // Collect selected options
        Object.keys(this.selectedOptions).forEach(category => {
            if (category === 'aspectratio') {
                // 화면 비율은 단일 선택값
                if (this.selectedOptions[category] && this.optionTranslations[this.selectedOptions[category]]) {
                    elements[category].push(this.optionTranslations[this.selectedOptions[category]]);
                }
            } else {
                // 다른 카테고리들은 Set으로 처리
                this.selectedOptions[category].forEach(option => {
                    if (this.optionTranslations[option]) {
                        elements[category].push(this.optionTranslations[option]);
                    }
                });
            }
        });

        // Collect and translate custom inputs for English prompt
        const customInputs = {
            subject: document.getElementById('subject-custom')?.value || '',
            description: document.getElementById('description-custom')?.value || '',
            style: document.getElementById('style-custom')?.value || '',
            camera: document.getElementById('camera-custom')?.value || '',
            aspectratio: document.getElementById('aspectratio-custom')?.value || '',
            lighting: document.getElementById('lighting-custom')?.value || '',
            quality: document.getElementById('quality-custom')?.value || ''
        };

        Object.keys(customInputs).forEach(category => {
            if (customInputs[category].trim()) {
                const inputText = customInputs[category].trim();
                // 입력된 언어 감지
                const hasKorean = /[가-힣]/.test(inputText);
                const hasEnglish = /[a-zA-Z]/.test(inputText);
                
                if (hasKorean && !hasEnglish) {
                    // 한글만 있는 경우 → 강력한 영문 번역
                    const translatedText = this.performKoreanToEnglishTranslation(inputText, '', '');
                    elements[category].push(translatedText);
                } else if (hasEnglish && !hasKorean) {
                    // 영문만 있는 경우 → 그대로 사용
                    elements[category].push(inputText);
                } else if (hasKorean && hasEnglish) {
                    // 혼합된 경우 → 전체를 강력한 번역으로 처리
                    const translatedText = this.performKoreanToEnglishTranslation(inputText, '', '');
                    elements[category].push(translatedText);
                } else {
                    // 기타 언어나 특수문자만 있는 경우 → 그대로 사용
                    elements[category].push(inputText);
                }
            }
        });

        return elements;
    }

    buildEnglishPrompt(elements) {
        let prompt = '';
        
        // Build prompt in logical order
        if (elements.subject.length > 0) {
            prompt += elements.subject.join(', ');
        }
        
        if (elements.description.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.description.join(', ');
        }
        
        if (elements.style.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.style.join(', ');
        }
        
        if (elements.camera.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.camera.join(', ');
        }
        
        if (elements.aspectratio.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.aspectratio.join(', ');
        }
        
        if (elements.lighting.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.lighting.join(', ');
        }
        
        if (elements.quality.length > 0) {
            if (prompt) prompt += ', ';
            prompt += elements.quality.join(', ');
        }

        return prompt || 'No elements selected';
    }

    collectKoreanElements() {
        const koreanElements = {
            subject: [],
            description: [],
            style: [],
            camera: [],
            aspectratio: [],
            lighting: [],
            quality: []
        };

        // Convert selected options to Korean
        Object.keys(this.selectedOptions).forEach(category => {
            if (category === 'aspectratio') {
                // 화면 비율은 단일 선택값
                if (this.selectedOptions[category]) {
                    const koreanText = this.getKoreanTranslation(this.selectedOptions[category]);
                    if (koreanText) {
                        koreanElements[category].push(koreanText);
                    }
                }
            } else {
                // 다른 카테고리들은 Set으로 처리
                this.selectedOptions[category].forEach(option => {
                    const koreanText = this.getKoreanTranslation(option);
                    if (koreanText) {
                        koreanElements[category].push(koreanText);
                    }
                });
            }
        });

        // Add custom inputs with translation for Korean prompt
        const customInputs = {
            subject: document.getElementById('subject-custom')?.value || '',
            description: document.getElementById('description-custom')?.value || '',
            style: document.getElementById('style-custom')?.value || '',
            camera: document.getElementById('camera-custom')?.value || '',
            aspectratio: document.getElementById('aspectratio-custom')?.value || '',
            lighting: document.getElementById('lighting-custom')?.value || '',
            quality: document.getElementById('quality-custom')?.value || ''
        };

        Object.keys(customInputs).forEach(category => {
            if (customInputs[category].trim()) {
                const inputText = customInputs[category].trim();
                // 입력된 언어 감지
                const hasKorean = /[가-힣]/.test(inputText);
                const hasEnglish = /[a-zA-Z]/.test(inputText);
                
                if (hasEnglish && !hasKorean) {
                    // 영문만 있는 경우 → 한글로 번역
                    const translatedText = this.performBasicTranslation(inputText, 'en-to-ko');
                    koreanElements[category].push(translatedText);
                } else if (hasKorean && !hasEnglish) {
                    // 한글만 있는 경우 → 그대로 사용
                    koreanElements[category].push(inputText);
                } else if (hasKorean && hasEnglish) {
                    // 혼합된 경우 → 영문 부분만 번역하여 조합
                    const translatedText = this.translateMixedText(inputText, 'en-to-ko');
                    koreanElements[category].push(translatedText);
                } else {
                    // 기타 언어나 특수문자만 있는 경우 → 그대로 사용
                    koreanElements[category].push(inputText);
                }
            }
        });

        return koreanElements;
    }

    buildKoreanPromptDirect(koreanElements) {
        let prompt = '';

        // Build Korean prompt
        if (koreanElements.subject.length > 0) {
            prompt += koreanElements.subject.join(', ');
        }
        
        if (koreanElements.description.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.description.join(', ');
        }
        
        if (koreanElements.style.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.style.join(', ');
        }
        
        if (koreanElements.camera.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.camera.join(', ');
        }
        
        if (koreanElements.aspectratio.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.aspectratio.join(', ');
        }
        
        if (koreanElements.lighting.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.lighting.join(', ');
        }
        
        if (koreanElements.quality.length > 0) {
            if (prompt) prompt += ', ';
            prompt += koreanElements.quality.join(', ');
        }

        return prompt || '선택된 요소가 없습니다';
    }

    buildKoreanPrompt(elements) {
        const koreanElements = this.collectKoreanElements();
        return this.buildKoreanPromptDirect(koreanElements);
    }

    getKoreanTranslation(optionKey) {
        const koreanTranslations = {
            // Subject
            'person': '사람',
            'animal': '동물',
            'landscape': '풍경',
            'architecture': '건축물',
            'object': '사물',
            'vehicle': '차량',
            'food': '음식',
            'abstract': '추상적',

            // Description
            'beautiful': '아름다운',
            'detailed': '상세한',
            'realistic': '사실적인',
            'elegant': '우아한',
            'dramatic': '드라마틱한',
            'vintage': '빈티지한',
            'futuristic': '미래적인',
            'colorful': '다채로운',
            'minimalist': '미니멀한',

            // Style
            'photorealistic': '포토리얼리스틱',
            'anime': '애니메이션 스타일',
            'oil_painting': '유화',
            'watercolor': '수채화',
            'digital_art': '디지털 아트',
            'sketch': '스케치',
            'cartoon': '카툰 스타일',
            'concept_art': '컨셉 아트',

            // Camera
            'close_up': '클로즈업',
            'medium_shot': '미디엄샷',
            'wide_shot': '와이드샷',
            'birds_eye': '조감도',
            'low_angle': '저각도',
            'high_angle': '고각도',
            'front_view': '정면',
            'side_view': '측면',

            // Aspect Ratio
            'square': '정사각형 1:1',
            'landscape': '가로형 4:3',
            'widescreen': '와이드스크린 16:9',
            'portrait': '세로형 9:16',
            'standard': '표준 3:4',
            'ultrawide': '울트라와이드 21:9',
            'cinema': '시네마 2.35:1',
            'banner': '배너 3:1',

            // Lighting
            'natural': '자연광',
            'golden_hour': '골든아워',
            'blue_hour': '블루아워',
            'studio': '스튜디오 조명',
            'dramatic': '드라마틱 조명',
            'soft': '부드러운 조명',
            'backlit': '역광',
            'neon': '네온 조명',

            // Quality
            'highly_detailed': '매우 상세한',
            'masterpiece': '걸작',
            'best_quality': '최고 품질',
            '8k': '8K 해상도',
            'sharp_focus': '선명한 초점',
            'professional': '전문적인',
            'award_winning': '수상작',
            'trending': '트렌딩'
        };

        return koreanTranslations[optionKey] || optionKey;
    }

    updateWordCount() {
        const englishText = document.getElementById('generated-english')?.value || '';
        const koreanText = document.getElementById('generated-korean')?.value || '';
        
        const englishWords = englishText.trim().split(/\s+/).filter(word => word.length > 0).length;
        const koreanWords = koreanText.trim().split(/\s+/).filter(word => word.length > 0).length;
        
        document.getElementById('en-word-count').textContent = `${englishWords} words`;
        document.getElementById('ko-word-count').textContent = `${koreanWords} 단어`;
    }

    updateStats() {
        let selectedCount = 0;
        Object.keys(this.selectedOptions).forEach(category => {
            if (category === 'aspectratio') {
                // 화면 비율은 단일 선택값
                if (this.selectedOptions[category]) {
                    selectedCount += 1;
                }
            } else {
                // 다른 카테고리들은 Set 크기
                selectedCount += this.selectedOptions[category].size;
            }
        });

        let customCount = 0;
        const customInputs = [
            'subject-custom', 'description-custom', 'style-custom',
            'camera-custom', 'aspectratio-custom', 'lighting-custom', 'quality-custom'
        ];
        
        customInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.value.trim()) {
                customCount++;
            }
        });

        document.getElementById('selected-count').textContent = selectedCount;
        document.getElementById('custom-count').textContent = customCount;
    }





    clearAllSelections() {
        // Clear selected options
        Object.keys(this.selectedOptions).forEach(category => {
            if (category === 'aspectratio') {
                // 화면 비율은 null로 초기화
                this.selectedOptions[category] = null;
            } else {
                // 다른 카테고리들은 Set clear
                this.selectedOptions[category].clear();
            }
        });

        // Clear UI selections
        document.querySelectorAll('.option-tag.selected').forEach(button => {
            button.classList.remove('selected');
        });

        // Clear custom inputs
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
            input.value = '';
        });
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        }[type] || 'bg-gray-500';
        
        const icon = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        }[type] || 'fas fa-info-circle';
        
        toast.className = `toast ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-sm`;
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-2 hover:bg-black/20 rounded p-1">
                <i class="fas fa-times text-sm"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }
}

// Global functions
function toggleOption(category, optionKey, displayText) {
    const button = event.target;
    
    if (category === 'aspectratio') {
        // 화면 비율은 단일 선택 - 라디오 버튼 방식
        const allAspectRatioButtons = document.querySelectorAll('#aspectratio-options .option-tag');
        
        if (promptBuilder.selectedOptions[category] === optionKey) {
            // 같은 버튼 클릭 시 선택 해제
            promptBuilder.selectedOptions[category] = null;
            button.classList.remove('selected');
        } else {
            // 다른 버튼들 모두 선택 해제
            allAspectRatioButtons.forEach(btn => btn.classList.remove('selected'));
            
            // 현재 버튼만 선택
            promptBuilder.selectedOptions[category] = optionKey;
            button.classList.add('selected');
        }
    } else {
        // 다른 카테고리들은 기존 다중 선택 방식 유지
        if (promptBuilder.selectedOptions[category].has(optionKey)) {
            // Remove selection
            promptBuilder.selectedOptions[category].delete(optionKey);
            button.classList.remove('selected');
        } else {
            // Add selection
            promptBuilder.selectedOptions[category].add(optionKey);
            button.classList.add('selected');
        }
    }
    
    
    // Trigger custom event
    document.dispatchEvent(new CustomEvent('optionChanged'));
}

function generatePrompt() {
    promptBuilder.generatePrompt();
}

function copyPrompt(type) {
    const englishText = document.getElementById('generated-english').value;
    const koreanText = document.getElementById('generated-korean').value;
    
    let textToCopy = '';
    
    switch(type) {
        case 'english':
            textToCopy = englishText;
            break;
        case 'korean':
            textToCopy = koreanText;
            break;
        case 'both':
            textToCopy = `English Prompt:\n${englishText}\n\nKorean Prompt:\n${koreanText}`;
            break;
    }
    
    if (!textToCopy.trim()) {
        promptBuilder.showToast('복사할 내용이 없습니다.', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const messages = {
            english: '영문 프롬프트가 복사되었습니다.',
            korean: '한국어 프롬프트가 복사되었습니다.',
            both: '모든 프롬프트가 복사되었습니다.'
        };
        promptBuilder.showToast(messages[type], 'success');
    }).catch(() => {
        promptBuilder.showToast('복사에 실패했습니다. 브라우저 권한을 확인하세요.', 'error');
    });
}

function clearAll() {
    if (confirm('모든 선택사항과 입력내용을 초기화하시겠습니까?')) {
        promptBuilder.clearAllSelections();
        document.getElementById('generated-english').value = '';
        document.getElementById('generated-korean').value = '';
        document.getElementById('reverse-parse-input').value = '';
        
        
        promptBuilder.updateStats();
        promptBuilder.updateWordCount();
        promptBuilder.showToast('모든 내용이 초기화되었습니다.', 'success');
    }
}





function copyIndividualPrompt(type) {
    let textToCopy = '';
    
    if (type === 'english') {
        textToCopy = document.getElementById('generated-english').value;
    } else if (type === 'korean') {
        textToCopy = document.getElementById('generated-korean').value;
    }
    
    if (!textToCopy.trim()) {
        promptBuilder.showToast('복사할 내용이 없습니다.', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const messages = {
            english: '영문 프롬프트가 복사되었습니다.',
            korean: '한국어 프롬프트가 복사되었습니다.'
        };
        promptBuilder.showToast(messages[type], 'success');
    }).catch(() => {
        promptBuilder.showToast('복사에 실패했습니다. 브라우저 권한을 확인하세요.', 'error');
    });
}

function clearIndividualPrompt(type) {
    if (type === 'english') {
        document.getElementById('generated-english').value = '';
        promptBuilder.showToast('영문 프롬프트가 삭제되었습니다.', 'success');
    } else if (type === 'korean') {
        document.getElementById('generated-korean').value = '';
        promptBuilder.showToast('한국어 프롬프트가 삭제되었습니다.', 'success');
    }
    
    promptBuilder.updateWordCount();
}

// Initialize the application
let promptBuilder;
document.addEventListener('DOMContentLoaded', () => {
    promptBuilder = new ImagePromptBuilder();
});

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImagePromptBuilder };
}