/* 字Bee — game logic
   State is kept in-memory and mirrored to localStorage so a refresh
   mid-game doesn't wipe the scoreboard. */

(function () {
  "use strict";

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "zibee-state-v1";

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- state ----------
  let state = {
    phase: "setup",            // setup | play | done
    players: [],               // {name, score, streak, turnsTaken}
    mode: "mixed",             // mixed | en | zh
    turnsPerPlayer: 10,        // 0 = endless
    currentPlayer: 0,
    deckEn: [],                // shuffled index queues into WORD_BANK
    deckZh: [],
    current: null              // {lang, entry}
  };

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.players)) state = Object.assign(state, s);
      }
    } catch (e) { /* ignore corrupt saves */ }
  }

  function freshDecks() {
    state.deckEn = shuffle(WORD_BANK.english.map((_, i) => i));
    state.deckZh = shuffle(WORD_BANK.chinese.map((_, i) => i));
  }

  // ---------- setup screen ----------
  const nameInput = $("player-name-input");
  const playerList = $("player-list");
  const startBtn = $("start-btn");

  function renderSetupPlayers() {
    playerList.innerHTML = "";
    state.players.forEach((p, i) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = p.name;
      const rm = document.createElement("button");
      rm.className = "remove-btn";
      rm.textContent = "✕";
      rm.setAttribute("aria-label", "Remove " + p.name);
      rm.addEventListener("click", () => {
        state.players.splice(i, 1);
        renderSetupPlayers();
        save();
      });
      li.append(span, rm);
      playerList.appendChild(li);
    });
    $("no-players-msg").hidden = state.players.length > 0;
    startBtn.disabled = state.players.length === 0;
  }

  function addPlayer() {
    const name = nameInput.value.trim();
    if (!name) return;
    if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      nameInput.select();
      return;
    }
    state.players.push({ name, score: 0, streak: 0, turnsTaken: 0 });
    nameInput.value = "";
    nameInput.focus();
    renderSetupPlayers();
    save();
  }

  $("add-player-btn").addEventListener("click", addPlayer);
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addPlayer(); });

  // segmented controls
  document.querySelectorAll(".seg-btn[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn[data-mode]").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.mode = b.dataset.mode;
      save();
    })
  );
  document.querySelectorAll(".seg-btn[data-turns]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn[data-turns]").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.turnsPerPlayer = parseInt(b.dataset.turns, 10);
      save();
    })
  );

  startBtn.addEventListener("click", () => {
    state.players.forEach((p) => { p.score = 0; p.streak = 0; p.turnsTaken = 0; });
    state.currentPlayer = 0;
    if (!state.deckEn.length && !state.deckZh.length) freshDecks();
    state.phase = "play";
    save();
    showScreen();
    nextWord();
  });

  // ---------- screens ----------
  function showScreen() {
    $("setup-screen").hidden = state.phase !== "setup";
    $("game-screen").hidden = state.phase !== "play";
    $("final-screen").hidden = state.phase !== "done";
  }

  // ---------- word drawing ----------
  function drawFrom(lang) {
    const deck = lang === "en" ? state.deckEn : state.deckZh;
    if (deck.length === 0) {
      // exhausted the bank — reshuffle a fresh deck
      if (lang === "en") state.deckEn = shuffle(WORD_BANK.english.map((_, i) => i));
      else state.deckZh = shuffle(WORD_BANK.chinese.map((_, i) => i));
    }
    const idx = (lang === "en" ? state.deckEn : state.deckZh).pop();
    const entry = lang === "en" ? WORD_BANK.english[idx] : WORD_BANK.chinese[idx];
    return { lang, entry };
  }

  function pickLang() {
    if (state.mode === "en") return "en";
    if (state.mode === "zh") return "zh";
    return Math.random() < 0.5 ? "en" : "zh";
  }

  // ---------- speech ----------
  function speakWord(word) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang && x.lang.startsWith("en"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }
  // some browsers load voices async
  if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = () => {};

  // ---------- rendering a turn ----------
  const answerInput = $("answer-input");

  function nextWord() {
    const p = state.players[state.currentPlayer];
    state.current = drawFrom(pickLang());
    save();

    $("turn-player").textContent = p.name + "'s turn";
    $("turn-count").textContent = state.turnsPerPlayer === 0
      ? "word " + (p.turnsTaken + 1)
      : "word " + (p.turnsTaken + 1) + " of " + state.turnsPerPlayer;

    const isEn = state.current.lang === "en";
    const e = state.current.entry;

    $("lang-tag").textContent = isEn ? "ENGLISH" : "中文 · HSK 4";
    $("lang-tag").className = "lang-tag " + (isEn ? "en" : "zh");
    $("pos-tag").textContent = e.pos ? e.pos : "";

    $("en-prompt").hidden = !isEn;
    $("zh-prompt").hidden = isEn;
    $("result-overlay").hidden = true;

    if (isEn) {
      $("en-def").textContent = e.def;
      const exEl = $("en-ex");
      if (e.ex) { exEl.textContent = "“" + e.ex + "”"; exEl.hidden = false; }
      else exEl.hidden = true;
      answerInput.classList.remove("zh");
      answerInput.placeholder = "Spell the word you heard";
      speakWord(e.word);
    } else {
      $("zh-pinyin").textContent = e.pinyin;
      $("zh-def").textContent = e.def;
      answerInput.classList.add("zh");
      answerInput.placeholder = "输入汉字";
    }

    answerInput.value = "";
    answerInput.disabled = false;
    answerInput.focus();
    renderScores();
  }

  $("hear-btn").addEventListener("click", () => {
    if (state.current && state.current.lang === "en") speakWord(state.current.entry.word);
  });

  // ---------- answer checking ----------
  function normalizeEn(s) {
    return s.trim().toLowerCase().replace(/[^a-z]/g, "");
  }
  function normalizeZh(s) {
    return s.trim().replace(/[\s，。,.!！?？]/g, "");
  }

  function checkAnswer(raw) {
    const { lang, entry } = state.current;
    if (lang === "en") return normalizeEn(raw) === entry.word;
    const a = normalizeZh(raw);
    return a === entry.hanzi || (entry.trad && a === entry.trad);
  }

  function finishTurn(correct, gaveUp) {
    const p = state.players[state.currentPlayer];
    const { lang, entry } = state.current;
    let earned = 0;

    if (correct) {
      p.streak += 1;
      earned = p.streak >= 3 ? 2 : 1;
      p.score += earned;
    } else {
      p.streak = 0;
    }
    p.turnsTaken += 1;
    save();

    // result overlay
    const stamp = $("stamp");
    stamp.textContent = correct ? "对" : "错";
    stamp.className = "stamp " + (correct ? "ok" : "bad");
    // retrigger animation
    void stamp.offsetWidth;

    $("result-line").textContent = correct
      ? (earned === 2 ? "Correct — streak bonus, +2!" : "Correct, +1")
      : gaveUp ? "Passed" : "Not quite";

    const ansEl = $("result-answer");
    if (lang === "en") {
      ansEl.textContent = entry.word;
      ansEl.className = "result-answer";
      $("result-detail").textContent = entry.def;
    } else {
      ansEl.textContent = entry.hanzi + (entry.trad && entry.trad !== entry.hanzi ? " / " + entry.trad : "") + " · " + entry.pinyin;
      ansEl.className = "result-answer zh";
      $("result-detail").textContent = entry.def;
    }

    answerInput.disabled = true;
    $("result-overlay").hidden = false;
    $("next-btn").focus();
    renderScores();
  }

  $("answer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.current || !$("result-overlay").hidden) return;
    if (!answerInput.value.trim()) return;
    finishTurn(checkAnswer(answerInput.value), false);
  });

  $("skip-btn").addEventListener("click", () => {
    if (!state.current || !$("result-overlay").hidden) return;
    finishTurn(false, true);
  });

  $("next-btn").addEventListener("click", () => {
    // advance to next player (round-robin)
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    // check game end: everyone reached the turn cap
    if (state.turnsPerPlayer > 0 && state.players.every((p) => p.turnsTaken >= state.turnsPerPlayer)) {
      endGame();
      return;
    }
    // skip players who already hit their cap (possible after removals)
    let guard = 0;
    while (state.turnsPerPlayer > 0 &&
           state.players[state.currentPlayer].turnsTaken >= state.turnsPerPlayer &&
           guard++ < state.players.length) {
      state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    }
    nextWord();
  });

  // ---------- scoreboard ----------
  function renderScores(targetId) {
    const list = $(targetId || "score-list");
    list.innerHTML = "";
    const ranked = state.players
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => b.score - a.score);
    ranked.forEach((p) => {
      const li = document.createElement("li");
      if (!targetId && p.i === state.currentPlayer && state.phase === "play") li.classList.add("is-current");
      const name = document.createElement("span");
      name.className = "sname";
      name.textContent = p.name;
      const streak = document.createElement("span");
      streak.className = "streak";
      streak.textContent = p.streak >= 3 ? "🔥" + p.streak : "";
      const pts = document.createElement("span");
      pts.className = "pts";
      pts.textContent = p.score;
      li.append(name, streak, pts);
      list.appendChild(li);
    });
  }

  // ---------- ending ----------
  function endGame() {
    state.phase = "done";
    save();
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const tied = ranked.filter((p) => p.score === top.score);
    $("winner-line").textContent = tied.length > 1
      ? "It's a tie: " + tied.map((p) => p.name).join(" & ")
      : top.name + " wins 🏆";
    renderScores("final-list");
    showScreen();
  }

  $("end-game-btn").addEventListener("click", () => {
    if (confirm("End the game and show final standings?")) endGame();
  });

  $("rematch-btn").addEventListener("click", () => {
    state.players.forEach((p) => { p.score = 0; p.streak = 0; p.turnsTaken = 0; });
    state.currentPlayer = 0;
    state.phase = "play";
    save();
    showScreen();
    nextWord();
  });

  $("new-game-btn").addEventListener("click", () => {
    state.phase = "setup";
    save();
    showScreen();
    renderSetupPlayers();
  });

  // ---------- boot ----------
  load();
  freshDecksIfNeeded();
  function freshDecksIfNeeded() {
    if (!Array.isArray(state.deckEn) || !state.deckEn.length) state.deckEn = shuffle(WORD_BANK.english.map((_, i) => i));
    if (!Array.isArray(state.deckZh) || !state.deckZh.length) state.deckZh = shuffle(WORD_BANK.chinese.map((_, i) => i));
  }

  $("bank-count").textContent =
    WORD_BANK.english.length.toLocaleString() + " English + " +
    WORD_BANK.chinese.length.toLocaleString() + " Chinese words in the bank";

  // restore UI to saved settings
  document.querySelectorAll(".seg-btn[data-mode]").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.mode === state.mode));
  document.querySelectorAll(".seg-btn[data-turns]").forEach((b) =>
    b.classList.toggle("is-active", parseInt(b.dataset.turns, 10) === state.turnsPerPlayer));

  // if a game was mid-flight, resume; otherwise show setup
  if (state.phase === "play" && state.players.length) {
    showScreen();
    nextWord();
  } else if (state.phase === "done" && state.players.length) {
    endGame(); // re-renders winner line + final standings
  } else {
    state.phase = "setup";
    showScreen();
    renderSetupPlayers();
  }
})();
