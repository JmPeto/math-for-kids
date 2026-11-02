/* =====================================================================
This just runs the code once,
   right away, and keeps all our variables private so they can't
   accidentally clash with anything else on the page.
===================================================================== */
(function(){

  /* -------------------------------------------------------------
     STATE
     One object holding everything about "where we are right now"
     in the game: which settings are picked, the current score,
     how many questions answered so far, and the active question.
  -------------------------------------------------------------- */
  const state = {
    op: 'add',        // currently selected operation: add | sub | mult | div | random
    diff: 'easy',      // currently selected difficulty: easy | medium | hard
    goal: 3,           // how many questions make up one mission
    score: 0,          // correct answers so far this mission
    answered: 0,        // total questions answered so far this mission
    current: null,      // the question currently on screen: { a, b, opActual, answer }
    locked: false        // true while feedback is showing, to block double-submits
  };

  /* -------------------------------------------------------------
     NUMBER RANGES
  -------------------------------------------------------------- */
const RANGES = {
  easy: {
    add: [0, 5],
    sub: [0, 5],
    mult: [0, 5],
    div: [1, 5]
  },
  medium: {
    add: [0, 10],
    sub: [0, 10],
    mult: [0, 10],
    div: [1, 10]
  },
  hard: {
    add: [0, 20],
    sub: [0, 20],
    mult: [0, 20],
    div: [1, 20]
  }
};

  // Text shown under the difficulty buttons to describe the chosen range
  const RANGE_NOTES = {
    easy:   'Numbers from 0 to 5 — nice and easy!',
    medium: 'Numbers from 0 to 10 — getting trickier!',
    hard:   'Numbers from 1 to 20 — for math champions!'
  };

  // Maps an operation key to the symbol shown between the two numbers
  const OP_SYMBOLS = {
  add: '+',
  sub: '−',
  mult: '×',
  div: '÷'
};

  // Maps an operation key to its full display name (used in the mission label)
  const OP_NAMES = { add:'Addition', sub:'Subtraction', mult:'Multiplication', div:'Division' };

  /* -------------------------------------------------------------
     GRAB REFERENCES TO ALL THE ELEMENTS WE'LL NEED
     Doing this once up front (instead of re-querying the DOM every
     time) keeps the code fast and easy to read.
  -------------------------------------------------------------- */
  const opRow = document.getElementById('opRow');
  const diffRow = document.getElementById('diffRow');
  const goalRow = document.getElementById('goalRow');
  const rangeNote = document.getElementById('rangeNote');
  const startBtn = document.getElementById('startBtn');

  const settingsCard = document.getElementById('settingsCard');
  const progressCard = document.getElementById('progressCard');
  const questionCard = document.getElementById('questionCard');
  const completeCard = document.getElementById('completeCard');
  const hintBox = document.getElementById('hintBox');

  const scoreVal = document.getElementById('scoreVal');
  const goalVal = document.getElementById('goalVal');
  const trackFill = document.getElementById('trackFill');
  const trackStars = document.getElementById('trackStars');
  const rocketIcon = document.getElementById('rocketIcon');
  const missionLabel = document.getElementById('missionLabel');

  const numOne = document.getElementById('numOne');
  const numTwo = document.getElementById('numTwo');
  const opSymbol = document.getElementById('opSymbol');
  const answerInput = document.getElementById('answerInput');
  const feedback = document.getElementById('feedback');
  const submitBtn = document.getElementById('submitBtn');

  const completeEmoji = document.getElementById('completeEmoji');
  const completeTitle = document.getElementById('completeTitle');
  const completeScore = document.getElementById('completeScore');
  const completeMsg = document.getElementById('completeMsg');
  const againBtn = document.getElementById('againBtn');
  const hintText = document.getElementById('hintText');

  /* -------------------------------------------------------------
     HELPER: random whole number between min and max, inclusive.
     e.g. randInt(1, 5) can return 1, 2, 3, 4, or 5.
  -------------------------------------------------------------- */
  function randInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* =================================================================
     SECTION A — SETTINGS: listening for clicks on the pill buttons
  ================================================================= */

  // Operation row: clicking a pill marks it selected and stores the choice
  opRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return; // click landed somewhere else in the row; ignore

    state.op = btn.dataset.op; // dataset.op reads the data-op="..." attribute
    opRow.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // Difficulty row: same pattern, plus it updates the little range note
  diffRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;

    state.diff = btn.dataset.diff;
    diffRow.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
    btn.classList.add('selected');
    rangeNote.textContent = RANGE_NOTES[state.diff];
  });

  // Goal row: same pattern, but the value is a number, so parseInt() converts
  // the text "3"/"5"/"10" from the data attribute into an actual number.
  goalRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;

    state.goal = parseInt(btn.dataset.goal, 10);
    goalRow.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
    btn.classList.add('selected');
  });

  /* =================================================================
     SECTION B — QUESTION GENERATION
  ================================================================= */

  // If "Random" is selected, pick a fresh operation for THIS question.
  // Otherwise just use whatever single operation is selected.
  function pickOperation(){
    if (state.op !== 'random') return state.op;
    const ops = ['add','sub','mult','div'];
    return ops[randInt(0, ops.length - 1)];
  }

  // Builds a brand-new math question and puts it on screen.
  function generateQuestion(){
    const opActual = pickOperation();
    const range = RANGES[state.diff][opActual];
    let a, b, answer;

    if (opActual === 'add'){
      a = randInt(range[0], range[1]);
      b = randInt(range[0], range[1]);
      answer = a + b;

    } else if (opActual === 'sub'){
      a = randInt(range[0], range[1]);
      b = randInt(range[0], range[1]);
      // Swap so "a" is always the bigger number — keeps the result
      // from going negative, which is confusing for young kids.
      if (b > a){ const t = a; a = b; b = t; }
      answer = a - b;

    } else if (opActual === 'mult'){
      a = randInt(range[0], range[1]);
      b = randInt(range[0], range[1]);
      answer = a * b;

    } else {
  // Division (numbers never exceed the difficulty maximum)

  const maxNumber =
    state.diff === "easy" ? 5 :
    state.diff === "medium" ? 10 : 20;

  // Pick a divisor
  b = randInt(1, maxNumber);

  // Find all multiples of the divisor that are <= maxNumber
  const possible = [];
  for (let i = b; i <= maxNumber; i += b) {
    possible.push(i);
  }

  // Pick one of those multiples
  a = possible[randInt(0, possible.length - 1)];

  answer = a / b;
  }

    // Save this question so checkAnswer() can grade it later
    state.current = { a, b, opActual, answer };

    // Push the numbers onto the screen
    numOne.textContent = a;
    numTwo.textContent = b;
    opSymbol.textContent = OP_SYMBOLS[opActual];

    // Reset the input box and feedback area for a clean new question
    answerInput.value = '';
    answerInput.classList.remove('wrong-shake', 'right-glow');
    feedback.textContent = '';
    feedback.className = 'feedback';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
    state.locked = false;
    answerInput.focus(); // put the cursor straight into the answer box
  }

  /* =================================================================
     SECTION C — PROGRESS TRACK (rocket + stars)
  ================================================================= */

  // Creates one ⭐ per question in the goal, fresh each mission
  // (so a goal of 5 makes 5 stars, a goal of 10 makes 10, etc.)
  function buildStars(){
    trackStars.innerHTML = '';
    for (let i = 0; i < state.goal; i++){
      const s = document.createElement('span');
      s.className = 'track-star';
      s.textContent = '\u2b50';
      trackStars.appendChild(s);
    }
  }

  // Updates the score text, moves the fill bar + rocket, and lights up
  // stars for each correct answer so far.
  function updateProgress(){
    scoreVal.textContent = state.score;
    goalVal.textContent = state.goal;

    const pct = Math.min(100, (state.answered / state.goal) * 100);
    trackFill.style.width = pct + '%';
    rocketIcon.style.left = 'calc(' + pct + '% - 12px)';

    const stars = trackStars.querySelectorAll('.track-star');
    stars.forEach((s, idx) => {
      s.classList.toggle('lit', idx < state.score);
    });
  }

  /* =================================================================
     SECTION D — MISSION FLOW (start → answer loop → complete)
  ================================================================= */

  // Called when "Start Mission" is clicked: resets the score,
  // swaps which cards are visible, and generates the first question.
  function startMission(){
    state.score = 0;
    state.answered = 0;

    settingsCard.style.display = 'none';
    progressCard.classList.add('active');
    questionCard.classList.add('active');
    completeCard.classList.remove('active');
    hintBox.style.display = 'flex';

    missionLabel.textContent =
      (state.op === 'random' ? 'Random Mix' : OP_NAMES[state.op]) +
      ' \u2022 ' + state.diff[0].toUpperCase() + state.diff.slice(1);

    hintText.textContent =
      'Answer ' + state.goal + ' question' + (state.goal > 1 ? 's' : '') +
      ' to complete the mission and earn your score!';

    buildStars();
    updateProgress();
    generateQuestion();
  }

  // A short list of random praise messages shown on a correct answer
  const PRAISE = ['Nice work! 🎉', 'You got it! ⭐', 'Awesome! 🚀', 'Brilliant! 🌟', 'Super job! 🎈'];
  function pickPraise(){
    return PRAISE[randInt(0, PRAISE.length - 1)];
  }

  // Called when "Submit" is clicked (or Enter is pressed): grades the
  // current answer, updates score/progress, then either shows the next
  // question or ends the mission.
  function checkAnswer(){
    if (state.locked || !state.current) return; // ignore double-clicks

    const raw = answerInput.value.trim();
    if (raw === ''){
      answerInput.focus(); // don't grade an empty box — just refocus it
      return;
    }

    const userAnswer = parseInt(raw, 10);
    state.locked = true;      // block further submits until the next question loads
    submitBtn.disabled = true;

    const isCorrect = userAnswer === state.current.answer;

    if (isCorrect){
      state.score++;
      answerInput.classList.add('right-glow');
      feedback.textContent = pickPraise();
      feedback.className = 'feedback correct';
    } else {
      answerInput.classList.add('wrong-shake');
      feedback.textContent = 'Not quite — it was ' + state.current.answer + '. Keep going!';
      feedback.className = 'feedback incorrect';
    }

    state.answered++;
    updateProgress();

    // Pause for just over a second so the player can read the feedback,
    // then move on automatically.
    setTimeout(() => {
      if (state.answered >= state.goal){
        showComplete();
      } else {
        generateQuestion();
      }
    }, 1100);
  }

  /* =================================================================
     SECTION E — MISSION COMPLETE SCREEN
  ================================================================= */

  // Called once the player has answered "goal" questions. Picks a
  // result message based on the percentage correct, and celebrates
  // with confetti for a good score.
  function showComplete(){
    questionCard.classList.remove('active');
    progressCard.classList.remove('active');
    hintBox.style.display = 'none';
    completeCard.classList.add('active');

    const pct = state.score / state.goal;
    let emoji = '🌟', title = 'Mission Complete!', msg = 'Great effort — try again to beat your score!';

    if (pct === 1){
      emoji = '🏆'; title = 'Perfect Mission!'; msg = "You're a math superstar!";
    } else if (pct >= 0.7){
      emoji = '🎉'; title = 'Mission Complete!'; msg = 'Awesome job out there!';
    } else if (pct >= 0.4){
      emoji = '🚀'; title = 'Mission Complete!'; msg = 'Nice try — keep practicing!';
    } else {
      emoji = '💪'; title = 'Mission Complete!'; msg = 'Every launch makes you stronger — try again!';
    }

    completeEmoji.textContent = emoji;
    completeTitle.textContent = title;
    completeScore.textContent = state.score + ' / ' + state.goal + ' correct';
    completeMsg.textContent = msg;

    if (pct >= 0.7) launchConfetti();
  }

  // Spawns a handful of small colored squares/circles that fall and
  // spin using the .confetti-piece CSS animation, then removes them
  // from the page once the animation finishes.
  function launchConfetti(){
    // Respect the same "reduce motion" preference the CSS uses
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#FF6F91', '#3DA9E0', '#FFC93C', '#3FBF8F', '#8B6FEE'];

    for (let i = 0; i < 26; i++){
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[randInt(0, colors.length - 1)];
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      completeCard.appendChild(piece);

      // Clean up each piece from the DOM after its fall animation ends
      setTimeout(() => piece.remove(), 2800);
    }
  }

  // "Play Again" just hides the completion card and brings back the
  // settings screen (with the previous choices still selected).
  function resetToSettings(){
    completeCard.classList.remove('active');
    settingsCard.style.display = 'block';
  }

  /* =================================================================
     SECTION F — WIRE UP THE REMAINING BUTTONS
  ================================================================= */
  startBtn.addEventListener('click', startMission);
  submitBtn.addEventListener('click', checkAnswer);
  againBtn.addEventListener('click', resetToSettings);

  // Let players press Enter in the answer box instead of clicking Submit
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });

})();
