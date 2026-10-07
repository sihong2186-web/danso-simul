/**
 * Danso Finger Holes & Scale Model
 * 단소 5지공 상태, 운지법 판정, 제1공(뒷구멍) 위치 드래그 및 잠금 관리
 */

class DansoModel {
    constructor() {
        // 지공 상태: true = 닫힘(막음), false = 열림
        this.holes = {
            1: false, // 제1공 (뒤, 왼손 엄지)
            2: false, // 제2공 (앞1, 왼손 검지)
            3: false, // 제3공 (앞2, 왼손 중지)
            4: false, // 제4공 (앞3, 오른손 중지)
            5: false  // 제5공 (앞끝, 항상 열어둠)
        };

        // 제1공 위치 및 잠금 상태
        this.hole1Position = { x: 40, y: 160 }; // 기본 화면 좌상단 좌표
        this.isHole1Locked = true; // 기본값: 잠금 상태 (연주 중 밀림 방지)

        // 인터랙션 모드: 'hold' (누르고 있기) / 'toggle' (원터치 고정)
        this.inputMode = 'hold';

        // 저장된 위치 복원
        this.loadHole1Position();
    }

    /**
     * 저장된 제1공 위치 불러오기
     */
    loadHole1Position() {
        try {
            const saved = localStorage.getItem('danso_hole1_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    this.hole1Position = parsed;
                }
            }
            const savedLock = localStorage.getItem('danso_hole1_locked');
            if (savedLock !== null) {
                this.isHole1Locked = savedLock === 'true';
            }
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
    }

    /**
     * 제1공 위치 저장
     */
    saveHole1Position(x, y) {
        this.hole1Position = { x, y };
        try {
            localStorage.setItem('danso_hole1_pos', JSON.stringify(this.hole1Position));
        } catch (e) {}
    }

    /**
     * 제1공 잠금 토글
     */
    setHole1Lock(locked) {
        this.isHole1Locked = locked;
        try {
            localStorage.setItem('danso_hole1_locked', locked.toString());
        } catch (e) {}
    }

    /**
     * 제1공 위치 기본값(좌상단)으로 초기화
     */
    resetHole1Position() {
        this.hole1Position = { x: 40, y: 160 };
        this.saveHole1Position(40, 160);
    }

    /**
     * 지공 상태 변경
     */
    setHoleState(holeNum, isClosed) {
        if (holeNum >= 1 && holeNum <= 5) {
            this.holes[holeNum] = isClosed;
        }
    }

    /**
     * 모든 지공 열기
     */
    openAllHoles() {
        for (let i = 1; i <= 5; i++) {
            this.holes[i] = false;
        }
    }

    /**
     * 현재 운지 상태를 분석하여 율명(音) 및 주파수 판정
     * @param {boolean} isYeokchwi 역취(강하게 불기) 여부
     */
    evaluateNote(isYeokchwi = false) {
        const h1 = this.holes[1];
        const h2 = this.holes[2];
        const h3 = this.holes[3];
        const h4 = this.holes[4];

        // 1. 仲 (중 - Ab4, 415.3Hz): 1, 2, 3공 닫힘 / 4공 열림
        if (h1 && h2 && h3 && !h4) {
            if (isYeokchwi) {
                return {
                    nameHan: '淸仲',
                    nameKor: '청중',
                    solfege: '높은 라♭',
                    freq: 830.6,
                    isValid: true,
                    guide: '1·2·3공 닫음 (역취)'
                };
            }
            return {
                nameHan: '仲',
                nameKor: '중',
                solfege: '라♭ (Ab4)',
                freq: 415.3,
                isValid: true,
                guide: '1·2·3공 닫음'
            };
        }

        // 2. 林 (임 - Bb4, 466.16Hz): 1, 2공 닫힘 / 3, 4공 열림
        if (h1 && h2 && !h3 && !h4) {
            if (isYeokchwi) {
                return {
                    nameHan: '淸林',
                    nameKor: '청임',
                    solfege: '높은 시♭',
                    freq: 932.3,
                    isValid: true,
                    guide: '1·2공 닫음 (역취)'
                };
            }
            return {
                nameHan: '林',
                nameKor: '임',
                solfege: '시♭ (Bb4)',
                freq: 466.16,
                isValid: true,
                guide: '1·2공 닫음'
            };
        }

        // 3. 無 (무 - C5, 523.25Hz): 1공 닫힘 / 2, 3, 4공 열림
        if (h1 && !h2 && !h3 && !h4) {
            if (isYeokchwi) {
                return {
                    nameHan: '淸無',
                    nameKor: '청무',
                    solfege: '높은 도',
                    freq: 1046.5,
                    isValid: true,
                    guide: '1공만 닫음 (역취)'
                };
            }
            return {
                nameHan: '無',
                nameKor: '무',
                solfege: '도 (C5)',
                freq: 523.25,
                isValid: true,
                guide: '1공만 닫음'
            };
        }

        // 4. 潢 (황 - Eb5, 622.25Hz): 1, 2, 3, 4공 모두 열림
        if (!h1 && !h2 && !h3 && !h4) {
            if (isYeokchwi) {
                return {
                    nameHan: '淸潢',
                    nameKor: '청황',
                    solfege: '높은 미♭',
                    freq: 1244.5,
                    isValid: true,
                    guide: '모두 열림 (역취)'
                };
            }
            return {
                nameHan: '潢',
                nameKor: '황',
                solfege: '미♭ (Eb5)',
                freq: 622.25,
                isValid: true,
                guide: '모두 열림'
            };
        }

        // 5. 汰 (태 - F5, 698.46Hz):
        // 초등 단소 약식 운지: 2공만 닫힘 (1, 3, 4 열림)
        // 또는 1, 2, 3공 닫고 세게 불기 (역취)
        if (!h1 && h2 && !h3 && !h4) {
            return {
                nameHan: '汰',
                nameKor: '태',
                solfege: '파 (F5)',
                freq: 698.46,
                isValid: true,
                guide: '2공만 닫음'
            };
        }

        // 6. 夾 (협) or 南 (남 - 392Hz): 1, 2, 3, 4공 모두 닫음
        if (h1 && h2 && h3 && h4) {
            return {
                nameHan: '夾',
                nameKor: '협',
                solfege: '솔 (G4)',
                freq: 392.0,
                isValid: true,
                guide: '1·2·3·4공 모두 닫음'
            };
        }

        // 잘못된 운지 (구멍이 엉뚱하게 막힘)
        return {
            nameHan: '？',
            nameKor: '헛바람',
            solfege: '운지 확인 필요',
            freq: 500.0,
            isValid: false,
            guide: '운지법을 확인해주세요! (중·임·무·황·태)'
        };
    }
}

// Global instance
window.dansoModel = new DansoModel();
