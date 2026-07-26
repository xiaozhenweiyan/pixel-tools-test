(function () {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const KEYBOARD_MAP = {
    'a': { note: 'C', octaveOffset: 0, isBlack: false },
    'w': { note: 'C#', octaveOffset: 0, isBlack: true },
    's': { note: 'D', octaveOffset: 0, isBlack: false },
    'e': { note: 'D#', octaveOffset: 0, isBlack: true },
    'd': { note: 'E', octaveOffset: 0, isBlack: false },
    'f': { note: 'F', octaveOffset: 0, isBlack: false },
    't': { note: 'F#', octaveOffset: 0, isBlack: true },
    'g': { note: 'G', octaveOffset: 0, isBlack: false },
    'y': { note: 'G#', octaveOffset: 0, isBlack: true },
    'h': { note: 'A', octaveOffset: 0, isBlack: false },
    'u': { note: 'A#', octaveOffset: 0, isBlack: true },
    'j': { note: 'B', octaveOffset: 0, isBlack: false },
    'k': { note: 'C', octaveOffset: 1, isBlack: false },
    'o': { note: 'C#', octaveOffset: 1, isBlack: true },
    'l': { note: 'D', octaveOffset: 1, isBlack: false },
    'p': { note: 'D#', octaveOffset: 1, isBlack: true },
    ';': { note: 'E', octaveOffset: 1, isBlack: false },
    "'": { note: 'F', octaveOffset: 1, isBlack: false }
  };

  const state = {
    audioContext: null,
    masterGain: null,
    analyser: null,
    currentTimbre: 'square',
    volume: 0.7,
    baseOctave: 4,
    activeNotes: new Map(),
    oscillatorCanvas: null,
    oscillatorCtx: null,
    animationId: null,
    noiseBuffer: null,

    sequencer: {
      isPlaying: false,
      bpm: 120,
      currentStep: -1,
      numSteps: 16,
      numTracks: 4,
      tracks: [],
      steps: [],
      schedulerId: null,
      nextNoteTime: 0,
      scheduledNotes: [],
      lookahead: 25.0,
      scheduleAheadTime: 0.1
    }
  };

  function noteToFrequency(note, octave) {
    const noteIndex = NOTE_NAMES.indexOf(note);
    if (noteIndex < 0) return 440;
    const semitonesFromA4 = noteIndex - NOTE_NAMES.indexOf('A') + (octave - 4) * 12;
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  function initAudio() {
    if (state.audioContext) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    state.audioContext = new AudioContext();

    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = state.volume;

    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;

    state.masterGain.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);

    createNoiseBuffer();
  }

  function createNoiseBuffer() {
    if (!state.audioContext) return;
    const bufferSize = state.audioContext.sampleRate * 2;
    state.noiseBuffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
    const output = state.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  function playNote(note, octave) {
    if (!state.audioContext) return;

    const noteKey = note + octave;
    if (state.activeNotes.has(noteKey)) return;

    const frequency = noteToFrequency(note, octave);
    const now = state.audioContext.currentTime;

    const gainNode = state.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    let sourceNode;

    if (state.currentTimbre === 'noise') {
      sourceNode = state.audioContext.createBufferSource();
      sourceNode.buffer = state.noiseBuffer;
      sourceNode.loop = true;

      const filter = state.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = 1;

      sourceNode.connect(filter);
      filter.connect(gainNode);
    } else {
      sourceNode = state.audioContext.createOscillator();
      sourceNode.type = state.currentTimbre;
      sourceNode.frequency.value = frequency;
      sourceNode.connect(gainNode);
    }

    gainNode.connect(state.masterGain);

    const attackTime = 0.01;
    const decayTime = 0.1;
    const sustainLevel = 0.7;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

    sourceNode.start(now);

    state.activeNotes.set(noteKey, {
      source: sourceNode,
      gain: gainNode,
      note: note,
      octave: octave
    });

    highlightKey(note, octave, true);
  }

  function stopNote(note, octave) {
    if (!state.audioContext) return;

    const noteKey = note + octave;
    const activeNote = state.activeNotes.get(noteKey);
    if (!activeNote) return;

    const now = state.audioContext.currentTime;
    const releaseTime = 0.2;

    activeNote.gain.gain.cancelScheduledValues(now);
    activeNote.gain.gain.setValueAtTime(activeNote.gain.gain.value, now);
    activeNote.gain.gain.linearRampToValueAtTime(0, now + releaseTime);

    activeNote.source.stop(now + releaseTime + 0.05);

    setTimeout(function () {
      if (state.activeNotes.has(noteKey)) {
        state.activeNotes.delete(noteKey);
      }
    }, (releaseTime + 0.1) * 1000);

    highlightKey(note, octave, false);
  }

  function stopAllNotes() {
    const keys = Array.from(state.activeNotes.keys());
    for (let i = 0; i < keys.length; i++) {
      const activeNote = state.activeNotes.get(keys[i]);
      if (activeNote) {
        stopNote(activeNote.note, activeNote.octave);
      }
    }
  }

  function setVolume(value) {
    state.volume = value;
    if (state.masterGain) {
      state.masterGain.gain.value = value;
    }
  }

  function setTimbre(timbre) {
    state.currentTimbre = timbre;
  }

  function setOctave(octave) {
    state.baseOctave = octave;
  }

  function highlightKey(note, octave, isPressed) {
    const keyEl = document.querySelector('[data-note="' + note + '"][data-octave="' + octave + '"]');
    if (keyEl) {
      if (isPressed) {
        keyEl.classList.add('pressed');
      } else {
        keyEl.classList.remove('pressed');
      }
    }
  }

  function buildKeyboard() {
    const keyboardEl = document.getElementById('pixel-music-keyboard');
    if (!keyboardEl) return;

    keyboardEl.innerHTML = '';

    const whiteKeyNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeyMap = {
      'C': 'C#',
      'D': 'D#',
      'F': 'F#',
      'G': 'G#',
      'A': 'A#'
    };

    const keyLabels = getKeyLabels();

    for (let octaveOffset = 0; octaveOffset < 2; octaveOffset++) {
      const octave = state.baseOctave + octaveOffset;

      for (let i = 0; i < whiteKeyNotes.length; i++) {
        const note = whiteKeyNotes[i];
        const keyLabel = keyLabels.white[octaveOffset] && keyLabels.white[octaveOffset][i]
          ? keyLabels.white[octaveOffset][i]
          : '';

        const keyEl = document.createElement('div');
        keyEl.className = 'piano-key piano-white-key';
        keyEl.dataset.note = note;
        keyEl.dataset.octave = String(octave);
        keyEl.innerHTML = '<span class="piano-key-label">' + keyLabel + '</span><span class="piano-key-note">' + note + octave + '</span>';

        keyEl.addEventListener('mousedown', function (e) {
          e.preventDefault();
          initAudio();
          resumeAudio();
          playNote(note, octave);
        });

        keyEl.addEventListener('mouseup', function () {
          stopNote(note, octave);
        });

        keyEl.addEventListener('mouseleave', function () {
          stopNote(note, octave);
        });

        keyEl.addEventListener('touchstart', function (e) {
          e.preventDefault();
          e.stopPropagation();
          initAudio();
          resumeAudio();
          playNote(note, octave);
        }, { passive: false });

        keyEl.addEventListener('touchend', function (e) {
          e.preventDefault();
          e.stopPropagation();
          stopNote(note, octave);
        }, { passive: false });

        keyEl.addEventListener('touchcancel', function () {
          stopNote(note, octave);
        });

        keyboardEl.appendChild(keyEl);

        if (blackKeyMap[note]) {
          const blackNote = blackKeyMap[note];
          const blackLabel = keyLabels.black[octaveOffset] && keyLabels.black[octaveOffset][blackNote]
            ? keyLabels.black[octaveOffset][blackNote]
            : '';

          const blackKeyEl = document.createElement('div');
          blackKeyEl.className = 'piano-key piano-black-key';
          blackKeyEl.dataset.note = blackNote;
          blackKeyEl.dataset.octave = String(octave);
          blackKeyEl.innerHTML = '<span class="piano-key-label">' + blackLabel + '</span>';

          blackKeyEl.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            initAudio();
            resumeAudio();
            playNote(blackNote, octave);
          });

          blackKeyEl.addEventListener('mouseup', function () {
            stopNote(blackNote, octave);
          });

          blackKeyEl.addEventListener('mouseleave', function () {
            stopNote(blackNote, octave);
          });

          blackKeyEl.addEventListener('touchstart', function (e) {
            e.preventDefault();
            e.stopPropagation();
            initAudio();
            resumeAudio();
            playNote(blackNote, octave);
          }, { passive: false });

          blackKeyEl.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            stopNote(blackNote, octave);
          }, { passive: false });

          blackKeyEl.addEventListener('touchcancel', function () {
            stopNote(blackNote, octave);
          });

          keyboardEl.appendChild(blackKeyEl);
        }
      }
    }
  }

  function getKeyLabels() {
    const whiteKeysOct0 = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
    const whiteKeysOct1 = ['K', 'L', ';', "'"];
    const blackKeysOct0 = {
      'C#': 'W',
      'D#': 'E',
      'F#': 'T',
      'G#': 'Y',
      'A#': 'U'
    };
    const blackKeysOct1 = {
      'C#': 'O',
      'D#': 'P'
    };

    return {
      white: [whiteKeysOct0, whiteKeysOct1],
      black: [blackKeysOct0, blackKeysOct1]
    };
  }

  function handleKeyDown(e) {
    if (e.repeat) return;

    const key = e.key.toLowerCase();
    const mapping = KEYBOARD_MAP[key];
    if (!mapping) return;

    e.preventDefault();
    initAudio();
    resumeAudio();

    const octave = state.baseOctave + mapping.octaveOffset;
    playNote(mapping.note, octave);
  }

  function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const mapping = KEYBOARD_MAP[key];
    if (!mapping) return;

    e.preventDefault();

    const octave = state.baseOctave + mapping.octaveOffset;
    stopNote(mapping.note, octave);
  }

  function resumeAudio() {
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  }

  function initOscilloscope() {
    const canvas = document.getElementById('pixel-music-oscilloscope');
    if (!canvas) return;

    state.oscillatorCanvas = canvas;
    state.oscillatorCtx = canvas.getContext('2d');

    resizeOscilloscope();
    startOscilloscopeAnimation();
  }

  function resizeOscilloscope() {
    if (!state.oscillatorCanvas) return;
    const wrap = state.oscillatorCanvas.parentElement;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    state.oscillatorCanvas.width = rect.width;
    state.oscillatorCanvas.height = 200;
  }

  function startOscilloscopeAnimation() {
    function draw() {
      state.animationId = requestAnimationFrame(draw);

      if (!state.oscillatorCtx || !state.analyser) {
        drawIdleWave();
        return;
      }

      const canvas = state.oscillatorCanvas;
      const ctx = state.oscillatorCtx;
      const bufferLength = state.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      state.analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    draw();
  }

  function drawIdleWave() {
    if (!state.oscillatorCtx || !state.oscillatorCanvas) return;

    const canvas = state.oscillatorCanvas;
    const ctx = state.oscillatorCtx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  function stopOscilloscopeAnimation() {
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
  }

  /* ============================================================
     Sequencer 音序器
     ============================================================ */

  function playSequencerNote(timbre, note, octave, volume, startTime, duration) {
    if (!state.audioContext) return;

    const frequency = noteToFrequency(note, octave);

    const gainNode = state.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, startTime);

    let sourceNode;

    if (timbre === 'noise') {
      sourceNode = state.audioContext.createBufferSource();
      sourceNode.buffer = state.noiseBuffer;
      sourceNode.loop = true;

      const filter = state.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = 1;

      sourceNode.connect(filter);
      filter.connect(gainNode);
    } else {
      sourceNode = state.audioContext.createOscillator();
      sourceNode.type = timbre;
      sourceNode.frequency.value = frequency;
      sourceNode.connect(gainNode);
    }

    gainNode.connect(state.masterGain);

    const attackTime = 0.01;
    const decayTime = 0.05;
    const sustainLevel = 0.6;
    const releaseTime = 0.1;
    const noteDuration = duration - attackTime - decayTime;
    const actualSustainTime = Math.max(0, noteDuration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(volume * sustainLevel, startTime + attackTime + decayTime);
    gainNode.gain.setValueAtTime(volume * sustainLevel, startTime + attackTime + decayTime + actualSustainTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    sourceNode.start(startTime);
    sourceNode.stop(startTime + duration + releaseTime + 0.05);
  }

  function parseNotePitch(pitchStr) {
    const match = pitchStr.match(/^([A-G]#?)(\d)$/);
    if (!match) return { note: 'C', octave: 4 };
    return { note: match[1], octave: parseInt(match[2], 10) };
  }

  function initSequencerState() {
    const seq = state.sequencer;
    seq.tracks = [];
    seq.steps = [];

    const timbres = ['square', 'triangle', 'sawtooth', 'noise'];
    const pitches = ['C4', 'E4', 'G4', 'C5'];
    const volumes = [0.6, 0.5, 0.5, 0.4];

    for (let t = 0; t < seq.numTracks; t++) {
      seq.tracks.push({
        timbre: timbres[t],
        pitch: pitches[t],
        volume: volumes[t]
      });
    }

    for (let s = 0; s < seq.numSteps; s++) {
      seq.steps.push(new Array(seq.numTracks).fill(false));
    }
  }

  function buildSequencerUI() {
    const seq = state.sequencer;
    const tracksContainer = document.querySelector('.sequencer-tracks-controls');
    const stepLabelsContainer = document.getElementById('sequencer-step-labels');
    const gridContainer = document.getElementById('sequencer-grid');

    if (!tracksContainer || !stepLabelsContainer || !gridContainer) return;

    const headerEl = tracksContainer.querySelector('.sequencer-track-header');
    tracksContainer.innerHTML = '';
    if (headerEl) tracksContainer.appendChild(headerEl);

    for (let t = 0; t < seq.numTracks; t++) {
      const trackEl = document.createElement('div');
      trackEl.className = 'sequencer-track-control';
      trackEl.dataset.track = String(t);

      const topEl = document.createElement('div');
      topEl.className = 'sequencer-track-top';

      const numberEl = document.createElement('div');
      numberEl.className = 'sequencer-track-number';
      numberEl.textContent = String(t + 1);

      const timbreEl = document.createElement('div');
      timbreEl.className = 'sequencer-track-timbre';

      const timbreOptions = [
        { key: 'square', label: 'SQ' },
        { key: 'triangle', label: 'TR' },
        { key: 'sawtooth', label: 'SA' },
        { key: 'noise', label: 'NO' }
      ];

      for (let i = 0; i < timbreOptions.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'sequencer-track-timbre-btn';
        btn.dataset.timbre = timbreOptions[i].key;
        btn.dataset.track = String(t);
        btn.textContent = timbreOptions[i].label;
        if (timbreOptions[i].key === seq.tracks[t].timbre) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', function () {
          setTrackTimbre(t, timbreOptions[i].key);
        });
        timbreEl.appendChild(btn);
      }

      topEl.appendChild(numberEl);
      topEl.appendChild(timbreEl);

      const bottomEl = document.createElement('div');
      bottomEl.className = 'sequencer-track-bottom';

      const pitchSelect = document.createElement('select');
      pitchSelect.className = 'sequencer-track-pitch-select';
      pitchSelect.dataset.track = String(t);

      const pitchOptions = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
      for (let i = 0; i < pitchOptions.length; i++) {
        const option = document.createElement('option');
        option.value = pitchOptions[i];
        const i18nKey = 'sequencer_note_' + pitchOptions[i].toLowerCase();
        if (window.i18n) {
          option.textContent = window.i18n.t(i18nKey);
        } else {
          option.textContent = pitchOptions[i];
        }
        if (pitchOptions[i] === seq.tracks[t].pitch) {
          option.selected = true;
        }
        pitchSelect.appendChild(option);
      }

      pitchSelect.addEventListener('change', function () {
        setTrackPitch(t, this.value);
      });

      const volumeSlider = document.createElement('input');
      volumeSlider.type = 'range';
      volumeSlider.className = 'sequencer-track-volume';
      volumeSlider.min = '0';
      volumeSlider.max = '100';
      volumeSlider.step = '1';
      volumeSlider.value = String(Math.round(seq.tracks[t].volume * 100));
      volumeSlider.dataset.track = String(t);

      volumeSlider.addEventListener('input', function () {
        setTrackVolume(t, parseInt(this.value, 10) / 100);
      });

      bottomEl.appendChild(pitchSelect);
      bottomEl.appendChild(volumeSlider);

      trackEl.appendChild(topEl);
      trackEl.appendChild(bottomEl);
      tracksContainer.appendChild(trackEl);
    }

    stepLabelsContainer.innerHTML = '';
    for (let s = 0; s < seq.numSteps; s++) {
      const labelEl = document.createElement('div');
      labelEl.className = 'sequencer-step-label';
      if (s % 4 === 0) {
        labelEl.classList.add('beat');
      }
      labelEl.textContent = String(s + 1);
      stepLabelsContainer.appendChild(labelEl);
    }

    gridContainer.innerHTML = '';
    for (let s = 0; s < seq.numSteps; s++) {
      for (let t = 0; t < seq.numTracks; t++) {
        const cell = document.createElement('div');
        cell.className = 'sequencer-cell';
        cell.dataset.step = String(s);
        cell.dataset.track = String(t);

        if (s % 4 === 0) {
          cell.classList.add('beat-col');
        }

        cell.addEventListener('click', function () {
          toggleStep(t, s);
        });

        gridContainer.appendChild(cell);
      }
    }
  }

  function updateCellVisual(trackIndex, stepIndex) {
    const seq = state.sequencer;
    const cell = document.querySelector('.sequencer-cell[data-step="' + stepIndex + '"][data-track="' + trackIndex + '"]');
    if (!cell) return;

    const isActive = seq.steps[stepIndex][trackIndex];
    const timbre = seq.tracks[trackIndex].timbre;

    cell.classList.remove('active', 'timbre-square', 'timbre-triangle', 'timbre-sawtooth', 'timbre-noise');

    if (isActive) {
      cell.classList.add('active', 'timbre-' + timbre);
    }
  }

  function updateAllCellVisuals() {
    const seq = state.sequencer;
    for (let s = 0; s < seq.numSteps; s++) {
      for (let t = 0; t < seq.numTracks; t++) {
        updateCellVisual(t, s);
      }
    }
  }

  function toggleStep(trackIndex, stepIndex) {
    const seq = state.sequencer;
    seq.steps[stepIndex][trackIndex] = !seq.steps[stepIndex][trackIndex];
    updateCellVisual(trackIndex, stepIndex);
  }

  function setTrackTimbre(trackIndex, timbre) {
    const seq = state.sequencer;
    seq.tracks[trackIndex].timbre = timbre;

    const btns = document.querySelectorAll('.sequencer-track-timbre-btn[data-track="' + trackIndex + '"]');
    for (let i = 0; i < btns.length; i++) {
      btns[i].classList.remove('active');
      if (btns[i].dataset.timbre === timbre) {
        btns[i].classList.add('active');
      }
    }

    for (let s = 0; s < seq.numSteps; s++) {
      if (seq.steps[s][trackIndex]) {
        updateCellVisual(trackIndex, s);
      }
    }
  }

  function setTrackPitch(trackIndex, pitch) {
    state.sequencer.tracks[trackIndex].pitch = pitch;
  }

  function setTrackVolume(trackIndex, volume) {
    state.sequencer.tracks[trackIndex].volume = volume;
  }

  function setSequencerBPM(bpm) {
    state.sequencer.bpm = bpm;
  }

  function nextStep() {
    const seq = state.sequencer;
    const secondsPerBeat = 60.0 / seq.bpm;
    const secondsPerStep = secondsPerBeat / 4.0;
    seq.nextNoteTime += secondsPerStep;
    seq.currentStep = (seq.currentStep + 1) % seq.numSteps;
  }

  function scheduleNote(stepIndex, time) {
    const seq = state.sequencer;
    const secondsPerBeat = 60.0 / seq.bpm;
    const noteDuration = secondsPerBeat / 4.0 * 0.9;

    for (let t = 0; t < seq.numTracks; t++) {
      if (seq.steps[stepIndex][t]) {
        const track = seq.tracks[t];
        const pitch = parseNotePitch(track.pitch);
        playSequencerNote(track.timbre, pitch.note, pitch.octave, track.volume, time, noteDuration);
      }
    }

    seq.scheduledNotes.push({ step: stepIndex, time: time });
  }

  function scheduler() {
    const seq = state.sequencer;
    if (!seq.isPlaying) return;

    while (seq.nextNoteTime < state.audioContext.currentTime + seq.scheduleAheadTime) {
      const stepToSchedule = (seq.currentStep + 1) % seq.numSteps;
      scheduleNote(stepToSchedule, seq.nextNoteTime);
      nextStep();
    }

    seq.schedulerId = setTimeout(scheduler, seq.lookahead);
  }

  function updateCurrentStepDisplay() {
    const seq = state.sequencer;
    if (!state.audioContext || !seq.isPlaying) return;

    const now = state.audioContext.currentTime;

    while (seq.scheduledNotes.length > 0 && seq.scheduledNotes[0].time <= now) {
      const note = seq.scheduledNotes.shift();
      highlightStep(note.step);
    }

    requestAnimationFrame(updateCurrentStepDisplay);
  }

  function highlightStep(stepIndex) {
    const cells = document.querySelectorAll('.sequencer-cell');
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove('current-step');
    }

    const stepCells = document.querySelectorAll('.sequencer-cell[data-step="' + stepIndex + '"]');
    for (let i = 0; i < stepCells.length; i++) {
      stepCells[i].classList.add('current-step');
    }

    const currentStepEl = document.getElementById('sequencer-current-step');
    if (currentStepEl) {
      currentStepEl.textContent = String(stepIndex + 1);
    }
  }

  function clearStepHighlight() {
    const cells = document.querySelectorAll('.sequencer-cell');
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove('current-step');
    }

    const currentStepEl = document.getElementById('sequencer-current-step');
    if (currentStepEl) {
      currentStepEl.textContent = '-';
    }
  }

  function playSequencer() {
    const seq = state.sequencer;
    if (seq.isPlaying) return;

    initAudio();
    resumeAudio();

    if (!state.audioContext) return;

    seq.isPlaying = true;
    seq.currentStep = -1;
    seq.scheduledNotes = [];
    seq.nextNoteTime = state.audioContext.currentTime + 0.05;

    const playBtn = document.getElementById('sequencer-play-btn');
    if (playBtn) {
      playBtn.classList.add('playing');
      if (window.i18n) {
        playBtn.textContent = window.i18n.t('sequencer_play');
      }
    }

    scheduler();
    requestAnimationFrame(updateCurrentStepDisplay);
  }

  function stopSequencer() {
    const seq = state.sequencer;
    if (!seq.isPlaying) return;

    seq.isPlaying = false;

    if (seq.schedulerId) {
      clearTimeout(seq.schedulerId);
      seq.schedulerId = null;
    }

    seq.scheduledNotes = [];
    seq.currentStep = -1;

    const playBtn = document.getElementById('sequencer-play-btn');
    if (playBtn) {
      playBtn.classList.remove('playing');
      if (window.i18n) {
        playBtn.textContent = window.i18n.t('sequencer_play');
      }
    }

    clearStepHighlight();
  }

  function initSequencerControls() {
    const playBtn = document.getElementById('sequencer-play-btn');
    const stopBtn = document.getElementById('sequencer-stop-btn');
    const bpmSlider = document.getElementById('sequencer-bpm');
    const bpmValue = document.getElementById('sequencer-bpm-value');

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (state.sequencer.isPlaying) {
          stopSequencer();
        } else {
          playSequencer();
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        stopSequencer();
      });
    }

    if (bpmSlider && bpmValue) {
      bpmSlider.addEventListener('input', function () {
        const val = parseInt(this.value, 10);
        bpmValue.textContent = String(val);
        setSequencerBPM(val);
      });
    }
  }

  function initSequencer() {
    initSequencerState();
    buildSequencerUI();
    updateAllCellVisuals();
    initSequencerControls();
  }

  function cleanupSequencer() {
    stopSequencer();
  }

  /* ============================================================
     End of Sequencer
     ============================================================ */

  function cleanup() {
    stopAllNotes();
    stopOscilloscopeAnimation();
    cleanupSequencer();
    if (state.audioContext) {
      state.audioContext.close();
      state.audioContext = null;
      state.masterGain = null;
      state.analyser = null;
      state.noiseBuffer = null;
    }
    state.activeNotes.clear();
  }

  function initControls() {
    const timbreBtns = document.querySelectorAll('.pixel-music-timbre-btn');
    for (let i = 0; i < timbreBtns.length; i++) {
      timbreBtns[i].addEventListener('click', function () {
        const timbre = this.getAttribute('data-timbre');
        if (!timbre) return;

        for (let j = 0; j < timbreBtns.length; j++) {
          timbreBtns[j].classList.remove('active');
        }
        this.classList.add('active');

        setTimbre(timbre);
      });
    }

    const volumeSlider = document.getElementById('pixel-music-volume');
    const volumeValue = document.getElementById('pixel-music-volume-value');
    if (volumeSlider && volumeValue) {
      volumeSlider.addEventListener('input', function () {
        const val = parseInt(this.value, 10);
        volumeValue.textContent = String(val);
        setVolume(val / 100);
      });
    }

    const octaveDownBtn = document.getElementById('octave-down');
    const octaveUpBtn = document.getElementById('octave-up');
    const octaveValue = document.getElementById('octave-value');

    function updateOctaveDisplay() {
      if (octaveValue) {
        octaveValue.textContent = String(state.baseOctave - 4 >= 0 ? '+' : '') + (state.baseOctave - 4);
      }
    }

    if (octaveDownBtn) {
      octaveDownBtn.addEventListener('click', function () {
        if (state.baseOctave > 2) {
          setOctave(state.baseOctave - 1);
          updateOctaveDisplay();
          buildKeyboard();
        }
      });
    }

    if (octaveUpBtn) {
      octaveUpBtn.addEventListener('click', function () {
        if (state.baseOctave < 6) {
          setOctave(state.baseOctave + 1);
          updateOctaveDisplay();
          buildKeyboard();
        }
      });
    }

    updateOctaveDisplay();
  }

  function init() {
    buildKeyboard();
    initControls();
    initOscilloscope();
    initSequencer();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    window.addEventListener('resize', function () {
      resizeOscilloscope();
    });

    // 语言切换时重建音序器 UI（更新音高选项等动态文字）
    document.addEventListener('languagechange', function () {
      if (!state.sequencer.isPlaying) {
        buildSequencerUI();
      }
    });
  }

  window.PixelMusic = {
    init: init,
    cleanup: cleanup,
    playNote: playNote,
    stopNote: stopNote,
    stopAllNotes: stopAllNotes,
    setVolume: setVolume,
    setTimbre: setTimbre,
    setOctave: setOctave,
    playSequencer: playSequencer,
    stopSequencer: stopSequencer
  };
})();
