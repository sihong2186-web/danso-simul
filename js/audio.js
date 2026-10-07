/**
 * Danso Audio Engine - Web Audio API
 * 전통 단소의 독특한 대나무 음색, 취구 바람소리(Chiff noise), 요성(Vibrato), 공간감을 합성
 */

class DansoAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.filterNode = null;
        
        // Active sound state
        this.isPlaying = false;
        this.currentFreq = 415.3; // Default 仲 (Ab4)
        this.currentNoteName = '仲';
        this.breathGain = null;
        this.oscGains = [];
        this.oscillators = [];
        this.noiseSource = null;
        this.noiseGain = null;
        this.noiseFilter = null;
        this.vibratoOsc = null;
        this.vibratoGain = null;
        
        // Reverb wet/dry
        this.reverbGain = null;
        this.dryGain = null;
        
        // Noise buffer
        this.noiseBuffer = null;
        
        // Sound configuration
        this.volume = 0.85;
        this.reverbAmount = 0.35;
        this.isMuted = false;
    }

    /**
     * AudioContext 초기화 (사용자 제스처 후 호출)
     */
    init() {
        if (this.ctx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // Master Volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Dry / Wet Reverb setup
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.setValueAtTime(1.0 - this.reverbAmount * 0.5, this.ctx.currentTime);

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.setValueAtTime(this.reverbAmount, this.ctx.currentTime);

        // Create algorithmic Hanok/Concert Hall Reverb
        this.createReverb();

        // Bamboo tube body resonance filter
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(3200, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

        // Routing
        this.filterNode.connect(this.dryGain);
        this.filterNode.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);

        this.dryGain.connect(this.masterGain);
        this.reverbGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Pre-create 2-second white/pink noise buffer for breath chiff
        this.generateNoiseBuffer();
    }

    /**
     * 풍부한 공간감을 위한 Reverb 생성 (임펄스 응답 생성)
     */
    createReverb() {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 1.8; // 1.8 seconds decay
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (sampleRate * 0.45));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }

        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = impulse;
    }

    /**
     * 대나무 관악기 특유의 취구 마찰음(바람소리) 버퍼
     */
    generateNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Pink-ish noise filter
            lastOut = (lastOut * 0.95) + (white * 0.05);
            data[i] = lastOut * 3.5;
        }
    }

    /**
     * 단소 소리 시작
     * @param {number} freq 주파수 (Hz)
     * @param {number} intensity 세기 (0.0 ~ 1.0)
     * @param {boolean} isLeak 잘못된 운지 헛바람음 여부
     */
    startTone(freq, intensity = 0.8, isLeak = false) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // 이미 재생 중이면 주파수 및 세기만 부드럽게 글라이드 (Legato)
        if (this.isPlaying) {
            this.updateTone(freq, intensity, isLeak);
            return;
        }

        const now = this.ctx.currentTime;
        this.isPlaying = true;
        this.currentFreq = freq;

        // 1. Vibrato LFO (요성 - 搖聲)
        this.vibratoOsc = this.ctx.createOscillator();
        this.vibratoOsc.frequency.setValueAtTime(4.6, now); // ~4.6Hz 한국 전통 요성 주기
        this.vibratoGain = this.ctx.createGain();
        this.vibratoGain.gain.setValueAtTime(isLeak ? 0 : freq * 0.012, now); // 미세 피치 변조
        this.vibratoOsc.connect(this.vibratoGain);
        this.vibratoOsc.start(now);

        // 2. Harmonics Oscillators (단소 대나무 배음 구조)
        // 기본파(1.0), 2배음(0.32), 3배음(0.18), 4배음(0.06), 5배음(0.03)
        const harmonics = isLeak ? [] : [
            { mult: 1, type: 'sine', gain: 0.75 },
            { mult: 2, type: 'sine', gain: 0.30 },
            { mult: 3, type: 'sine', gain: 0.16 },
            { mult: 4, type: 'triangle', gain: 0.07 },
            { mult: 5, type: 'sine', gain: 0.03 }
        ];

        this.oscillators = [];
        this.oscGains = [];

        harmonics.forEach(h => {
            const osc = this.ctx.createOscillator();
            osc.type = h.type;
            osc.frequency.setValueAtTime(freq * h.mult, now);
            this.vibratoGain.connect(osc.frequency);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(h.gain * intensity, now + 0.045); // 부드러운 취구 어택

            osc.connect(gain);
            gain.connect(this.filterNode);
            osc.start(now);

            this.oscillators.push(osc);
            this.oscGains.push(gain);
        });

        // 3. Breath Air Noise (취구의 바람소리 Chiff)
        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = this.noiseBuffer;
        this.noiseSource.loop = true;

        this.noiseFilter = this.ctx.createBiquadFilter();
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(isLeak ? 1200 : freq * 1.5, now);
        this.noiseFilter.Q.setValueAtTime(isLeak ? 0.8 : 2.5, now);

        this.noiseGain = this.ctx.createGain();
        const noiseLevel = isLeak ? 0.45 * intensity : 0.16 * intensity;
        this.noiseGain.gain.setValueAtTime(0.0001, now);
        this.noiseGain.gain.linearRampToValueAtTime(noiseLevel, now + 0.03);

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.filterNode);
        this.noiseSource.start(now);
    }

    /**
     * 운지가 바뀌거나 바람 세기가 바뀔 때 부드럽게 음 전환 (Legato 연주)
     */
    updateTone(freq, intensity = 0.8, isLeak = false) {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const glideTime = 0.035; // 35ms 포르타멘토

        this.currentFreq = freq;

        // Vibrato depth 업데이트
        if (this.vibratoGain) {
            this.vibratoGain.gain.cancelScheduledValues(now);
            this.vibratoGain.gain.setTargetAtTime(isLeak ? 0 : freq * 0.012, now, glideTime);
        }

        // Oscillators frequency 및 gain 글라이드
        const harmonicMultipliers = [1, 2, 3, 4, 5];
        const baseGains = [0.75, 0.30, 0.16, 0.07, 0.03];

        this.oscillators.forEach((osc, idx) => {
            if (isLeak) {
                // 헛바람일 때는 악기 오실레이터 소리 축소
                this.oscGains[idx].gain.setTargetAtTime(0.0001, now, glideTime);
            } else {
                const targetFreq = freq * (harmonicMultipliers[idx] || 1);
                osc.frequency.cancelScheduledValues(now);
                osc.frequency.setTargetAtTime(targetFreq, now, glideTime);

                const targetGain = (baseGains[idx] || 0.05) * intensity;
                this.oscGains[idx].gain.cancelScheduledValues(now);
                this.oscGains[idx].gain.setTargetAtTime(targetGain, now, glideTime);
            }
        });

        // Noise filter 업데이트
        if (this.noiseFilter && this.noiseGain) {
            this.noiseFilter.frequency.setTargetAtTime(isLeak ? 1200 : freq * 1.5, now, glideTime);
            const noiseLevel = isLeak ? 0.45 * intensity : 0.16 * intensity;
            this.noiseGain.gain.setTargetAtTime(noiseLevel, now, glideTime);
        }
    }

    /**
     * 단소 소리 멈춤 (자연스러운 잔향과 함께 서서히 릴리즈)
     */
    stopTone() {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const releaseTime = 0.09; // 90ms 릴리즈

        this.isPlaying = false;

        // Fade out oscillators
        this.oscGains.forEach(gain => {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
        });

        // Fade out noise
        if (this.noiseGain) {
            this.noiseGain.gain.cancelScheduledValues(now);
            this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
            this.noiseGain.gain.linearRampToValueAtTime(0.0001, now + releaseTime);
        }

        // Stop nodes after release
        setTimeout(() => {
            this.oscillators.forEach(osc => {
                try { osc.stop(); osc.disconnect(); } catch (e) {}
            });
            this.oscillators = [];
            this.oscGains = [];

            if (this.noiseSource) {
                try { this.noiseSource.stop(); this.noiseSource.disconnect(); } catch (e) {}
                this.noiseSource = null;
            }
            if (this.vibratoOsc) {
                try { this.vibratoOsc.stop(); this.vibratoOsc.disconnect(); } catch (e) {}
                this.vibratoOsc = null;
            }
        }, releaseTime * 1000 + 30);
    }

    /**
     * 마스터 볼륨 설정 (0.0 ~ 1.0)
     */
    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.02);
        }
    }

    /**
     * 잔향(공간감) 조절 (0.0 ~ 1.0)
     */
    setReverb(val) {
        this.reverbAmount = Math.max(0, Math.min(1, val));
        if (this.dryGain && this.reverbGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.dryGain.gain.setTargetAtTime(1.0 - this.reverbAmount * 0.5, now, 0.05);
            this.reverbGain.gain.setTargetAtTime(this.reverbAmount, now, 0.05);
        }
    }
}

// Global instance
window.dansoAudio = new DansoAudioEngine();
