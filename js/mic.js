/**
 * Danso Microphone & Breath Detection Engine
 * 마이크 입김(바람소리) 실시간 분석 및 하이브리드 연주 제어
 */

class BreathDetector {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.isListening = false;
        
        // Blow parameters
        this.sensitivity = 3; // 1 (둔함) ~ 5 (민감), 기본 3
        this.threshold = 0.12; // 입김 감지 기준값
        this.blowPower = 0.0; // 0.0 ~ 1.0
        this.isBlowing = false;
        this.isYeokchwi = false; // 역취 (세게 불기) 여부
        
        // Mode: 'hybrid' (입김+터치) or 'touch' (터치만)
        this.mode = 'hybrid'; 
        
        // Listeners for UI updates
        this.onBlowUpdate = null; // callback(power, isBlowing, isYeokchwi)
        this.onError = null; // callback(errMsg)
        this.animFrameId = null;

        // Moving average filter for smooth breath response
        this.smoothBlow = 0.0;
    }

    /**
     * 마이크 스트림 연결 및 감지 시작
     */
    async startMic() {
        if (this.isListening) return true;

        try {
            // Audio context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Request microphone with raw settings (disable browser AGC and noise suppression for raw wind detection)
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };

            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Analyser node for FFT spectrum
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.3;

            source.connect(this.analyser);

            this.isListening = true;
            this.updateThreshold();
            this.processAudio();
            return true;
        } catch (err) {
            console.error('Microphone access failed:', err);
            let message = '마이크 접근 권한이 필요합니다.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = '마이크 권한이 차단되었습니다. 브라우저 주소창 왼쪽 자물쇠/설정에서 마이크를 허용해주세요!';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                message = '연결된 마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
            } else if (!window.isSecureContext) {
                message = '보안 연결(localhost 또는 HTTPS) 환경에서만 마이크를 사용할 수 있습니다. start.bat을 실행해주세요.';
            }
            if (this.onError) this.onError(message);
            return false;
        }
    }

    /**
     * 마이크 정지
     */
    stopMic() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        this.isListening = false;
        this.isBlowing = false;
        this.blowPower = 0.0;
        this.smoothBlow = 0.0;
        if (this.onBlowUpdate) this.onBlowUpdate(0, false, false);
    }

    /**
     * 감도 조절 (1 ~ 5)
     */
    setSensitivity(level) {
        this.sensitivity = Math.max(1, Math.min(5, level));
        this.updateThreshold();
    }

    updateThreshold() {
        // 감도가 높을수록 문턱값(threshold)은 낮아짐
        // 1: 0.22, 2: 0.16, 3: 0.12, 4: 0.08, 5: 0.05
        const thresholds = [0.25, 0.18, 0.12, 0.07, 0.04];
        this.threshold = thresholds[this.sensitivity - 1] || 0.12;
    }

    /**
     * 모드 전환: 'hybrid' (입김+터치) / 'touch' (터치만)
     */
    setMode(mode) {
        this.mode = mode;
        if (mode === 'touch') {
            // 터치 모드에서는 항시 가상 바람 활성화
            this.isBlowing = true;
            this.blowPower = 0.8;
            this.isYeokchwi = false;
        } else {
            // 하이브리드 모드로 전환 시 실제 마이크 감지 상태 복원
            this.isBlowing = false;
            this.blowPower = 0.0;
        }
    }

    /**
     * 실시간 오디오 루프 (바람/입김 감지 알고리즘)
     */
    processAudio() {
        if (!this.isListening || !this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);

        this.analyser.getByteTimeDomainData(timeData);
        this.analyser.getByteFrequencyData(freqData);

        // 1. Time-domain RMS (전체 진폭 에너지)
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // 2. Frequency-domain: Low-frequency Pop (<200Hz) vs High-frequency Noise (2kHz-6kHz)
        // 입김이 마이크에 닿을 때 발생하는 강력한 공기 터뷸런스(저주파 팝)와 마찰 노이즈
        let lowFreqSum = 0;
        const lowCutoffIndex = Math.floor(bufferLength * (200 / (this.audioContext.sampleRate / 2)));
        for (let i = 0; i < Math.max(1, lowCutoffIndex); i++) {
            lowFreqSum += freqData[i];
        }
        const lowEnergy = lowFreqSum / (Math.max(1, lowCutoffIndex) * 255);

        let highFreqSum = 0;
        const highStartIndex = Math.floor(bufferLength * (1500 / (this.audioContext.sampleRate / 2)));
        const highEndIndex = Math.floor(bufferLength * (6000 / (this.audioContext.sampleRate / 2)));
        let countHigh = 0;
        for (let i = highStartIndex; i < Math.min(bufferLength, highEndIndex); i++) {
            highFreqSum += freqData[i];
            countHigh++;
        }
        const highEnergy = countHigh > 0 ? highFreqSum / (countHigh * 255) : 0;

        // 종합 바람 강도 계산 (RMS + Low Pop + High Friction)
        const rawPower = (rms * 1.6) + (lowEnergy * 0.7) + (highEnergy * 0.4);

        // 감도에 따른 배율 적용
        const scaleFactor = 1.0 + (this.sensitivity - 3) * 0.3;
        const scaledPower = rawPower * scaleFactor;

        // Smooth with EMA filter (급격한 튀김 방지 및 자연스러운 반응)
        this.smoothBlow = (this.smoothBlow * 0.75) + (scaledPower * 0.25);

        if (this.mode === 'hybrid') {
            if (this.smoothBlow > this.threshold) {
                this.isBlowing = true;
                // 정규화: threshold ~ threshold + 0.4 -> 0.2 ~ 1.0
                const normalized = Math.min(1.0, 0.2 + ((this.smoothBlow - this.threshold) / 0.35) * 0.8);
                this.blowPower = normalized;
                // 역취(Yeokchwi) 판별: 강하게 불었을 때 (0.75 이상)
                this.isYeokchwi = normalized >= 0.75;
            } else {
                this.isBlowing = false;
                this.blowPower = Math.max(0, this.smoothBlow / this.threshold * 0.18);
                this.isYeokchwi = false;
            }

            if (this.onBlowUpdate) {
                this.onBlowUpdate(this.blowPower, this.isBlowing, this.isYeokchwi);
            }
        } else {
            // 터치 모드: UI 게이지에 현재 마이크가 반응하더라도 연주는 터치로 보장
            if (this.onBlowUpdate) {
                this.onBlowUpdate(1.0, true, false);
            }
        }

        this.animFrameId = requestAnimationFrame(() => this.processAudio());
    }
}

// Global instance
window.breathDetector = new BreathDetector();
