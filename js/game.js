(function () {
  const content = globalThis.P6_CONTENT;
  const app = document.getElementById("app");
  const STORE = "p6-peter-leap-ch4-v1";

  const BRAND = `<svg viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="18" fill="#e23b6a"/><path d="M40 62s-18-11-18-22a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 11-18 22-18 22z" fill="#fff6ef"/></svg>`;

  const PHOTOS = {
    "go on a charity walk": "assets/vocab/go_on_a_charity_walk.png",
    "sell flags": "assets/vocab/sell_flags.png",
    "run a charity sale": "assets/vocab/charity_cake_sale.png",
    "go on a charity run": "assets/vocab/go_on_a_charity_run.png",
    "take part in a charity show": "assets/vocab/take_part_in_a_charity_show.png",
    "visit the elderly": "assets/vocab/visit_the_elderly.png",
    "run a second-hand stall": "assets/vocab/run_a_second_hand_stall.png",
    "clean the beach": "assets/vocab/clean_the_beach.png",
    "donate canned food": "assets/vocab/donate_canned_food.png",
  };

  const PHOTO_ORDER = [
    "go on a charity walk",
    "sell flags",
    "run a charity sale",
    "go on a charity run",
    "take part in a charity show",
    "visit the elderly",
    "run a second-hand stall",
    "clean the beach",
    "donate canned food",
  ];

  const state = {
    screen: "home",
    moduleId: null,
    step: 0,
    score: 0,
    perfect: 0,
    answered: 0,
    total: 0,
    misses: [],
    sound: true,
    teacher: false,
    showHelp: false,
    confirmReset: false,
    play: {},
    lastPassage: null,
    showPassage: false,
    library: [],
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      state.progress = saved.progress || {};
      state.sound = saved.sound !== false;
      state.teacher = saved.teacher === true;
    } catch (err) {
      state.progress = {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        progress: state.progress,
        sound: state.sound,
        teacher: state.teacher,
      }));
    } catch (err) {
      /* private mode can block storage */
    }
  }

  function hasZh(text) {
    return /[\u4e00-\u9fff]/.test(String(text || ""));
  }

  function langAttr(text) {
    return hasZh(text) ? ` lang="zh-Hant"` : "";
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function photoHtml(name) {
    const src = PHOTOS[name];
    if (!src) return "";
    return `<img class="vocab-photo" src="${esc(src)}" alt="">`;
  }

  function moduleById(id) {
    return content.modules.find((mod) => mod.id === id);
  }

  function currentModule() {
    return moduleById(state.moduleId);
  }

  function currentStep() {
    const mod = currentModule();
    return mod ? mod.steps[state.step] : null;
  }

  function countItems(step) {
    if (!step) return 0;
    if (step.kind === "mcq") return 1;
    if (step.kind === "iconHunt") return step.items.length;
    if (step.kind === "bank") return step.items.length;
    if (step.kind === "builder") return step.items.length;
    if (step.kind === "pictureMatch") return step.items.length;
    if (step.kind === "order") return 1;
    if (step.kind === "write") return 1;
    return 0;
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function stars(n) {
    return [1, 2, 3].map((i) => `<span class="${i <= n ? "" : "off"}">★</span>`).join("");
  }

  function beep(freq, dur, type) {
    if (!state.sound) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!beep.ctx) beep.ctx = new AudioCtx();
    const ctx = beep.ctx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  }

  function cheer() {
    beep(523, 0.12);
    setTimeout(() => beep(659, 0.12), 90);
    setTimeout(() => beep(784, 0.16), 180);
  }

  function buzz() {
    beep(196, 0.18, "triangle");
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    const colors = ["#e23b6a", "#ffd15c", "#1f7aed", "#0e8f7a", "#e07a2f", "#6c4ed4"];
    for (let i = 0; i < 28; i += 1) {
      const bit = document.createElement("i");
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * 0.2}s`;
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1000);
  }

  function initPlay(step) {
    const play = {
      forStep: state.step,
      tries: {},
      disabled: {},
      i: 0,
      checks: 0,
      selected: null,
      slots: {},
      done: {},
      message: null,
      draft: "",
    };
    if (step.kind === "mcq") play.options = shuffle(step.options);
    if (step.kind === "iconHunt") play.order = shuffle(step.items.map((_, index) => index));
    if (step.kind === "builder") {
      step.items.forEach((item) => {
        play.slots[`${item.id}:left`] = null;
        play.slots[`${item.id}:right`] = null;
      });
    }
    if (step.kind === "bank") {
      play.chips = shuffle(step.bank.map((word, index) => ({ id: String(index), word })));
      play.usedChips = {};
    }
    if (step.kind === "pictureMatch") {
      play.order = shuffle(step.items.map((_, index) => index));
      play.used = {};
    }
    if (step.kind === "order") {
      play.order = shuffle(step.items.map((_, index) => index));
      play.picked = [];
      play.clean = true;
    }
    if (step.kind === "read") {
      state.library = (state.library || []).concat(step);
      state.lastPassage = step;
    }
    state.play = play;
    state.showPassage = false;
  }

  function startModule(id) {
    const mod = moduleById(id);
    state.screen = "play";
    state.moduleId = id;
    state.step = 0;
    state.score = 0;
    state.perfect = 0;
    state.answered = 0;
    state.misses = [];
    state.total = mod.steps.reduce((sum, step) => sum + countItems(step), 0);
    state.play = {};
    state.showHelp = false;
    state.lastPassage = null;
    state.library = [];
    render(true);
  }

  function finishModule() {
    const ratio = state.total ? state.perfect / state.total : 1;
    const earned = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : 1;
    const prev = state.progress[state.moduleId] || { stars: 0, score: 0 };
    state.progress[state.moduleId] = {
      stars: Math.max(prev.stars, earned),
      score: Math.max(prev.score, state.score),
    };
    save();
    state.screen = "result";
    state.earned = earned;
    if (earned >= 2) confetti();
    cheer();
    render(true);
  }

  function nextStep() {
    const mod = currentModule();
    if (state.step + 1 >= mod.steps.length) {
      finishModule();
      return;
    }
    state.step += 1;
    state.play = {};
    render(true);
  }

  function record(okFirst, question, answer, why) {
    state.answered += 1;
    if (okFirst) {
      state.perfect += 1;
      state.score += 10;
      cheer();
    } else {
      state.score += 4;
      state.misses.push({ q: question, a: answer, why: why || "" });
      buzz();
    }
  }

  function feedback(ok, text) {
    if (state.play) state.play.message = { ok, text };
    const node = document.getElementById("feedback");
    if (!node) return;
    node.className = `feedback ${ok ? "good" : "bad"}`;
    node.lang = hasZh(text) ? "zh-Hant" : "en";
    node.textContent = text;
  }

  let suppressClick = false;

  function render(scroll) {
    const step = state.screen === "play" ? currentStep() : null;
    if (step && state.play.forStep !== state.step) initPlay(step);
    app.innerHTML = shell(step);
    if (scroll) {
      const main = document.querySelector(".main");
      if (main) main.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    wireDrag();
  }

  function shell(step) {
    return `${topbar()}${state.screen === "home" ? home() : ""}${state.screen === "play" ? play(step) : ""}${state.screen === "result" ? result() : ""}`;
  }

  function topbar() {
    const mod = currentModule();
    const title = mod && state.screen !== "home"
      ? `<h1>${esc(mod.zh)} · ${esc(mod.en)}</h1><p>${state.answered}/${state.total} · ${state.score} pts</p>`
      : `<h1>Peter · Ch4</h1><p>Reading &amp; Writing</p>`;
    const homeBtn = state.screen === "home"
      ? ""
      : `<button class="icon-btn" data-action="home" aria-label="回主頁">主頁</button>`;
    return `<header class="topbar"><div class="brand"><div class="brand-mark" aria-hidden="true">${BRAND}</div><div>${title}</div></div><div class="spacer"></div>${homeBtn}<button class="icon-btn" data-action="sound" aria-pressed="${state.sound ? "true" : "false"}" aria-label="${state.sound ? "音效開" : "音效關"}">音效</button></header>`;
  }

  function teacherButton() {
    return `<button class="text-btn" data-action="teacher" aria-pressed="${state.teacher ? "true" : "false"}">${state.teacher ? "關閉教師模式" : "教師模式"}</button>`;
  }

  function teacherNote() {
    if (!state.teacher) return "";
    return `<p class="help" lang="zh-Hant">教師模式已開。範例／教師用答案會顯示。學生平常請關閉。</p>`;
  }

  function home() {
    const cards = content.modules.map((mod, index) => {
      const saved = state.progress[mod.id];
      const n = saved ? saved.stars : 0;
      return `<button class="quest" data-action="open" data-module="${esc(mod.id)}">
        <span class="quest-index" style="background:${esc(mod.hue)}">${index + 1}</span>
        <span>
          <h3>${esc(mod.zh)} <span class="en">${esc(mod.en)}</span></h3>
          <p class="blurb">${esc(mod.blurb)}</p>
          <div class="stars" aria-label="${n} stars">${stars(n)} ${n ? "" : `<span class="gloss">未玩過</span>`}</div>
        </span>
      </button>`;
    }).join("");
    const minis = ["go on a charity walk", "sell flags", "visit the elderly", "clean the beach", "donate canned food"].map((name) => `<span class="mini-ico">${photoHtml(name)}</span>`).join("");
    const reset = state.confirmReset
      ? `<button class="text-btn" data-action="reset-yes">確定清除</button>`
      : `<button class="text-btn" data-action="reset">清除星星</button>`;
    return `<div class="main"><section class="hero">
      <p class="kicker">P6-Peter-Leap-Ch4</p>
      <h2>${esc(content.title)}</h2>
      <p>${esc(content.subtitle)}</p>
      <p class="motto">${esc(content.motto)}</p>
      <p class="hero-note">${esc(content.hub)}</p>
      <div class="mascot-row">${minis}</div>
    </section>
    ${teacherNote()}
    <div class="map">${cards}</div>
    <div class="row">${teacherButton()}${reset}</div>
    <p class="footer-note">Book 6A Chapter 4 · We can make a difference! · You can make a difference!</p>
    </div>`;
  }

  function play(step) {
    const mod = currentModule();
    const pct = state.total ? Math.round((state.answered / state.total) * 100) : 0;
    const help = state.showHelp ? `<div class="help" lang="zh-Hant">${esc(mod.help)}</div>` : "";
    const canLook = step.kind !== "read" && state.library && state.library.length;
    const passage = state.showPassage && canLook
      ? state.library.map((entry) => `<section class="panel look"><p class="kicker">${esc(entry.section || entry.title || "")}</p>${passageHtml(entry)}</section>`).join("")
      : "";
    const note = state.play.message;
    const banked = step.kind === "bank";
    return `<div class="main${banked ? " has-bank" : ""}">
      <div class="progress" aria-hidden="true"><div style="width:${pct}%"></div></div>
      <div class="row" style="margin-top:0"><button class="text-btn" data-action="help">${state.showHelp ? "收起提示" : "提示"}</button>
      ${canLook ? `<button class="text-btn" data-action="passage">${state.showPassage ? "收起文章" : "看文章"}</button>` : ""}
      ${teacherButton()}</div>
      ${teacherNote()}${help}${passage}
      ${renderStep(step)}
      ${teacherBox(step)}
      <p id="feedback" class="feedback ${note ? (note.ok ? "good" : "bad") : ""}"${note ? langAttr(note.text) : ""} aria-live="polite">${note ? esc(note.text) : ""}</p>
    </div>${step.kind === "bank" ? bankHtml(step) : ""}`;
  }

  function teacherBox(step) {
    if (!state.teacher || !step) return "";
    if (step.kind === "teach" || step.kind === "read" || step.kind === "write") return "";
    let text = "";
    if (step.kind === "mcq") text = step.answer || "";
    else if (step.kind === "iconHunt") {
      const item = step.items[state.play.order[state.play.i]];
      text = item ? item.answer : "";
    } else if (step.kind === "pictureMatch") {
      const item = step.items[state.play.order[state.play.i]];
      if (!item) return "";
      const pic = (step.pictures || []).find((entry) => entry.id === item.answer);
      text = `${item.answer}${pic ? ` · ${pic.label}` : ""}`;
    } else if (step.kind === "bank") {
      text = step.items.map((item) => `${item.before} ${item.answer} ${item.after}`).join("\n");
    } else if (step.kind === "builder") {
      const item = step.items[state.play.i];
      text = item ? item.full : "";
    } else if (step.kind === "order") {
      text = step.items.map((line, index) => `${index + 1}. ${line}`).join("\n");
    }
    if (!text) return "";
    return `<div class="why teacher-key"><p class="kicker">範例／教師用</p><p class="sample">${esc(text)}</p></div>`;
  }

  function renderStep(step) {
    if (step.kind === "teach") return teachHtml(step);
    if (step.kind === "mcq") return mcqHtml(step);
    if (step.kind === "iconHunt") return iconHuntHtml(step);
    if (step.kind === "bank") return bankStoryHtml(step);
    if (step.kind === "builder") return builderHtml(step);
    if (step.kind === "read") return readHtml(step);
    if (step.kind === "pictureMatch") return pictureMatchHtml(step);
    if (step.kind === "order") return orderHtml(step);
    if (step.kind === "write") return writeHtml(step);
    return "";
  }

  function teachHtml(step) {
    let body = `<p${langAttr(step.body)}>${esc(step.body || "")}</p>`;
    if (step.glossLine) body += `<p lang="zh-Hant"><strong>${esc(step.glossLine)}</strong></p>`;
    if (step.example) body += `<p class="why">${esc(step.example)}</p>`;
    if (step.cards) {
      body += `<div class="card-grid">${step.cards.map((name) => `<button class="word-card" data-action="speak" data-word="${esc(name)}">${photoHtml(name)}<strong>${esc(name)}</strong><span class="gloss" lang="zh-Hant">${esc(content.gloss[name] || "")}</span><span class="gloss">讀音</span></button>`).join("")}</div>`;
    }
    if (step.lines) {
      body += `<ul class="miss-list">${step.lines.map((line) => `<li${langAttr(line)}>${esc(line)}</li>`).join("")}</ul>`;
    }
    const last = state.step + 1 >= currentModule().steps.length;
    return `<section class="panel"><p class="kicker">學一學</p><h2 class="step-title"${langAttr(step.title)}>${esc(step.title || "學一學")}</h2>${body}<button class="big-go" data-action="next">${last ? "完成" : "開始"}</button></section>`;
  }

  function readHtml(step) {
    const note = step.note ? `<p lang="zh-Hant">${esc(step.note)}</p>` : "";
    return `<section class="panel"><p class="kicker">${esc(step.title)}</p><h2 class="step-title">${esc(step.section)}</h2>${note}<div class="passage">${passageHtml(step)}</div><button class="big-go" data-action="next">我讀好了</button></section>`;
  }

  function passageHtml(step) {
    const paras = (step.paragraphs || []).map((parts) => {
      const html = parts.map((part) => part.em ? `<span class="em">${esc(part.t)}</span>` : esc(part.t)).join("");
      return `<p>${html}</p>`;
    }).join("");
    return paras;
  }

  function mcqHtml(step) {
    const options = state.play.options || step.options;
    const buttons = options.map((option) => {
      const off = state.play.disabled[option] ? "disabled" : "";
      return `<button class="choice" data-action="mcq" data-option="${esc(option)}" ${off}>${esc(option)}</button>`;
    }).join("");
    const why = state.play.revealed ? `<div class="why"${langAttr(step.why)}>${esc(step.why || "")}</div><button class="big-go" data-action="next">下一題</button>` : "";
    return `<section class="panel"><p class="kicker">選擇題</p><h2 class="step-title"${langAttr(step.q)}>${esc(step.q)}</h2><div class="choices">${buttons}</div>${why}</section>`;
  }

  function iconHuntHtml(step) {
    const item = step.items[state.play.order[state.play.i]];
    const names = step.pool || PHOTO_ORDER;
    const buttons = names.map((name) => `<button class="icon-pick" data-action="hunt" data-id="${esc(name)}">${photoHtml(name)}<strong>${esc(name)}</strong></button>`).join("");
    return `<section class="panel"><p class="kicker">${esc(step.title)} · ${state.play.i + 1}/${step.items.length}</p><p class="prompt-word" lang="zh-Hant">${esc(item.say)}</p><div class="icon-grid">${buttons}</div></section>`;
  }

  function bankStoryHtml(step) {
    const bits = step.items.map((item) => {
      const filled = state.play.slots[item.id];
      const locked = state.play.done[item.id];
      const cls = locked ? "blank is-locked" : state.play.selected ? "blank is-armed" : "blank";
      const label = filled || "______";
      return `<p class="story-bit">${esc(item.before)} <button type="button" class="${cls}" data-action="blank" data-id="${esc(item.id)}" ${locked ? "disabled" : ""}>${esc(label)}</button> ${esc(item.after)}</p>`;
    }).join("");
    const done = step.items.every((item) => state.play.done[item.id]);
    return `<section class="panel"><p class="kicker">${esc(step.title)}</p><p${langAttr(step.intro)}>${esc(step.intro || "")}</p>${bits}${done ? `<button class="big-go" data-action="next">下一題</button>` : `<p class="gloss">點選下面的字，再點空格。也可以拖過去。</p>`}</section>`;
  }

  function builderChips(step) {
    const item = step.items[state.play.i];
    if (state.play.chipFor !== item.id) {
      state.play.chipFor = item.id;
      state.play.itemChips = shuffle([item.left, item.right, ...(item.traps || step.distractors || [])]);
      state.play.selected = null;
      state.play.checks = 0;
      state.play.revealed = false;
    }
    return state.play.itemChips;
  }

  function builderHtml(step) {
    const item = step.items[state.play.i];
    const left = state.play.slots[`${item.id}:left`];
    const right = state.play.slots[`${item.id}:right`];
    const chips = builderChips(step).map((word) => {
      const used = word === left || word === right;
      const selected = state.play.selected === word ? "is-selected" : "";
      return `<button class="chip ${selected}" data-action="chip" data-word="${esc(word)}" ${used ? "disabled" : ""}>${esc(word)}</button>`;
    }).join("");
    const ready = left && right;
    const revealed = state.play.revealed
      ? `<div class="why"><p>${esc(item.full)}</p><p${langAttr(step.why)}>${esc(step.why || "")}</p></div><button class="big-go" data-action="next-builder">${state.play.i + 1 >= step.items.length ? "繼續" : "下一句"}</button>`
      : "";
    const scene = item.scene ? `<div class="scene-art">${photoHtml(item.scene)}</div>` : "";
    return `<section class="panel"><p class="kicker">${esc(step.kicker || "either … or")} · ${state.play.i + 1}/${step.items.length}</p><h2 class="step-title"${langAttr(step.title)}>${esc(step.title)}</h2><p${langAttr(step.lead)}>${esc(step.lead || "")}</p>
      <div class="builder-card"><p class="kicker">${esc(item.label)}</p>${item.note ? `<p lang="zh-Hant">${esc(item.note)}</p>` : ""}${scene}
        <span class="since-word">We can either</span>
        <button type="button" class="blank ${left ? "is-locked" : "is-armed"}" data-action="slot" data-slot="${esc(item.id)}:left"><span class="slot-label">選擇 A</span>${esc(left || "點選活動")}</button>
        <span class="since-word">or</span>
        <button type="button" class="blank ${right ? "is-locked" : "is-armed"}" data-action="slot" data-slot="${esc(item.id)}:right"><span class="slot-label">選擇 B</span>${esc(right || "點選活動")}</button>
      </div>
      <div class="bank-tray">${chips}</div>
      ${ready && !state.play.revealed ? `<button class="big-go" data-action="check-builder">檢查</button>` : ""}
      ${revealed}</section>`;
  }

  function bankHtml(step) {
    const chips = (state.play.chips || []).map((chip) => {
      const used = !!state.play.usedChips[chip.id];
      const selected = state.play.selected === chip.id ? "is-selected" : "";
      return `<button class="chip ${selected}" data-action="chip" data-chip="${esc(chip.id)}" data-word="${esc(chip.word)}" ${used ? "disabled" : ""}>${esc(chip.word)}</button>`;
    }).join("");
    return `<div class="bank"><div class="bank-tray">${chips}</div></div>`;
  }

  function pictureMatchHtml(step) {
    const item = step.items[state.play.order[state.play.i]];
    const buttons = step.pictures.map((pic) => {
      const used = state.play.used[pic.id] ? "disabled" : "";
      return `<button class="icon-pick" data-action="pic" data-id="${esc(pic.id)}" ${used}>${photoHtml(pic.icon)}<strong>${esc(pic.id)}</strong></button>`;
    }).join("");
    const intro = step.intro ? `<p lang="zh-Hant">${esc(step.intro)}</p>` : "";
    return `<section class="panel"><p class="kicker">${esc(step.title)} · ${state.play.i + 1}/${step.items.length}</p>${intro}<p class="sentence">${esc(item.sentence)}</p><div class="icon-grid">${buttons}</div></section>`;
  }

  function orderHtml(step) {
    const picked = state.play.picked || [];
    const doneBits = picked.map((index, n) => `<p>${n + 1}. ${esc(step.items[index])}</p>`).join("");
    const remain = (state.play.order || []).filter((index) => !picked.includes(index)).map((index) => `<button class="choice" data-action="order" data-index="${index}">${esc(step.items[index])}</button>`).join("");
    const intro = step.intro ? `<p lang="zh-Hant">${esc(step.intro)}</p>` : "";
    const next = state.play.revealed ? `<button class="big-go" data-action="next">下一題</button>` : "";
    return `<section class="panel"><p class="kicker">${esc(step.title)}</p>${intro}<div class="order-done">${doneBits}</div><div class="choices">${state.play.revealed ? "" : remain}</div>${next}</section>`;
  }

  function letterChecks(text) {
    const hasDate = /\b\d{1,2}(st|nd|rd|th)?\s+[A-Za-z]+|\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(text);
    const hasDear = /\bDear\s+[A-Z]/i.test(text);
    const hasPolite = /we would like to|we hope you will/i.test(text);
    const hasCause = /rais(e|ing) money|fundraising|victims|homeless|flood|elderly|hospital|nepal|africa|thailand/i.test(text);
    const hasActivity = /talent show|second-hand|stall|flags|concert|sale|charity walk|raffle|visit the/i.test(text);
    const hasClose = /yours sincerely|yours faithfully/i.test(text);
    const rude = /\bhi\b|lots of love|best wishes|\blet's\b|we want you to/i.test(text);
    return [
      { ok: hasDate, label: "有日期" },
      { ok: hasDear, label: "有 Dear 正式稱謂" },
      { ok: hasPolite, label: "有 We would like to 或 We hope you will" },
      { ok: hasCause, label: "有籌款目的或幫助對象" },
      { ok: hasActivity, label: "有活動細節" },
      { ok: hasClose, label: "結尾是 Yours sincerely 或 Yours faithfully" },
      { ok: !rude, label: "沒有 Hi、Lots of love 或 Let's 命令校長" },
    ];
  }

  function writeHtml(step) {
    const text = state.play.draft || "";
    const submitted = !!state.play.revealed;
    const showSamples = submitted || state.teacher;
    const rules = (step.rules || []).map((rule) => `<li lang="zh-Hant">${esc(rule)}</li>`).join("");
    const checks = submitted
      ? `<ul class="check-list">${(state.play.checkList || []).map((item) => `<li class="${item.ok ? "ok" : "no"}" lang="zh-Hant">${item.ok ? "✓" : "✗"} ${esc(item.label)}</li>`).join("")}</ul>`
      : "";
    const samples = showSamples
      ? `<div class="why teacher-key"><p class="kicker">範例／教師用</p>${(step.samples || []).map((sample) => `<p lang="zh-Hant"><strong>${esc(sample.name)}</strong></p><p class="sample">${esc(sample.text)}</p>`).join("")}${(step.rubric || []).length ? `<ul class="miss-list">${step.rubric.map((line) => `<li lang="zh-Hant">${esc(line)}</li>`).join("")}</ul>` : ""}</div>`
      : `<p class="gloss" lang="zh-Hant">範例答案會在你交卷之後，或開啟教師模式才顯示。</p>`;
    const next = submitted
      ? `<button class="big-go" data-action="next">下一題</button>`
      : `<button class="big-go" data-action="submit-write">交卷並自我檢查</button>`;
    return `<section class="panel"><p class="kicker">正式信</p><h2 class="step-title"${langAttr(step.title)}>${esc(step.title)}</h2><p lang="zh-Hant">${esc(step.prompt || "")}</p><p class="sentence">${esc(step.question || "")}</p><ul class="miss-list">${rules}</ul><textarea class="write-box" rows="12" placeholder="在這裡寫一封正式英文信。" ${submitted ? "readonly" : ""}>${esc(text)}</textarea>${checks}${samples}${next}</section>`;
  }

  function result() {
    const mod = currentModule();
    const ids = content.modules.map((item) => item.id);
    const nextId = ids[ids.indexOf(mod.id) + 1];
    const misses = state.misses.length
      ? `<h3>再看一眼</h3><ul class="miss-list">${state.misses.slice(0, 8).map((miss) => `<li><strong>${esc(miss.q)}</strong><br>答案：${esc(miss.a)}${miss.why ? `<br><span class="gloss">${esc(miss.why)}</span>` : ""}</li>`).join("")}</ul>`
      : `<p>全部一次過！太棒了！</p>`;
    const all = content.modules.every((item) => (state.progress[item.id] || {}).stars > 0);
    return `<div class="main"><section class="panel">
      <p class="kicker">${esc(mod.zh)}完成</p>
      <h2 class="step-title">${state.earned === 3 ? "三星！" : state.earned === 2 ? "兩星，好厲害！" : "過關！再玩可以拿更多星。"}</h2>
      <div class="score-stars" aria-label="${state.earned} stars">${stars(state.earned)}</div>
      <p>${state.perfect}/${state.total} 題第一次就對 · ${state.score} 分</p>
      ${misses}
      ${all ? `<div class="why"><strong>You can make a difference!</strong><p lang="zh-Hant">五關都玩過了。慈善工作、either / neither / shall we，小孩也可以帶來改變。</p></div>` : ""}
      <div class="row">
        <button class="big-go" data-action="replay">再玩一次</button>
        ${nextId ? `<button class="text-btn" data-action="open" data-module="${esc(nextId)}">下一關</button>` : ""}
        <button class="text-btn" data-action="home">回主頁</button>
      </div>
    </section></div>`;
  }

  function onMcq(option, button) {
    const step = currentStep();
    if (state.play.revealed) return;
    if (option === step.answer) {
      button.classList.add("is-right");
      const first = Object.keys(state.play.disabled).length === 0;
      record(first, step.q, step.answer, step.why);
      state.play.revealed = true;
      render(false);
      feedback(true, first ? "太棒了！" : "今次對了！");
    } else {
      state.play.disabled[option] = true;
      button.classList.add("is-wrong");
      buzz();
      feedback(false, "再試一次～");
      setTimeout(() => render(false), 280);
    }
  }

  function onHunt(id, button) {
    const step = currentStep();
    const index = state.play.order[state.play.i];
    const item = step.items[index];
    const answer = item.answer;
    if (state.play.locked) return;
    if (id === answer) {
      button.classList.add("is-right");
      const key = `icon:${index}`;
      const first = !state.play.tries[key];
      record(first, item.say || item.q, answer, item.why);
      state.play.locked = true;
      const gloss = content.gloss[answer] ? ` ${content.gloss[answer]}` : "";
      feedback(true, `${first ? "好眼力！" : "對了！"} ${answer}${gloss}`);
      setTimeout(() => {
        state.play.locked = false;
        if (state.play.i + 1 >= step.items.length) nextStep();
        else {
          state.play.i += 1;
          render(false);
        }
      }, 650);
    } else {
      const key = `icon:${index}`;
      state.play.tries[key] = (state.play.tries[key] || 0) + 1;
      button.classList.add("is-wrong");
      buzz();
      feedback(false, "再看看圖。");
      setTimeout(() => button.classList.remove("is-wrong"), 350);
    }
  }

  function onPic(id, button) {
    const step = currentStep();
    if (state.play.locked) return;
    const index = state.play.order[state.play.i];
    const item = step.items[index];
    if (state.play.used[id]) {
      feedback(false, "這張圖已經配對過了。");
      return;
    }
    if (id === item.answer) {
      button.classList.add("is-right");
      const key = `pic:${index}`;
      const first = !state.play.tries[key];
      const pic = step.pictures.find((entry) => entry.id === id);
      record(first, item.sentence, `${id} · ${pic ? pic.label : id}`, item.why);
      state.play.used[id] = true;
      state.play.locked = true;
      feedback(true, `${first ? "配對正確！" : "今次對了！"} ${id} · ${pic ? pic.label : ""}`);
      setTimeout(() => {
        state.play.locked = false;
        if (state.play.i + 1 >= step.items.length) nextStep();
        else {
          state.play.i += 1;
          render(false);
        }
      }, 700);
    } else {
      const key = `pic:${index}`;
      state.play.tries[key] = (state.play.tries[key] || 0) + 1;
      button.classList.add("is-wrong");
      buzz();
      feedback(false, state.play.tries[key] >= 2 && item.why ? item.why : "再看看圖。");
      setTimeout(() => button.classList.remove("is-wrong"), 350);
    }
  }

  function onOrder(index, button) {
    const step = currentStep();
    if (state.play.revealed) return;
    const expect = (state.play.picked || []).length;
    if (index === expect) {
      state.play.picked.push(index);
      if (state.play.picked.length === step.items.length) {
        record(state.play.clean !== false, step.title, step.items.join(" → "), step.why || "");
        state.play.revealed = true;
        render(false);
        feedback(true, state.play.clean !== false ? "次序完全正確！" : "次序排好了。");
      } else {
        render(false);
        feedback(true, "對，下一個。");
      }
      return;
    }
    state.play.clean = false;
    state.play.tries.order = (state.play.tries.order || 0) + 1;
    if (button) {
      button.classList.add("is-wrong");
      setTimeout(() => button.classList.remove("is-wrong"), 350);
    }
    buzz();
    feedback(false, state.play.tries.order >= 2 && step.hint ? step.hint : "還不是這個。");
  }

  function placeBank(chipId, blankId) {
    const step = currentStep();
    const chip = (state.play.chips || []).find((entry) => entry.id === chipId);
    if (!chip || state.play.usedChips[chipId]) return;
    const word = chip.word;
    const item = step.items.find((entry) => entry.id === blankId);
    if (!item || state.play.done[item.id]) return;
    if (word === item.answer) {
      const first = !state.play.tries[item.id];
      state.play.usedChips[chipId] = blankId;
      state.play.slots[item.id] = word;
      state.play.done[item.id] = true;
      state.play.selected = null;
      record(first, `${item.before} ______ ${item.after}`, item.answer, item.hint);
      render(false);
      feedback(true, first ? "放對了！" : "今次對了！");
    } else {
      state.play.tries[item.id] = (state.play.tries[item.id] || 0) + 1;
      const blank = document.querySelector(`[data-action="blank"][data-id="${CSS.escape(item.id)}"]`);
      if (blank) {
        blank.classList.add("is-wrong");
        setTimeout(() => blank.classList.remove("is-wrong"), 350);
      }
      buzz();
      if (state.play.tries[item.id] >= 2) feedback(false, item.hint);
      else feedback(false, "再試一次。這個字不是這裡。");
      if (state.play.tries[item.id] >= 3) {
        const match = (state.play.chips || []).find((entry) => entry.word === item.answer && !state.play.usedChips[entry.id]);
        if (match) state.play.usedChips[match.id] = item.id;
        state.play.slots[item.id] = item.answer;
        state.play.done[item.id] = true;
        state.play.selected = null;
        record(false, `${item.before} ______ ${item.after}`, item.answer, item.hint);
        render(false);
        feedback(false, `答案是 ${item.answer}。${item.hint}`);
      }
    }
  }

  function placeSlot(word, slotId) {
    if (!slotId || state.play.revealed) return;
    const previous = Object.keys(state.play.slots).find((key) => state.play.slots[key] === word);
    if (previous) state.play.slots[previous] = null;
    state.play.slots[slotId] = word;
    state.play.selected = null;
    render(false);
  }

  function checkBuilder() {
    const step = currentStep();
    const item = step.items[state.play.i];
    const wrong = state.play.slots[`${item.id}:left`] !== item.left
      || state.play.slots[`${item.id}:right`] !== item.right;
    state.play.checks += 1;
    if (!wrong) {
      record(state.play.checks === 1, item.label, item.full, step.why);
      state.play.revealed = true;
      render(false);
      feedback(true, "句子組好了！");
      return;
    }
    buzz();
    if (state.play.checks >= 3) {
      state.play.slots[`${item.id}:left`] = item.left;
      state.play.slots[`${item.id}:right`] = item.right;
      record(false, item.label, item.full, step.why);
      state.play.revealed = true;
      render(false);
      feedback(false, "看看正確句子。");
      return;
    }
    feedback(false, state.play.checks === 1 ? "有格子放錯了。either 後面先放第一個活動，or 後面放另一個。" : step.why);
  }

  function onSubmitWrite() {
    const step = currentStep();
    if (state.play.revealed) return;
    const box = document.querySelector("textarea.write-box");
    if (box) state.play.draft = box.value;
    const text = (state.play.draft || "").trim();
    if (!text) {
      feedback(false, "請先寫一封英文信。");
      return;
    }
    const checks = letterChecks(text);
    const ok = checks.every((item) => item.ok);
    state.play.checkList = checks;
    state.play.revealed = true;
    record(ok, step.title, ok ? "formal letter" : "對照範例：要有日期、Dear、有禮用語、籌款目的、活動，以及 Yours sincerely 或 Yours faithfully。", step.prompt);
    render(false);
    feedback(ok, ok ? "正式信的要點齊了，可以對照範例。" : "已交卷。對照清單，再看教師範例。");
  }

  function wireDrag() {
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("pointerdown", (event) => {
        if (chip.disabled) return;
        chip.setPointerCapture(event.pointerId);
        const word = chip.dataset.word;
        const chipId = chip.dataset.chip;
        let moved = false;
        const ghost = document.createElement("div");
        ghost.className = "ghost-chip";
        ghost.textContent = word;
        const move = (ev) => {
          if (Math.abs(ev.clientX - event.clientX) + Math.abs(ev.clientY - event.clientY) > 12) {
            moved = true;
            if (!ghost.parentNode) document.body.appendChild(ghost);
          }
          ghost.style.left = `${ev.clientX}px`;
          ghost.style.top = `${ev.clientY}px`;
        };
        const up = (ev) => {
          ghost.remove();
          chip.removeEventListener("pointermove", move);
          chip.removeEventListener("pointerup", up);
          if (!moved) return;
          suppressClick = true;
          setTimeout(() => { suppressClick = false; }, 500);
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const blank = el && el.closest("[data-action='blank']");
          const slot = el && el.closest("[data-action='slot']");
          if (blank && chipId) placeBank(chipId, blank.dataset.id);
          else if (slot) placeSlot(word, slot.dataset.slot);
        };
        chip.addEventListener("pointermove", move);
        chip.addEventListener("pointerup", up);
      });
    });
  }

  app.addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === "sound") {
      state.sound = !state.sound;
      save();
      render(false);
      return;
    }
    if (action === "teacher") {
      state.teacher = !state.teacher;
      save();
      render(false);
      return;
    }
    if (action === "home") {
      state.screen = "home";
      state.moduleId = null;
      render(true);
      return;
    }
    if (action === "open") {
      startModule(button.dataset.module);
      return;
    }
    if (action === "help") {
      state.showHelp = !state.showHelp;
      render(false);
      return;
    }
    if (action === "passage") {
      state.showPassage = !state.showPassage;
      render(false);
      return;
    }
    if (action === "speak") {
      speak(button.dataset.word);
      return;
    }
    if (action === "next") {
      nextStep();
      return;
    }
    if (action === "replay") {
      startModule(state.moduleId);
      return;
    }
    if (action === "reset") {
      state.confirmReset = true;
      render(false);
      return;
    }
    if (action === "reset-yes") {
      state.progress = {};
      state.confirmReset = false;
      save();
      render(false);
      return;
    }
    if (action === "mcq") {
      onMcq(button.dataset.option, button);
      return;
    }
    if (action === "hunt") {
      onHunt(button.dataset.id, button);
      return;
    }
    if (action === "pic") {
      onPic(button.dataset.id, button);
      return;
    }
    if (action === "order") {
      onOrder(Number(button.dataset.index), button);
      return;
    }
    if (action === "chip") {
      const token = button.dataset.chip || button.dataset.word;
      state.play.selected = state.play.selected === token ? null : token;
      render(false);
      return;
    }
    if (action === "blank") {
      if (!state.play.selected) {
        feedback(false, "先點下面的字。");
        return;
      }
      placeBank(state.play.selected, button.dataset.id);
      return;
    }
    if (action === "slot") {
      if (!state.play.selected) {
        if (state.play.slots[button.dataset.slot]) {
          state.play.slots[button.dataset.slot] = null;
          render(false);
        } else feedback(false, "先點下面的片語。");
        return;
      }
      placeSlot(state.play.selected, button.dataset.slot);
      return;
    }
    if (action === "check-builder") {
      checkBuilder();
      return;
    }
    if (action === "next-builder") {
      const step = currentStep();
      if (state.play.i + 1 >= step.items.length) nextStep();
      else {
        state.play.i += 1;
        state.play.chipFor = null;
        state.play.message = null;
        render(true);
      }
      return;
    }
    if (action === "submit-write") {
      onSubmitWrite();
    }
  });

  app.addEventListener("input", (event) => {
    const box = event.target.closest("textarea.write-box");
    if (!box || !state.play) return;
    state.play.draft = box.value;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  load();
  render(true);
})();
