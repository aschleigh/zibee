# 字Bee — Bilingual Spelling Bee

A spelling bee with a twist: hard English words (GRE-level and beyond) are read aloud and you spell them; Chinese words (HSK 4) show you the pinyin and meaning, and you type the characters.

**Word bank:** ~2,990 English + 598 Chinese entries, all in `words.js`.

## How to play

1. Add player names, pick a language mode (Mixed / English / 中文) and turns per player, hit **Start game**.
2. **English turns:** press *Hear word*, read the definition, spell what you heard. (Uses your browser's built-in text-to-speech — no internet audio needed.)
3. **Chinese turns:** you see pinyin + an English definition; type the hanzi. Both simplified and traditional answers are accepted. You'll need a Chinese keyboard/IME enabled on your device (built into every phone and OS — on iOS/Android add "Chinese Pinyin" keyboard; on Mac: System Settings → Keyboard → Input Sources; on Windows: Settings → Time & Language → Add Chinese).
4. Scoring: 1 point per correct word; from a 3-streak onward, each correct word is worth 2. Scores autosave in the browser, so refreshing won't lose the game.

## Running it — 100% free options

### Option A: GitHub Pages (free, gives you a public URL)

1. Create a free account at github.com if you don't have one.
2. Click **+ → New repository**, name it anything (e.g. `zibee`), keep it Public, create it.
3. On the repo page, click **uploading an existing file** (or Add file → Upload files) and drag in these four files: `index.html`, `style.css`, `game.js`, `words.js`. Commit.
4. Go to **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, pick branch `main` and folder `/ (root)`, save.
5. Wait a minute or two. Your game is live at `https://YOUR-USERNAME.github.io/zibee/`.

GitHub Pages is free for public repos with generous limits — more than enough for this. Anyone with the link can play.

### Option B: no hosting at all

The game is a fully static site with zero backend. Just double-click `index.html` and it runs locally in your browser. (Scores save per-browser via localStorage.)

Other free hosts that work identically: Netlify Drop (drag the folder onto netlify.com/drop) or Vercel.

## Customizing the word bank

Open `words.js`. It's one big object:

```js
const WORD_BANK = {
  english: [ { word: "abjure", def: "To solemnly renounce...", pos: "verb", ex: "..." }, ... ],
  chinese: [ { hanzi: "报名", trad: "報名", pinyin: "bào míng", def: "to sign up", pos: "v" }, ... ]
};
```

Add or delete entries freely — `pos`, `ex`, and `trad` are optional. Definitions can use `___` to blank out the word itself (so it isn't spoiled on screen).

To wipe saved scores/settings: browser dev tools → Application → Local Storage → delete the `zibee-state-v1` key, or just play through "New setup".

## Data sources

- English: a curated GRE vocabulary list ([siddharthagit/core-word-list](https://github.com/siddharthagit/core-word-list)) plus Webster's dictionary ([matthewreagan/WebstersEnglishDictionary](https://github.com/matthewreagan/WebstersEnglishDictionary)) filtered against a word-frequency list ([hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)) to keep only genuinely hard words. Some definitions carry 1913-dictionary flavor — part of the charm, and any entry can be edited.
- Chinese: HSK level 4 vocabulary from [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary).
