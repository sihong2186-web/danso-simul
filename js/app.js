/**
 * Danso Simulator Main Application Controller
 * UI 이벤트, 멀티터치, 마이크-오디오 연동, 제1공 위치 조정 및 잠금
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Model & Engines
    const model = window.dansoModel;
    const audio = window.dansoAudio;
    const mic = window.breathDetector;

    // 2. DOM Elements
    const hole1Pad = document.getElementById('hole1-pad');
    const hole1DragHandle = document.getElementById('hole1-drag-handle');
    const btnHole1Lock = document.getElementById('btn-hole1-lock');
    const btnHole1Reset = document.getElementById('btn-hole1-reset');
    const hole1LockStatus = document.getElementById('hole1-lock-status');

    // Danso finger hole elements
    const holeElements = {
        1: document.getElementById('hole-1'),
        2: document.getElementById('hole-2'),
        3: document.getElementById('hole-3'),
        4: document.getElementById('hole-4'),
        5: document.getElementById('hole-5')
    };

    // Note Display Elements
    const noteCard = document.getElementById('note-card');
    const noteHanElem = document.getElementById('note-han');
    const noteKorElem = document.getElementById('note-kor');
    const noteSolfegeElem = document.getElementById('note-solfege');
    const noteGuideElem = document.getElementById('note-guide');
    const noteStatusBadge = document.getElementById('note-status-badge');

    // Wind Meter & Mouthpiece
    const windGaugeFill = document.getElementById('wind-gauge-fill');
    const windText = document.getElementById('wind-text');
    const windBadge = document.getElementById('wind-badge');
    const mouthpieceVapor = document.getElementById('mouthpiece-vapor');

    // Controls
    const modeSwitchRadios = document.querySelectorAll('input[name="playMode"]');
    const inputModeSelect = document.getElementById('input-mode-select');
    const micSensitivitySlider = document.getElementById('mic-sensitivity');
    const sensitivityValText = document.getElementById('sensitivity-val');
    const volumeSlider = document.getElementById('volume-slider');
    const reverbSlider = document.getElementById('reverb-slider');
    const btnAllOpen = document.getElementById('btn-all-open');
    const btnGuideModal = document.getElementById('btn-guide-modal');
    const modalGuide = document.getElementById('modal-guide');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Song practice
    const songSelect = document.getElementById('song-select');
    const songView = document.getElementById('song-view');
    const songTitleElem = document.getElementById('song-title');
    const songNotesContainer = document.getElementById('song-notes-container');
    const btnPrevNote = document.getElementById('btn-prev-note');
    const btnNextNote = document.getElementById('btn-next-note');
    let currentSong = null;
    let currentSongNoteIndex = 0;

    // Track active touch identifiers for 'hold' mode
    const activeTouches = new Map(); // touchId -> holeNum

    // -------------------------------------------------------------
    // 초기 설정 및 제1공 위치 복원
    // -------------------------------------------------------------
    function initHole1Position() {
        applyHole1Position(model.hole1Position.x, model.hole1Position.y);
        updateHole1LockUI(model.isHole1Locked);
    }

    function applyHole1Position(x, y) {
        // 화면 경계 내 제한
        const maxX = Math.max(0, window.innerWidth - hole1Pad.offsetWidth - 10);
        const maxY = Math.max(0, window.innerHeight - hole1Pad.offsetHeight - 10);
        const clampedX = Math.max(10, Math.min(maxX, x));
        const clampedY = Math.max(60, Math.min(maxY, y));

        hole1Pad.style.left = `${clampedX}px`;
        hole1Pad.style.top = `${clampedY}px`;
    }

    function updateHole1LockUI(isLocked) {
        if (isLocked) {
            hole1Pad.classList.add('locked');
            hole1Pad.classList.remove('unlocked');
            btnHole1Lock.innerHTML = '<span class="icon">🔒</span><span class="btn-text">위치 잠김</span>';
            btnHole1Lock.title = '클릭하면 위치를 이동할 수 있습니다';
            btnHole1Lock.setAttribute('aria-pressed', 'true');
            if (hole1LockStatus) hole1LockStatus.textContent = '🔒 고정됨';
        } else {
            hole1Pad.classList.remove('locked');
            hole1Pad.classList.add('unlocked');
            btnHole1Lock.innerHTML = '<span class="icon">🔓</span><span class="btn-text">위치 이동 중</span>';
            btnHole1Lock.title = '원하는 위치로 드래그한 후 클릭하여 고정하세요';
            btnHole1Lock.setAttribute('aria-pressed', 'false');
            if (hole1LockStatus) hole1LockStatus.textContent = '🔓 드래그 이동 가능';
        }
    }

    // 제1공 드래그 인터랙션
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPadX = 0;
    let initialPadY = 0;

    function startDrag(e) {
        if (model.isHole1Locked) return;
        
        // 버튼 자체나 지공 구멍을 직접 누른 경우는 제외(지공 터치 우선)
        if (e.target.closest('#btn-hole1-lock') || e.target.closest('#btn-hole1-reset')) {
            return;
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        isDragging = true;
        dragStartX = clientX;
        dragStartY = clientY;
        const rect = hole1Pad.getBoundingClientRect();
        initialPadX = rect.left;
        initialPadY = rect.top;

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function onDragMove(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;

        applyHole1Position(initialPadX + deltaX, initialPadY + deltaY);
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', endDrag);

        const rect = hole1Pad.getBoundingClientRect();
        model.saveHole1Position(rect.left, rect.top);
    }

    hole1Pad.addEventListener('mousedown', startDrag);
    hole1Pad.addEventListener('touchstart', startDrag, { passive: false });

    // 잠금 토글 버튼
    btnHole1Lock.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !model.isHole1Locked;
        model.setHole1Lock(newState);
        updateHole1LockUI(newState);
    });

    // 위치 초기화 버튼
    btnHole1Reset.addEventListener('click', (e) => {
        e.stopPropagation();
        model.resetHole1Position();
        applyHole1Position(model.hole1Position.x, model.hole1Position.y);
    });

    // -------------------------------------------------------------
    // 지공(Holes) 터치 및 상호작용
    // -------------------------------------------------------------
    function setupHoleInteractions() {
        for (let num = 1; num <= 5; num++) {
            const hole = holeElements[num];
            if (!num || !hole) continue;

            // 5공은 안내 전용 (열려 있음)
            if (num === 5) {
                hole.addEventListener('click', () => {
                    showToast('제5공은 단소 아래 끝 구멍으로 항상 열어두는 구멍입니다!');
                });
                continue;
            }

            // Mouse / Desktop Click
            hole.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHoleStart(num);
            });

            hole.addEventListener('mouseup', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHoleEnd(num);
            });

            // Touch events for mobile/tablet
            hole.addEventListener('touchstart', (e) => {
                // If hole1 is unlocked, prevent accidental hole toggle when intending to drag
                if (num === 1 && !model.isHole1Locked) return;

                e.preventDefault();
                e.stopPropagation();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    activeTouches.set(touch.identifier, num);
                }
                handleHoleStart(num);
            }, { passive: false });

            hole.addEventListener('touchend', (e) => {
                if (num === 1 && !model.isHole1Locked) return;

                e.preventDefault();
                e.stopPropagation();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    activeTouches.delete(touch.identifier);
                }
                handleHoleEnd(num);
            }, { passive: false });

            hole.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    activeTouches.delete(e.changedTouches[i].identifier);
                }
                handleHoleEnd(num);
            });
        }

        // Mouse leave window safety
        window.addEventListener('mouseup', () => {
            if (model.inputMode === 'hold') {
                for (let i = 1; i <= 4; i++) {
                    if (model.holes[i]) {
                        model.setHoleState(i, false);
                    }
                }
                updateHolesUI();
                syncAudioSound();
            }
        });
    }

    function handleHoleStart(num) {
        audio.init(); // Initialize audio context on user gesture

        if (model.inputMode === 'toggle') {
            // 원터치 모드: 토글
            const newState = !model.holes[num];
            model.setHoleState(num, newState);
        } else {
            // 누르고 있기 모드: 닫음
            model.setHoleState(num, true);
        }

        updateHolesUI();
        syncAudioSound();
    }

    function handleHoleEnd(num) {
        if (model.inputMode === 'hold') {
            // 손가락을 떼면 열림
            model.setHoleState(num, false);
            updateHolesUI();
            syncAudioSound();
        }
    }

    function updateHolesUI() {
        for (let num = 1; num <= 5; num++) {
            const hole = holeElements[num];
            if (!hole) continue;

            const isClosed = model.holes[num];
            if (isClosed) {
                hole.classList.add('closed');
                hole.classList.remove('open');
                hole.setAttribute('aria-pressed', 'true');
            } else {
                hole.classList.remove('closed');
                hole.classList.add('open');
                hole.setAttribute('aria-pressed', 'false');
            }
        }

        // 현재 율명 평가 및 디스플레이 업데이트
        updateNoteDisplay();
    }

    // -------------------------------------------------------------
    // 음(율명) 및 오디오 재생 동기화
    // -------------------------------------------------------------
    function updateNoteDisplay() {
        const isYeok = (mic.mode === 'hybrid') ? mic.isYeokchwi : false;
        const noteInfo = model.evaluateNote(isYeok);

        noteHanElem.textContent = noteInfo.nameHan;
        noteKorElem.textContent = noteInfo.nameKor;
        noteSolfegeElem.textContent = noteInfo.solfege;
        noteGuideElem.textContent = noteInfo.guide;

        if (noteInfo.isValid) {
            noteCard.classList.remove('invalid-note');
            noteCard.classList.add('valid-note');
            noteStatusBadge.textContent = isYeok ? '🔥 역취 (높은음)' : '🌿 평취 (맑은소리)';
            noteStatusBadge.className = isYeok ? 'badge badge-yeokchwi' : 'badge badge-valid';
        } else {
            noteCard.classList.remove('valid-note');
            noteCard.classList.add('invalid-note');
            noteStatusBadge.textContent = '💨 운지 확인 필요';
            noteStatusBadge.className = 'badge badge-invalid';
        }

        checkSongMatch(noteInfo);
    }

    function syncAudioSound() {
        const isBlowing = (mic.mode === 'hybrid') ? mic.isBlowing : true;
        const isYeok = (mic.mode === 'hybrid') ? mic.isYeokchwi : false;
        const blowIntensity = (mic.mode === 'hybrid') ? mic.blowPower : 0.85;

        // 아무 구멍도 안 누르고 마이크도 안 불면?
        // 단소는 모두 열면 '황(潢)' 소리가 나지만, 마이크를 안 불면 소리가 안 나야 함!
        if (mic.mode === 'hybrid' && !isBlowing) {
            audio.stopTone();
            return;
        }

        // 터치 모드인 경우: 구멍이 하나라도 닫혀있거나 황(潢)을 누른 상태인지 확인
        // 만약 터치 모드에서 모든 구멍이 열려있다면 기본 潢 소리 재생 여부:
        // 초등학생들이 터치 모드에서 연주할 때, 화면을 누르고 있을 때만 소리 나게 처리(자연스러운 연주)
        if (mic.mode === 'touch' && model.inputMode === 'hold') {
            const anyHoleClosed = model.holes[1] || model.holes[2] || model.holes[3] || model.holes[4];
            if (!anyHoleClosed) {
                // 터치 모드에서 손을 모두 뗐을 때는 소리 정지
                audio.stopTone();
                return;
            }
        }

        const noteInfo = model.evaluateNote(isYeok);
        audio.startTone(noteInfo.freq, blowIntensity, !noteInfo.isValid);
    }

    // -------------------------------------------------------------
    // 마이크 & 하이브리드 모드 제어
    // -------------------------------------------------------------
    mic.onBlowUpdate = (power, isBlowing, isYeokchwi) => {
        // UI 게이지 바 업데이트
        const pct = Math.round(power * 100);
        windGaugeFill.style.width = `${pct}%`;

        if (mic.mode === 'hybrid') {
            if (isBlowing) {
                mouthpieceVapor.classList.add('active');
                if (isYeokchwi) {
                    windText.textContent = `🌪️ 세게 부는 중! (역취 - 고음) ${pct}%`;
                    windBadge.textContent = '강한 바람';
                    windGaugeFill.style.background = 'linear-gradient(90deg, #38bdf8, #f43f5e)';
                } else {
                    windText.textContent = `💨 입김 감지 중! (평취) ${pct}%`;
                    windBadge.textContent = '적당한 바람';
                    windGaugeFill.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
                }
            } else {
                mouthpieceVapor.classList.remove('active');
                windText.textContent = `마이크에 입김을 "후~" 하고 불어보세요! (${pct}%)`;
                windBadge.textContent = '바람 없음';
                windGaugeFill.style.background = 'linear-gradient(90deg, #64748b, #94a3b8)';
            }
        } else {
            mouthpieceVapor.classList.toggle('active', audio.isPlaying);
            windText.textContent = `👆 터치 전용 모드 (화면 지공을 누르면 소리가 납니다)`;
            windBadge.textContent = '터치 모드';
        }

        updateNoteDisplay();
        syncAudioSound();
    };

    mic.onError = (msg) => {
        showToast(`⚠️ ${msg}`, 4000);
    };

    // 모드 변경 라디오 (하이브리드 vs 터치 모드)
    modeSwitchRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const selectedMode = e.target.value;
            mic.setMode(selectedMode);

            if (selectedMode === 'hybrid') {
                const ok = await mic.startMic();
                if (!ok) {
                    // 마이크 실패 시 터치 모드로 롤백
                    document.querySelector('input[value="touch"]').checked = true;
                    mic.setMode('touch');
                } else {
                    showToast('🎤 마이크가 켜졌습니다. 입김을 불며 연주해보세요!');
                }
            } else {
                mic.stopMic();
                showToast('👆 터치 전용 모드로 변경되었습니다.');
            }
            updateNoteDisplay();
            syncAudioSound();
        });
    });

    // 지공 입력 방식 (누르고 있기 vs 원터치 토글)
    inputModeSelect.addEventListener('change', (e) => {
        model.inputMode = e.target.value;
        showToast(model.inputMode === 'hold' ? '🖐️ 손가락을 떼면 구멍이 열립니다 (실제 연주)' : '🔘 터치할 때마다 열림/닫힘이 고정됩니다 (원터치)');
    });

    // 마이크 감도 슬라이더
    micSensitivitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        mic.setSensitivity(val);
        sensitivityValText.textContent = `${val}단계`;
    });

    // 볼륨 조절
    volumeSlider.addEventListener('input', (e) => {
        audio.setVolume(parseFloat(e.target.value));
    });

    // 잔향(울림) 조절
    reverbSlider.addEventListener('input', (e) => {
        audio.setReverb(parseFloat(e.target.value));
    });

    // 모든 지공 열기 버튼
    btnAllOpen.addEventListener('click', () => {
        model.openAllHoles();
        updateHolesUI();
        syncAudioSound();
        showToast('모든 지공이 열렸습니다 (황: 潢).');
    });

    // -------------------------------------------------------------
    // 초등 3학년 연습곡 악보 기능
    // -------------------------------------------------------------
    function initSongPractice() {
        if (!window.DANSO_SONGS || window.DANSO_SONGS.length === 0) return;

        // 드롭다운 채우기
        songSelect.innerHTML = '<option value="">-- 연습할 곡을 선택해보세요 --</option>';
        window.DANSO_SONGS.forEach(song => {
            const opt = document.createElement('option');
            opt.value = song.id;
            opt.textContent = song.title;
            songSelect.appendChild(opt);
        });

        songSelect.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (!selectedId) {
                songView.classList.add('hidden');
                currentSong = null;
                return;
            }
            currentSong = window.DANSO_SONGS.find(s => s.id === selectedId);
            currentSongNoteIndex = 0;
            renderSongView();
        });

        btnPrevNote.addEventListener('click', () => {
            if (!currentSong) return;
            currentSongNoteIndex = Math.max(0, currentSongNoteIndex - 1);
            updateSongHighlight();
        });

        btnNextNote.addEventListener('click', () => {
            if (!currentSong) return;
            currentSongNoteIndex = Math.min(currentSong.notes.length - 1, currentSongNoteIndex + 1);
            updateSongHighlight();
        });
    }

    function renderSongView() {
        if (!currentSong) return;
        songView.classList.remove('hidden');
        songTitleElem.textContent = currentSong.title;

        songNotesContainer.innerHTML = '';
        currentSong.notes.forEach((item, idx) => {
            const block = document.createElement('div');
            block.className = `song-note-block ${idx === currentSongNoteIndex ? 'current' : ''}`;
            block.dataset.index = idx;
            block.innerHTML = `
                <div class="note-han-small">${item.note}</div>
                <div class="note-lyrics">${item.lyrics}</div>
            `;
            block.addEventListener('click', () => {
                currentSongNoteIndex = idx;
                updateSongHighlight();
                // 해당 음 운지 자동 세팅 가이드 힌트
                applySuggestedHoles(item.holes);
            });
            songNotesContainer.appendChild(block);
        });

        updateSongHighlight();
    }

    function updateSongHighlight() {
        if (!currentSong) return;
        const blocks = songNotesContainer.querySelectorAll('.song-note-block');
        blocks.forEach((b, idx) => {
            b.classList.toggle('current', idx === currentSongNoteIndex);
        });
        
        // 현재 타겟 음에 맞게 스크롤
        const targetBlock = blocks[currentSongNoteIndex];
        if (targetBlock) {
            targetBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    function checkSongMatch(currentNote) {
        if (!currentSong) return;
        const target = currentSong.notes[currentSongNoteIndex];
        if (!target) return;

        if (currentNote.nameHan === target.note && currentNote.isValid) {
            // 학생이 올바른 음을 짚었을 때 시각적 축하 효과
            const blocks = songNotesContainer.querySelectorAll('.song-note-block');
            const targetBlock = blocks[currentSongNoteIndex];
            if (targetBlock && !targetBlock.classList.contains('success')) {
                targetBlock.classList.add('success');
                // 1.5초 후 다음 음으로 자동 전진
                setTimeout(() => {
                    if (currentSongNoteIndex < currentSong.notes.length - 1) {
                        currentSongNoteIndex++;
                        updateSongHighlight();
                    }
                }, 900);
            }
        }
    }

    function applySuggestedHoles(holes) {
        if (!holes) return;
        for (let i = 1; i <= 4; i++) {
            model.setHoleState(i, holes[i - 1]);
        }
        updateHolesUI();
        syncAudioSound();
    }

    // -------------------------------------------------------------
    // 가이드 모달 (운지법 한눈에 보기)
    // -------------------------------------------------------------
    btnGuideModal.addEventListener('click', () => {
        modalGuide.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
        modalGuide.classList.add('hidden');
    });

    modalGuide.addEventListener('click', (e) => {
        if (e.target === modalGuide) {
            modalGuide.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------
    // 토스트 알림 헬퍼
    // -------------------------------------------------------------
    let toastTimeout = null;
    function showToast(message, duration = 2500) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.className = 'app-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // -------------------------------------------------------------
    // 시작 시 자동 초기화
    // -------------------------------------------------------------
    initHole1Position();
    setupHoleInteractions();
    updateHolesUI();
    initSongPractice();

    // 화면 크기 변경 시 제1공 화면 밖 이탈 방지
    window.addEventListener('resize', () => {
        applyHole1Position(model.hole1Position.x, model.hole1Position.y);
    });

    // 기본 모드는 하이브리드 라디오가 체크되어 있으므로, 첫 클릭 시 마이크 허용 안내
    const hybridRadio = document.querySelector('input[value="hybrid"]');
    if (hybridRadio && hybridRadio.checked) {
        // 첫 화면 클릭 시 오디오 & 마이크 시도
        const firstTouch = async () => {
            audio.init();
            await mic.startMic();
            window.removeEventListener('click', firstTouch);
            window.removeEventListener('touchstart', firstTouch);
        };
        window.addEventListener('click', firstTouch);
        window.addEventListener('touchstart', firstTouch);
    }
});
