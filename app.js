const STORAGE_KEY = 'ironlevel_data';

const DEFAULT_DATA = {
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  rank: 'Iniciante',
  exercises: [],
  workouts: [],
  settings: {
    theme: 'system',
    units: 'metric'
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastWorkoutDate: null
};

const RANKS = [
  { minLevel: 1, maxLevel: 4, name: 'Iniciante' },
  { minLevel: 5, maxLevel: 9, name: 'Constante' },
  { minLevel: 10, maxLevel: 14, name: 'Focado' },
  { minLevel: 15, maxLevel: 19, name: 'Casca Grossa' },
  { minLevel: 20, maxLevel: 24, name: 'Lenda' },
  { minLevel: 25, maxLevel: 29, name: 'Mestre' },
  { minLevel: 30, maxLevel: 34, name: 'Grão-Mestre' },
  { minLevel: 35, maxLevel: 39, name: 'Imortal' },
  { minLevel: 40, maxLevel: 44, name: 'Divindade' },
  { minLevel: 45, maxLevel: 49, name: 'Titã' },
  { minLevel: 50, maxLevel: Infinity, name: 'Olympus' }
];

let appData = null;

function getRankForLevel(level) {
  const rank = RANKS.find(r => level >= r.minLevel && level <= r.maxLevel);
  return rank ? rank.name : 'Iniciante';
}

function calculateXpForLevel(level) {
  return level * 100;
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      appData = { ...DEFAULT_DATA, ...parsed };
      appData.rank = getRankForLevel(appData.level);
      appData.xpToNextLevel = calculateXpForLevel(appData.level);

      // Verifica inatividade (destreino) ao carregar
      checkInactivityPenalty();
    } else {
      appData = { ...DEFAULT_DATA };
      saveData();
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    appData = { ...DEFAULT_DATA };
    saveData();
  }
  return appData;
}

function saveData() {
  try {
    appData.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

function updateUI() {
  const levelDisplay = document.getElementById('levelDisplay');
  const rankDisplay = document.getElementById('rankDisplay');
  const xpCurrent = document.getElementById('xpCurrent');
  const xpTarget = document.getElementById('xpTarget');
  const xpBarFill = document.getElementById('xpBarFill');

  if (levelDisplay) levelDisplay.textContent = appData.level;
  if (rankDisplay) rankDisplay.textContent = appData.rank;
  if (xpCurrent) xpCurrent.textContent = appData.xp;
  if (xpTarget) xpTarget.textContent = appData.xpToNextLevel;

  const progressPercent = Math.min(100, (appData.xp / appData.xpToNextLevel) * 100);
  if (xpBarFill) {
    xpBarFill.style.width = `${progressPercent}%`;
    xpBarFill.parentElement.setAttribute('aria-valuenow', Math.round(progressPercent));
  }

  renderHomeSummary();
  renderRecentActivity();
  renderTrainExercises();
  renderManageExercises();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatWeight(weight) {
  return Number(weight).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getDaysSinceStart() {
  if (!appData.createdAt) return 0;
  const diff = Date.now() - appData.createdAt;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getTotalVolume() {
  if (!appData.workouts || appData.workouts.length === 0) return 0;
  return appData.workouts.reduce((sum, w) => sum + (w.weight * w.reps), 0);
}

function checkInactivityPenalty() {
  if (!appData.lastWorkoutDate) return; // Primeiro uso, sem penalidade

  const now = Date.now();
  const daysSinceLastWorkout = Math.floor((now - appData.lastWorkoutDate) / (1000 * 60 * 60 * 24));

  if (daysSinceLastWorkout > 14) {
    const weeksInactive = Math.floor(daysSinceLastWorkout / 7);
    const xpPenalty = weeksInactive * 30; // -30 XP por semana de inatividade

    // Aplica a penalidade (não deixa XP ir abaixo de 0)
    const oldLevel = appData.level;
    const oldXp = appData.xp;

    appData.xp = Math.max(0, appData.xp - xpPenalty);

    // Se XP zerou, pode perder níveis
    while (appData.xp < 0 && appData.level > 1) {
      appData.level -= 1;
      appData.xpToNextLevel = calculateXpForLevel(appData.level);
      appData.xp += appData.xpToNextLevel; // Adiciona o XP do nível anterior
    }

    // Garante que não fique negativo
    if (appData.xp < 0) appData.xp = 0;

    appData.rank = getRankForLevel(appData.level);
    appData.xpToNextLevel = calculateXpForLevel(appData.level);
    saveData();

    // Mostra aviso visual (será exibido após a UI carregar)
    appData._inactivityWarning = {
      weeks: weeksInactive,
      xpLost: Math.min(xpPenalty, oldXp),
      levelLost: oldLevel - appData.level
    };
  }
}

function renderHomeSummary() {
  const totalExercises = document.getElementById('totalExercises');
  const totalWorkouts = document.getElementById('totalWorkouts');
  const totalVolume = document.getElementById('totalVolume');
  const daysSinceStart = document.getElementById('daysSinceStart');

  if (totalExercises) totalExercises.textContent = appData.exercises?.length || 0;
  if (totalWorkouts) totalWorkouts.textContent = appData.workouts?.length || 0;
  if (totalVolume) totalVolume.textContent = `${formatWeight(getTotalVolume())} kg`;
  if (daysSinceStart) daysSinceStart.textContent = getDaysSinceStart();
}

function getLastWorkoutForExercise(exerciseIndex) {
  if (!appData.workouts || appData.workouts.length === 0) return null;
  const exerciseWorkouts = appData.workouts
    .filter(w => w.exerciseIndex === exerciseIndex)
    .sort((a, b) => b.date - a.date);
  return exerciseWorkouts[0] || null;
}

function getWorkoutsForExercise(exerciseIndex) {
  if (!appData.workouts || appData.workouts.length === 0) return [];
  return appData.workouts
    .filter(w => w.exerciseIndex === exerciseIndex)
    .sort((a, b) => b.date - a.date);
}

function calculateSuggestedWeight(exerciseIndex) {
  const exercise = appData.exercises?.[exerciseIndex];
  if (!exercise) return exercise?.weight || 0;

  const lastWorkout = getLastWorkoutForExercise(exerciseIndex);
  if (!lastWorkout) return exercise.weight;

  const { weight, reps } = lastWorkout;

  let suggested = weight;
  if (reps >= 12) {
    suggested = Math.round(weight * 1.05 * 2) / 2;
  } else if (reps >= 8) {
    suggested = Math.round(weight * 1.025 * 2) / 2;
  } else if (reps < 6) {
    suggested = Math.max(0, Math.round(weight * 0.95 * 2) / 2);
  }

  return suggested;
}

function isPR(exerciseIndex, newWeight, newReps) {
  const lastWorkout = getLastWorkoutForExercise(exerciseIndex);
  if (!lastWorkout) return false;
  return newWeight > lastWorkout.weight || (newWeight === lastWorkout.weight && newReps > lastWorkout.reps);
}

function renderRecentActivity() {
  const list = document.getElementById('recentList');
  const section = document.querySelector('.recent-activity');
  if (!list || !section) return;

  if (!appData.workouts || appData.workouts.length === 0) {
    list.innerHTML = '<div class="recent-empty">Nenhum treino registrado ainda</div>';
    section.hidden = true;
    return;
  }

  section.hidden = false;
  const recent = [...appData.workouts].sort((a, b) => b.date - a.date).slice(0, 5);

  list.innerHTML = recent.map(w => {
    const ex = appData.exercises[w.exerciseIndex];
    const isPRWorkout = isPR(w.exerciseIndex, w.weight, w.reps);
    return `
      <article class="recent-item" role="listitem">
        <header class="recent-item-header">
          <span class="recent-exercise-name">${escapeHtml(ex?.name || 'Exercício removido')}</span>
          <span class="recent-item-date">${formatDateTime(w.date)}</span>
        </header>
        <div class="recent-item-details">
          <span class="recent-detail"><span class="label">Carga:</span> <span class="value ${isPRWorkout ? 'pr' : ''}">${formatWeight(w.weight)} kg</span></span>
          <span class="recent-detail"><span class="label">Reps:</span> <span class="value">${w.reps}</span></span>
          <span class="recent-detail"><span class="label">Volume:</span> <span class="value">${formatWeight(w.weight * w.reps)} kg</span></span>
          ${isPRWorkout ? '<span class="recent-detail pr"><span class="label">🏆 PR!</span></span>' : ''}
        </div>
      </article>
    `;
  }).join('');
}

function renderTrainExercises() {
  const list = document.getElementById('trainExercisesList');
  const emptyState = document.getElementById('emptyTrainState');
  if (!list) return;

  if (!appData.exercises || appData.exercises.length === 0) {
    list.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  list.innerHTML = appData.exercises.map((ex, index) => {
    const lastWorkout = getLastWorkoutForExercise(index);
    const suggestedWeight = calculateSuggestedWeight(index);
    const showSuggestion = lastWorkout && suggestedWeight !== ex.weight;
    const history = getWorkoutsForExercise(index);

    let lastWorkoutHtml = '';
    if (lastWorkout) {
      lastWorkoutHtml = `
        <div class="train-last-workout">
          <span class="label">Último: ${formatDate(lastWorkout.date)}</span>
          <span class="value">${formatWeight(lastWorkout.weight)} kg × ${lastWorkout.reps} rep${lastWorkout.reps !== 1 ? 's' : ''}</span>
        </div>
      `;
    } else {
      lastWorkoutHtml = `
        <div class="train-last-workout">
          <span class="label">Carga inicial</span>
          <span class="value">${formatWeight(ex.weight)} kg</span>
        </div>
      `;
    }

    const suggestionHtml = showSuggestion ? `
      <div class="train-suggested">
        <span class="label">Sugerido</span>
        <span class="value">${formatWeight(suggestedWeight)} kg</span>
      </div>
    ` : '';

    const historyHtml = history.length > 0 ? `
      <div class="train-history" id="history-${index}">
        <div class="train-history-list">
          ${history.map(w => `
            <article class="train-history-item ${isPR(w.exerciseIndex, w.weight, w.reps) ? 'pr' : ''}" role="listitem">
              <span class="train-history-date">${formatDateTime(w.date)}</span>
              <div class="train-history-details">
                <span class="train-history-weight">${formatWeight(w.weight)} kg</span>
                <span class="train-history-reps">${w.reps} rep${w.reps !== 1 ? 's' : ''}</span>
                ${isPR(w.exerciseIndex, w.weight, w.reps) ? '<span class="train-history-pr-badge">PR</span>' : ''}
              </div>
            </article>
          `).join('')}
        </div>
        <button class="train-history-toggle" data-index="${index}" aria-label="${history.length > 1 ? 'Ocultar histórico' : 'Ver histórico'}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
    ` : '';

    return `
      <article class="train-exercise-card" data-index="${index}" role="listitem">
        <div class="train-exercise-main">
          <div class="train-exercise-info">
            <span class="train-exercise-name">${escapeHtml(ex.name)}</span>
            <div class="train-exercise-meta">
              ${lastWorkoutHtml}
              ${suggestionHtml}
            </div>
          </div>
          <button class="btn btn-primary train-action-btn" data-index="${index}" type="button" aria-label="Registrar treino para ${escapeHtml(ex.name)}">
            + Registrar
          </button>
        </div>
        ${historyHtml}
      </article>
    `;
  }).join('');

  list.querySelectorAll('.train-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      openWorkoutModal(index);
    });
  });

  list.querySelectorAll('.train-history-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      const historyEl = document.getElementById(`history-${index}`);
      if (historyEl) {
        historyEl.classList.toggle('open');
        e.currentTarget.setAttribute('aria-label', historyEl.classList.contains('open') ? 'Ocultar histórico' : 'Ver histórico');
      }
    });
  });
}

function openWorkoutModal(exerciseIndex) {
  const exercise = appData.exercises?.[exerciseIndex];
  if (!exercise) return;

  const modal = document.getElementById('workoutModal');
  const form = document.getElementById('workoutForm');
  const exerciseIndexInput = document.getElementById('modalExerciseIndex');
  const exerciseInfo = document.getElementById('modalExerciseInfo');
  const weightInput = document.getElementById('modalWeight');
  const repsInput = document.getElementById('modalReps');
  const suggestion = document.getElementById('modalSuggestion');

  exerciseIndexInput.value = exerciseIndex;

  const lastWorkout = getLastWorkoutForExercise(exerciseIndex);
  const suggestedWeight = calculateSuggestedWeight(exerciseIndex);
  const showSuggestion = lastWorkout && suggestedWeight !== exercise.weight;

  exerciseInfo.innerHTML = `
    <span class="modal-exercise-name">${escapeHtml(exercise.name)}</span>
    <span class="modal-last-weight">Último: ${lastWorkout ? `${formatWeight(lastWorkout.weight)} kg × ${lastWorkout.reps} rep${lastWorkout.reps !== 1 ? 's' : ''}` : `Carga inicial: ${formatWeight(exercise.weight)} kg`}</span>
  `;

  weightInput.value = showSuggestion ? suggestedWeight : (lastWorkout?.weight || exercise.weight);
  repsInput.value = '';

  if (showSuggestion) {
    suggestion.innerHTML = `
      <span class="label">Sugestão baseada no último treino:</span>
      <span class="value">${formatWeight(suggestedWeight)} kg</span>
    `;
    suggestion.hidden = false;
  } else {
    suggestion.hidden = true;
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  weightInput.focus();
}

function closeWorkoutModal() {
  const modal = document.getElementById('workoutModal');
  modal.hidden = true;
  document.body.style.overflow = '';
}

function saveWorkout(e) {
  e.preventDefault();
  const form = e.target;
  const exerciseIndex = parseInt(form.exerciseIndex.value, 10);
  const weight = parseFloat(form.weight.value);
  const reps = parseInt(form.reps.value, 10);

  if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 1) return;

  // Pega o último treino ANTES de adicionar o novo (para detectar PR corretamente)
  const previousWorkout = getLastWorkoutForExercise(exerciseIndex);
  const isFirstWorkout = !previousWorkout;
  const isPR = isFirstWorkout || (weight > previousWorkout.weight || (weight === previousWorkout.weight && reps > previousWorkout.reps));

  const workout = {
    exerciseIndex,
    weight,
    reps,
    date: Date.now()
  };

  if (!appData.workouts) appData.workouts = [];
  appData.workouts.push(workout);

  // Atualiza a data do último treino (reseta contador de inatividade)
  appData.lastWorkoutDate = Date.now();
  saveData();

  closeWorkoutModal();
  renderTrainExercises();
  renderRecentActivity();
  renderHomeSummary();

  if (isPR) {
    awardPRXP(exerciseIndex, weight, reps);
  } else {
    showToast('📊 Treino de manutenção registrado. Sem novo estímulo, sem XP.', false);
  }
}

function checkProgressAndAwardXP(exerciseIndex, newWeight, newReps) {
  const lastWorkout = getLastWorkoutForExercise(exerciseIndex);
  if (!lastWorkout) {
    // Primeiro treino deste exercício: conta como PR inicial
    awardPRXP(exerciseIndex, newWeight, newReps);
    return;
  }

  const isPRWorkout = newWeight > lastWorkout.weight || (newWeight === lastWorkout.weight && newReps > lastWorkout.reps);

  if (isPRWorkout) {
    awardPRXP(exerciseIndex, newWeight, newReps);
  } else {
    // Treino de manutenção: sem XP, mas avisa o usuário
    showToast('📊 Treino de manutenção registrado. Sem novo estímulo, sem XP.', false);
  }
}

function isPR(exerciseIndex, weight, reps) {
  const lastWorkout = getLastWorkoutForExercise(exerciseIndex);
  if (!lastWorkout) return true; // primeiro treino = PR
  return weight > lastWorkout.weight || (weight === lastWorkout.weight && reps > lastWorkout.reps);
}

function awardPRXP(exerciseIndex, newWeight, newReps) {
  const XP_PER_PR = 50;
  const oldLevel = appData.level;
  const oldRank = appData.rank;

  appData.xp += XP_PER_PR;

  // Verifica subidas de nível (pode subir múltiplos níveis de uma vez)
  let leveledUp = false;
  let newRank = appData.rank;

  while (appData.xp >= appData.xpToNextLevel) {
    appData.xp -= appData.xpToNextLevel;
    appData.level += 1;
    appData.xpToNextLevel = calculateXpForLevel(appData.level);
    newRank = getRankForLevel(appData.level);
    leveledUp = true;
  }

  appData.rank = newRank;
  saveData();
  updateUI();

  // Toast de PR
  showToast(`🔥 NOVO PR! +${XP_PER_PR} XP por ganho de massa!`, false);

  // Toast de level up se subiu
  if (leveledUp) {
    setTimeout(() => {
      showToast(`🎉 Subiu para Nível ${appData.level} (${appData.rank})!`, false);
    }, 600);
  }
}

/* Exercise Modal (Add/Edit) */
function openExerciseModal(editIndex = null) {
  const modal = document.getElementById('exerciseModal');
  const form = document.getElementById('exerciseForm');
  const title = document.getElementById('exerciseModalTitle');
  const submitBtn = document.getElementById('exerciseSubmitBtn');
  const indexInput = document.getElementById('editExerciseIndex');
  const nameInput = document.getElementById('exerciseName');
  const weightInput = document.getElementById('exerciseWeight');

  form.reset();
  indexInput.value = editIndex !== null ? editIndex : '';

  if (editIndex !== null) {
    const exercise = appData.exercises[editIndex];
    if (!exercise) return;
    title.textContent = 'Editar Exercício';
    submitBtn.textContent = 'Salvar';
    nameInput.value = exercise.name;
    weightInput.value = exercise.weight;
  } else {
    title.textContent = 'Novo Exercício';
    submitBtn.textContent = 'Salvar';
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  nameInput.focus();
}

function closeExerciseModal() {
  const modal = document.getElementById('exerciseModal');
  modal.hidden = true;
  document.body.style.overflow = '';
}

function saveExercise(e) {
  e.preventDefault();
  const form = e.target;
  const editIndex = form.exerciseIndex.value;
  const name = form.exerciseName.value.trim();
  const weight = parseFloat(form.exerciseWeight.value);

  if (!name || isNaN(weight)) return;

  if (editIndex !== '') {
    const idx = parseInt(editIndex, 10);
    appData.exercises[idx] = { ...appData.exercises[idx], name, weight };
    showToast('Exercício atualizado!');
  } else {
    if (!appData.exercises) appData.exercises = [];
    appData.exercises.push({ name, weight, createdAt: Date.now() });
    showToast('Exercício adicionado!');
  }

  saveData();
  closeExerciseModal();
  updateUI();
}

/* Manage Exercises Modal */
function renderManageExercises() {
  const list = document.getElementById('manageExercisesList');
  const emptyState = document.getElementById('emptyManageState');
  if (!list) return;

  if (!appData.exercises || appData.exercises.length === 0) {
    list.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  list.innerHTML = appData.exercises.map((ex, index) => `
    <article class="manage-item" data-index="${index}" role="listitem">
      <div class="manage-item-info">
        <span class="manage-item-name">${escapeHtml(ex.name)}</span>
        <span class="manage-item-weight"><span class="label">Carga inicial: </span><span class="value">${formatWeight(ex.weight)} kg</span></span>
      </div>
      <div class="manage-item-actions">
        <button class="btn-icon-sm edit" data-index="${index}" aria-label="Editar ${escapeHtml(ex.name)}" title="Editar">✏️</button>
        <button class="btn-icon-sm delete" data-index="${index}" aria-label="Excluir ${escapeHtml(ex.name)}" title="Excluir">🗑️</button>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('.btn-icon-sm.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      closeManageModal();
      openExerciseModal(index);
    });
  });

  list.querySelectorAll('.btn-icon-sm.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      deleteExercise(index);
    });
  });
}

function openManageModal() {
  const modal = document.getElementById('manageExercisesModal');
  renderManageExercises();
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeManageModal() {
  const modal = document.getElementById('manageExercisesModal');
  modal.hidden = true;
  document.body.style.overflow = '';
}

function deleteExercise(index) {
  const exercise = appData.exercises?.[index];
  if (!exercise) return;

  if (confirm(`Excluir "${exercise.name}"? Isso também removerá todo o histórico de treinos deste exercício.`)) {
    appData.exercises.splice(index, 1);
    appData.workouts = appData.workouts?.filter(w => w.exerciseIndex !== index).map(w => ({
      ...w,
      exerciseIndex: w.exerciseIndex > index ? w.exerciseIndex - 1 : w.exerciseIndex
    })) || [];
    saveData();
    updateUI();
    showToast('Exercício removido');
  }
}

/* Export/Import/Reset */
function exportBackup() {
  try {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlevel-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup exportado com sucesso!');
  } catch (e) {
    console.error('Erro ao exportar:', e);
    showToast('Erro ao exportar backup', true);
  }
}

function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== 'object') {
          throw new Error('Arquivo inválido');
        }
        const merged = { ...DEFAULT_DATA, ...imported };
        merged.rank = getRankForLevel(merged.level);
        merged.xpToNextLevel = calculateXpForLevel(merged.level);
        appData = merged;
        saveData();
        updateUI();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

function showImportFeedback(message, isError = false) {
  const feedback = document.getElementById('importFeedback');
  feedback.textContent = message;
  feedback.className = 'import-feedback ' + (isError ? 'error' : 'success');
  feedback.hidden = false;
  setTimeout(() => { feedback.hidden = true; }, 4000);
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast ' + (isError ? 'toast-error' : '');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    padding: 12px 20px;
    background: ${isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(38, 38, 38, 0.95)'};
    color: ${isError ? '#fff' : 'var(--fg)'};
    border: 1px solid ${isError ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'};
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 100;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

function resetAllData() {
  if (confirm('Tem certeza? Isso apagará TODO o seu progresso (nível, XP, histórico, exercícios). Esta ação não pode ser desfeita.')) {
    if (confirm('Confirmar novamente: TODOS os dados serão perdidos permanentemente.')) {
      localStorage.removeItem(STORAGE_KEY);
      appData = { ...DEFAULT_DATA };
      saveData();
      updateUI();
      showToast('Progresso resetado. Bem-vindo de volta ao Nível 1!');
    }
  }
}

/* Navigation */
function switchView(viewName) {
  document.querySelectorAll('[id$="View"]').forEach(v => v.hidden = true);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`${viewName}View`);
  const nav = document.querySelector(`[data-view="${viewName}"]`);
  if (view) view.hidden = false;
  if (nav) {
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
  }
  document.querySelectorAll('.nav-item:not(.active)').forEach(n => n.removeAttribute('aria-current'));
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });
}

function initSettings() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const resetBtn = document.getElementById('resetBtn');

  exportBtn?.addEventListener('click', exportBackup);

  importBtn?.addEventListener('click', () => importFile.click());

  importFile?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importBackup(file);
      showImportFeedback('Backup importado com sucesso! Progresso restaurado.');
      importFile.value = '';
    } catch (err) {
      showImportFeedback('Erro ao importar: arquivo inválido ou corrompido.', true);
      importFile.value = '';
    }
  });

  resetBtn?.addEventListener('click', resetAllData);
}

/* Modals Init */
function initExerciseModal() {
  const modal = document.getElementById('exerciseModal');
  const closeBtn = document.getElementById('exerciseModalCloseBtn');
  const cancelBtn = document.getElementById('exerciseCancelBtn');
  const form = document.getElementById('exerciseForm');

  closeBtn?.addEventListener('click', closeExerciseModal);
  cancelBtn?.addEventListener('click', closeExerciseModal);
  form?.addEventListener('submit', saveExercise);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeExerciseModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeExerciseModal();
    }
  });
}

function initWorkoutModal() {
  const modal = document.getElementById('workoutModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const form = document.getElementById('workoutForm');

  closeBtn?.addEventListener('click', closeWorkoutModal);
  cancelBtn?.addEventListener('click', closeWorkoutModal);
  form?.addEventListener('submit', saveWorkout);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeWorkoutModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeWorkoutModal();
    }
  });
}

function initManageModal() {
  const modal = document.getElementById('manageExercisesModal');
  const closeBtn = document.getElementById('manageModalCloseBtn');

  closeBtn?.addEventListener('click', closeManageModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeManageModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeManageModal();
    }
  });
}

function initHomeActions() {
  const quickAddBtn = document.getElementById('quickAddExerciseBtn');
  const manageBtn = document.getElementById('quickManageExercisesBtn');

  quickAddBtn?.addEventListener('click', () => openExerciseModal(null));
  manageBtn?.addEventListener('click', () => openManageModal());
}

function initTrain() {
  initWorkoutModal();
}

function init() {
  loadData();
  updateUI();

  // Mostra aviso de inatividade se houver
  if (appData._inactivityWarning) {
    const w = appData._inactivityWarning;
    let msg = `⚠️ Período de inatividade detectado (${w.weeks} semana${w.weeks > 1 ? 's' : ''}): `;
    if (w.xpLost > 0) msg += `-${w.xpLost} XP`;
    if (w.levelLost > 0) msg += `, caiu ${w.levelLost} nível${w.levelLost > 1 ? 's' : ''}`;
    msg += ' por destreino.';
    showToast(msg, true);
    delete appData._inactivityWarning;
  }

  initNavigation();
  initSettings();
  initExerciseModal();
  initManageModal();
  initHomeActions();
  initTrain();
  switchView('home');
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}