const rounds = [
  { city: 'Reykjavík', country: 'Iceland', correct: 'Iceland', flag: '🇮🇸', coordinates: '64° 08′ N   21° 56′ W', pin: [170, 198], light: 'Low golden sun', road: 'Right', sound: 'Wind across grass', message: 'A bright edge of the world, where the road ends in weather.', options: ['Iceland', 'Norway', 'Finland', 'Scotland'] },
  { city: 'Marrakesh', country: 'Morocco', correct: 'Morocco', flag: '🇲🇦', coordinates: '31° 38′ N   8° 00′ W', pin: [413, 174], light: 'Warm desert haze', road: 'Right', sound: 'Market chatter', message: 'Red walls, bright textiles, and a little heat in the air.', options: ['Morocco', 'Tunisia', 'Spain', 'Jordan'] },
  { city: 'Kyoto', country: 'Japan', correct: 'Japan', flag: '🇯🇵', coordinates: '35° 00′ N   135° 46′ E', pin: [672, 217], light: 'Low golden sun', road: 'Left', sound: 'Distant traffic', message: 'A quiet city, a mountain view, and a very good instinct.', options: ['Japan', 'Portugal', 'Uruguay', 'Kenya'] },
  { city: 'Ushuaia', country: 'Argentina', correct: 'Argentina', flag: '🇦🇷', coordinates: '54° 48′ S   68° 18′ W', pin: [295, 501], light: 'Long blue dusk', road: 'Right', sound: 'Wind off the bay', message: 'The end of the road is only the beginning of the view.', options: ['Argentina', 'Chile', 'New Zealand', 'South Africa'] },
  { city: 'Queenstown', country: 'New Zealand', correct: 'New Zealand', flag: '🇳🇿', coordinates: '45° 02′ S   168° 40′ E', pin: [929, 473], light: 'Clear mountain light', road: 'Left', sound: 'Birdsong and gravel', message: 'A sharp blue lake, a bold mountain, and open road ahead.', options: ['New Zealand', 'Australia', 'Canada', 'Chile'] }
];

const countryFlags = { Australia: '🇦🇺', Argentina: '🇦🇷', Canada: '🇨🇦', Chile: '🇨🇱', Finland: '🇫🇮', Iceland: '🇮🇸', Japan: '🇯🇵', Jordan: '🇯🇴', Kenya: '🇰🇪', Morocco: '🇲🇦', 'New Zealand': '🇳🇿', Norway: '🇳🇴', Portugal: '🇵🇹', Scotland: '🏴', 'South Africa': '🇿🇦', Spain: '🇪🇸', Tunisia: '🇹🇳', Uruguay: '🇺🇾' };
const state = { roundIndex: 0, selected: null, locked: false, score: 2480, streak: 4, timeLeft: 90, hintUsed: false, zoom: 0, mapOffset: { x: 0, y: 0 }, dragStart: null, didDrag: false, timerPaused: false, timerDeadline: null, soundEnabled: true, helpTrigger: null };
const elements = {
  appShell: document.querySelector('.app-shell'), answerGrid: document.querySelector('#answerGrid'), answerCount: document.querySelector('#answerCount'), challengeRound: document.querySelector('#challengeRound'), clueLight: document.querySelector('#clueLight'), clueRoad: document.querySelector('#clueRoad'), clueSound: document.querySelector('#clueSound'), hintButton: document.querySelector('#hintButton'), layersButton: document.querySelector('#layersButton'), locateButton: document.querySelector('#locateButton'), lockButton: document.querySelector('#lockButton'), mapCoordinates: document.querySelector('#mapCoordinates'), mapLocation: document.querySelector('#mapLocation'), mapPin: document.querySelector('#mapPin'), routePath: document.querySelector('#routePath'), routeStartNode: document.querySelector('#routeStartNode'), routeSecondNode: document.querySelector('#routeSecondNode'), routeEndNode: document.querySelector('#routeEndNode'), routeCurrentNode: document.querySelector('#routeCurrentNode'), mapStage: document.querySelector('#mapStage'), mapToast: document.querySelector('#mapToast'), nextButton: document.querySelector('#nextButton'), progressPercent: document.querySelector('#progressPercent'), resultAccuracy: document.querySelector('#resultAccuracy'), resultCard: document.querySelector('#resultCard'), resultEyebrow: document.querySelector('#resultEyebrow'), resultIcon: document.querySelector('#resultIcon'), resultMessage: document.querySelector('#resultMessage'), resultPoints: document.querySelector('#resultPoints'), resultTitle: document.querySelector('#resultTitle'), sceneCaption: document.querySelector('#sceneCaption'), scoreValue: document.querySelector('#scoreValue'), soundButton: document.querySelector('#soundButton'), streakValue: document.querySelector('#streakValue'), tourProgress: document.querySelector('#tourProgress'), roundProgress: document.querySelector('#roundProgress'), timerValue: document.querySelector('#timerValue'), worldMap: document.querySelector('#worldMap'), zoomIn: document.querySelector('#zoomIn'), zoomOut: document.querySelector('#zoomOut'), helpButton: document.querySelector('#helpButton'), helpOverlay: document.querySelector('#helpOverlay'), closeHelp: document.querySelector('#closeHelp'), helpDone: document.querySelector('#helpDone'), learnButton: document.querySelector('#learnButton'), mapYou: document.querySelector('.map-you'), routeItems: [...document.querySelectorAll('.route-item')]
};
const scoreFormatter = new Intl.NumberFormat('en-US');
let timerId;
let toastId;
let audioContext;

function currentRound() { return rounds[state.roundIndex]; }
function formatScore(value) { return scoreFormatter.format(value); }
function formatTime(seconds) { const safe = Math.max(0, seconds); return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}`; }
function setMapToast(message) { window.clearTimeout(toastId); elements.mapToast.textContent = message; elements.mapToast.classList.add('is-visible'); toastId = window.setTimeout(() => elements.mapToast.classList.remove('is-visible'), 2200); }
function playSoundCue(frequency = 440) {
  if (!state.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + .01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + .12);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .13);
  } catch { state.soundEnabled = false; elements.soundButton.classList.add('is-muted'); elements.soundButton.setAttribute('aria-pressed', 'true'); }
}
function buildRoutePath() { return rounds.map((round, index) => `${index === 0 ? 'M' : 'L'}${round.pin[0]} ${round.pin[1]}`).join(' '); }
function renderRoute() {
  elements.routeItems.forEach((item, index) => {
    const current = index === state.roundIndex;
    const revealed = index < state.roundIndex || (current && state.locked);
    item.classList.toggle('done', index < state.roundIndex); item.classList.toggle('current', current);
    if (current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    item.querySelector('.route-place').textContent = revealed ? rounds[index].city : current ? 'Unidentified stop' : 'Hidden stop';
    item.querySelector('.route-state').textContent = index < state.roundIndex ? 'DONE' : current ? 'NOW' : index === state.roundIndex + 1 ? 'NEXT' : 'LOCKED';
  });
}
function updateTimerDisplay() { elements.timerValue.textContent = formatTime(state.timeLeft); elements.timerValue.parentElement.classList.toggle('is-urgent', state.timeLeft <= 30); }
function startTimer() {
  window.clearInterval(timerId);
  if (state.locked || state.timerPaused) return;
  if (document.hidden) { state.timerPaused = true; return; }
  if (state.timerDeadline === null) state.timerDeadline = performance.now() + state.timeLeft * 1000;
  timerId = window.setInterval(() => {
    if (state.locked || state.timerPaused) return;
    const remaining = Math.max(0, state.timerDeadline - performance.now());
    state.timeLeft = Math.ceil(remaining / 1000); updateTimerDisplay();
    if (remaining <= 0) { state.timeLeft = 0; state.timerDeadline = null; window.clearInterval(timerId); setMapToast('Time is up — lock in your best call.'); submitGuess(true); }
  }, 250);
}
function pauseTimer() { if (state.locked || state.timerPaused) return; if (state.timerDeadline !== null) state.timeLeft = Math.max(0, Math.ceil((state.timerDeadline - performance.now()) / 1000)); state.timerPaused = true; window.clearInterval(timerId); }
function resumeTimer() { if (state.locked || !state.timerPaused || document.hidden) return; state.timerDeadline = performance.now() + state.timeLeft * 1000; state.timerPaused = false; startTimer(); }
function renderRound() {
  const round = currentRound(); const number = state.roundIndex + 1; const progress = number / rounds.length * 100;
  state.selected = null; state.locked = false; state.timeLeft = 90; state.hintUsed = false; state.timerPaused = false; state.timerDeadline = performance.now() + 90000;
  window.clearTimeout(toastId); elements.mapToast.classList.remove('is-visible');
  elements.challengeRound.textContent = String(number).padStart(2, '0'); elements.sceneCaption.textContent = `FIELD NOTES ${String(number).padStart(2, '0')}`; elements.roundProgress.textContent = `ROUND ${String(number).padStart(2, '0')} / 05`; elements.progressPercent.textContent = `${Math.round(progress)}%`; elements.tourProgress.style.width = `${progress}%`; elements.tourProgress.parentElement.setAttribute('aria-valuenow', number); elements.tourProgress.parentElement.setAttribute('aria-valuetext', `Round ${number} of 5`);
  elements.mapLocation.textContent = 'Unidentified stop'; elements.mapCoordinates.textContent = 'LOCATION HIDDEN'; elements.mapPin.classList.add('is-hidden'); elements.routeCurrentNode.classList.add('is-hidden'); elements.timerValue.textContent = formatTime(state.timeLeft); elements.timerValue.parentElement.classList.remove('is-urgent'); elements.clueLight.textContent = round.light; elements.clueRoad.textContent = round.road; elements.clueSound.textContent = round.sound;
  elements.hintButton.classList.remove('is-used'); elements.hintButton.disabled = false; elements.answerCount.textContent = '0 / 4'; elements.lockButton.disabled = true; elements.lockButton.querySelector('.lock-label').textContent = 'LOCK IN YOUR GUESS'; elements.resultCard.hidden = true; document.body.classList.remove('result-open', 'modal-open'); elements.appShell.inert = false; elements.mapStage.classList.remove('zoomed-in', 'zoomed-out'); state.zoom = 0; state.mapOffset = { x: 0, y: 0 }; elements.worldMap.style.translate = '0px 0px';
  elements.routePath.setAttribute('d', buildRoutePath()); elements.routeStartNode.setAttribute('cx', rounds[0].pin[0]); elements.routeStartNode.setAttribute('cy', rounds[0].pin[1]); elements.routeSecondNode.setAttribute('cx', rounds[1].pin[0]); elements.routeSecondNode.setAttribute('cy', rounds[1].pin[1]); elements.routeEndNode.setAttribute('cx', rounds[rounds.length - 1].pin[0]); elements.routeEndNode.setAttribute('cy', rounds[rounds.length - 1].pin[1]); elements.mapPin.setAttribute('transform', `translate(${round.pin[0]} ${round.pin[1]})`); elements.routeCurrentNode.setAttribute('cx', round.pin[0]); elements.routeCurrentNode.setAttribute('cy', round.pin[1]); elements.mapYou.setAttribute('transform', 'translate(0 0)');
  elements.answerGrid.innerHTML = round.options.map((country) => `<button class="answer-option" type="button" data-answer="${country}" aria-pressed="false"><span class="answer-flag" aria-hidden="true">${countryFlags[country] || country.slice(0, 2).toUpperCase()}</span><span class="answer-name">${country}</span><span class="answer-check" aria-hidden="true">✓</span></button>`).join('');
  renderRoute(); startTimer();
}
function chooseAnswer(answer) { if (state.locked) return; state.selected = answer; playSoundCue(420); elements.answerCount.textContent = '1 / 4'; elements.lockButton.disabled = false; elements.lockButton.querySelector('.lock-label').textContent = `LOCK IN ${answer.toUpperCase()}`; elements.answerGrid.querySelectorAll('.answer-option').forEach((button) => { const selected = button.dataset.answer === answer; button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', String(selected)); }); }
function revealLocation() { const round = currentRound(); elements.mapLocation.textContent = `${round.city}, ${round.country}`; elements.mapCoordinates.textContent = round.coordinates; elements.mapPin.classList.remove('is-hidden'); elements.routeCurrentNode.classList.remove('is-hidden'); renderRoute(); }
function submitGuess(expired = false) {
  if (state.locked || (!state.selected && !expired)) return;
  const round = currentRound(); const correct = state.selected === round.correct; const elapsed = 90 - state.timeLeft; const points = correct ? 680 + Math.max(0, 460 - elapsed * 5) : 120; playSoundCue(correct ? 660 : 220);
  state.score += points; state.streak = correct ? state.streak + 1 : 0; state.locked = true; state.timerDeadline = null; window.clearInterval(timerId); elements.scoreValue.textContent = formatScore(state.score); elements.streakValue.textContent = String(state.streak).padStart(2, '0'); elements.lockButton.disabled = true; elements.hintButton.disabled = true; elements.lockButton.querySelector('.lock-label').textContent = correct ? 'EXCELLENT CALL' : 'LOCKED IN';
  elements.answerGrid.querySelectorAll('.answer-option').forEach((button) => { const answer = button.dataset.answer; button.classList.remove('is-selected'); button.setAttribute('aria-pressed', 'false'); button.disabled = true; if (answer === round.correct) button.classList.add('is-correct'); if (answer === state.selected && !correct) button.classList.add('is-wrong'); });
  elements.resultIcon.textContent = correct ? '✦' : '↗'; elements.resultEyebrow.textContent = correct ? (state.streak >= 5 ? 'PERFECT RUN' : 'NICE CALL') : 'KEEP EXPLORING'; elements.resultTitle.textContent = correct ? `You found ${round.city}.` : `The answer was ${round.country}.`; elements.resultMessage.textContent = correct ? round.message : `Next time, follow the ${round.road.toLowerCase()}-side road and listen for ${round.sound.toLowerCase()}.`; elements.resultPoints.textContent = `+${formatScore(points)}`; elements.resultAccuracy.textContent = correct ? `${Math.max(76, 98 - Math.floor(elapsed / 4))}%` : '—';
  revealLocation(); elements.resultCard.hidden = false; document.body.classList.add('result-open', 'modal-open'); elements.appShell.inert = true; elements.nextButton.innerHTML = state.roundIndex === rounds.length - 1 ? 'PLAY AGAIN <span>↻</span>' : 'NEXT STOP <span>→</span>'; window.setTimeout(() => elements.nextButton.focus(), 40);
}
function nextRound() { if (state.roundIndex === rounds.length - 1) { state.roundIndex = 0; state.score = 2480; state.streak = 4; elements.scoreValue.textContent = formatScore(state.score); elements.streakValue.textContent = '04'; } else state.roundIndex += 1; renderRound(); window.setTimeout(() => elements.answerGrid.querySelector('.answer-option')?.focus(), 40); }
function setZoom(nextZoom) { state.zoom = Math.max(-1, Math.min(1, nextZoom)); elements.mapStage.classList.toggle('zoomed-in', state.zoom > 0); elements.mapStage.classList.toggle('zoomed-out', state.zoom < 0); setMapToast(`Map zoom ${state.zoom === 0 ? 'reset' : state.zoom > 0 ? 'in' : 'out'}.`); }
function recenterMap() { state.zoom = 0; state.mapOffset = { x: 0, y: 0 }; elements.worldMap.style.translate = '0px 0px'; elements.mapStage.classList.remove('zoomed-in', 'zoomed-out'); elements.mapYou.setAttribute('transform', 'translate(0 0)'); setMapToast('Map view reset to the current stop.'); }
function openHelp() { if (state.locked) return; state.helpTrigger = document.activeElement; pauseTimer(); elements.appShell.inert = true; document.body.classList.add('modal-open'); elements.helpOverlay.hidden = false; elements.helpButton.setAttribute('aria-expanded', 'true'); elements.learnButton.setAttribute('aria-expanded', 'true'); window.setTimeout(() => { if (!elements.helpOverlay.hidden) elements.closeHelp.focus(); }, 30); }
function closeHelp() { elements.helpOverlay.hidden = true; elements.helpButton.setAttribute('aria-expanded', 'false'); elements.learnButton.setAttribute('aria-expanded', 'false'); elements.appShell.inert = false; document.body.classList.remove('modal-open'); if (state.timerPaused && !state.locked) resumeTimer(); const trigger = state.helpTrigger && state.helpTrigger !== document.body ? state.helpTrigger : elements.helpButton; state.helpTrigger = null; trigger.focus(); }
function useHint() { if (state.hintUsed || state.locked) return; state.hintUsed = true; elements.hintButton.disabled = true; elements.hintButton.classList.add('is-used'); setMapToast(`Hint: the road keeps to the ${currentRound().road.toLowerCase()}.`); }
function getMapCoordinates(event) { const matrix = elements.worldMap.getScreenCTM?.(); if (matrix && typeof elements.worldMap.createSVGPoint === 'function') { const point = elements.worldMap.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; const local = point.matrixTransform(matrix.inverse()); return [local.x, local.y]; } const bounds = elements.mapStage.getBoundingClientRect(); return [((event.clientX - bounds.left) / bounds.width) * 1000, ((event.clientY - bounds.top) / bounds.height) * 610]; }
function initMapDrag() {
  elements.mapStage.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) return; event.preventDefault(); elements.mapStage.focus({ preventScroll: true }); state.didDrag = false; state.dragStart = { x: event.clientX, y: event.clientY, originX: state.mapOffset.x, originY: state.mapOffset.y }; elements.mapStage.setPointerCapture(event.pointerId); });
  elements.mapStage.addEventListener('pointermove', (event) => { if (!state.dragStart) return; event.preventDefault(); const dx = event.clientX - state.dragStart.x; const dy = event.clientY - state.dragStart.y; if (Math.abs(dx) + Math.abs(dy) > 3) { state.didDrag = true; state.mapOffset = { x: Math.max(-90, Math.min(90, state.dragStart.originX + dx)), y: Math.max(-60, Math.min(60, state.dragStart.originY + dy)) }; elements.worldMap.style.translate = `${state.mapOffset.x}px ${state.mapOffset.y}px`; } });
  const endDrag = () => { if (state.dragStart && state.didDrag) setMapToast('Map moved — your route is still yours.'); state.dragStart = null; };
  elements.mapStage.addEventListener('pointerup', endDrag); elements.mapStage.addEventListener('pointercancel', endDrag);
  elements.mapStage.addEventListener('click', (event) => { if (event.target.closest('button') || state.didDrag) { state.didDrag = false; return; } const [x, y] = getMapCoordinates(event); elements.mapYou.setAttribute('transform', `translate(${Math.round((x - 500) / 10) * 10} ${Math.round((y - 305) / 10) * 10})`); setMapToast('Waypoint dropped — choose a country to lock it in.'); });
  elements.mapStage.addEventListener('keydown', (event) => { const step = event.shiftKey ? 24 : 12; const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }; if (moves[event.key]) { event.preventDefault(); state.mapOffset = { x: Math.max(-90, Math.min(90, state.mapOffset.x + moves[event.key][0])), y: Math.max(-60, Math.min(60, state.mapOffset.y + moves[event.key][1])) }; elements.worldMap.style.translate = `${state.mapOffset.x}px ${state.mapOffset.y}px`; setMapToast(`Map moved ${Math.round(state.mapOffset.x)}, ${Math.round(state.mapOffset.y)} pixels.`); } else if (event.key === 'Enter') { event.preventDefault(); elements.mapYou.setAttribute('transform', 'translate(0 0)'); setMapToast('Waypoint dropped at the center of the map.'); } else if (event.key.toLowerCase() === 'r') { event.preventDefault(); recenterMap(); } });
}
function initKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.helpOverlay.hidden) { closeHelp(); return; }
    const dialog = !elements.helpOverlay.hidden ? elements.helpOverlay : !elements.resultCard.hidden ? elements.resultCard : null;
    if (event.key === 'Tab' && dialog) { const focusable = [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled); const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } return; }
    if (event.key === 'Enter' && !state.locked && state.selected && document.activeElement === document.body) { event.preventDefault(); submitGuess(); }
    if (event.key.toLowerCase() === 'r' && document.activeElement === document.body) recenterMap();
  });
}
function handleVisibilityChange() { if (document.hidden && !state.locked) pauseTimer(); else if (!document.hidden && state.timerPaused && !state.locked && elements.helpOverlay.hidden) resumeTimer(); }

document.addEventListener('visibilitychange', handleVisibilityChange);
elements.answerGrid.addEventListener('click', (event) => { const option = event.target.closest('.answer-option'); if (option) chooseAnswer(option.dataset.answer); });
elements.lockButton.addEventListener('click', () => submitGuess()); elements.nextButton.addEventListener('click', nextRound); elements.hintButton.addEventListener('click', useHint); elements.layersButton.addEventListener('click', () => { const active = elements.mapStage.classList.toggle('satellite-mode'); elements.layersButton.classList.toggle('is-active', active); elements.layersButton.setAttribute('aria-pressed', String(active)); setMapToast(active ? 'Satellite layer enabled.' : 'Explorer layer enabled.'); }); elements.locateButton.addEventListener('click', recenterMap); elements.zoomIn.addEventListener('click', () => setZoom(state.zoom + 1)); elements.zoomOut.addEventListener('click', () => setZoom(state.zoom - 1));
elements.soundButton.addEventListener('click', () => { const muted = elements.soundButton.classList.toggle('is-muted'); state.soundEnabled = !muted; elements.soundButton.setAttribute('aria-pressed', String(muted)); elements.soundButton.setAttribute('aria-label', muted ? 'Enable sound cues' : 'Mute sound cues'); if (!muted) playSoundCue(620); setMapToast(muted ? 'Sound cues off.' : 'Sound cues on.'); });
elements.helpButton.addEventListener('click', openHelp); elements.learnButton.addEventListener('click', openHelp); elements.closeHelp.addEventListener('click', closeHelp); elements.helpDone.addEventListener('click', closeHelp); elements.helpOverlay.addEventListener('click', (event) => { if (event.target === elements.helpOverlay) closeHelp(); });
initMapDrag(); initKeyboard(); renderRound();
