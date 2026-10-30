const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/content.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const content = sandbox.P6_CONTENT;

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

assert(content.title === "Peter · Reading & Writing Ch4", "title");
assert(content.subtitle === "We can make a difference!", "subtitle");
assert(content.motto === "You can make a difference!", "motto");
assert(content.hub.includes("Sunnyside"), "hub names the newsletter");
assert(content.hub.includes("Helping Hand"), "hub names the notices");

const ids = content.modules.map((mod) => mod.id);
assert(ids.join() === "vocab,grammar,play,book,letter", "module order");
assert(!ids.includes("write"), "letter station is not named write");

const hues = {
  vocab: "#e23b6a",
  grammar: "#0e8f7a",
  play: "#6c4ed4",
  book: "#1f7aed",
  letter: "#e07a2f",
};
content.modules.forEach((mod) => {
  assert(mod.hue === hues[mod.id], `${mod.id} hue`);
  assert(/[\u4e00-\u9fff]/.test(mod.help), `${mod.id} help is Chinese`);
  assert(mod.zh && mod.en, `${mod.id} labels`);
});

const neverAnswer = [
  "natural disasters",
  "earthquake",
  "drought",
  "tsunami",
  "aftershocks",
  "volcanic eruption",
  "since",
  "too",
  "enough",
  "too little",
  "not enough",
  "plates",
  "Hide under a strong table.",
  "because",
];

function walk(step, visit) {
  if (step.kind === "mcq") visit(step.answer, step.options, step.q);
  if (step.items && step.kind !== "teach" && step.kind !== "order") {
    step.items.forEach((item) => {
      if (item.answer) {
        visit(item.answer, item.options || (step.kind === "bank" ? step.bank : null), item.q || item.before || item.say || item.sentence || item.id);
      }
    });
  }
  if (step.kind === "builder") {
    step.items.forEach((item) => visit(item.full, null, item.id));
  }
  if (step.kind === "order") visit(step.items.join(" → "), null, step.title);
}

const answers = [];
content.modules.forEach((mod) => {
  mod.steps.forEach((step) => {
    if (step.kind === "mcq") {
      assert(/[\u4e00-\u9fff]/.test(step.q), `question Chinese: ${step.q}`);
      assert(/[\u4e00-\u9fff]/.test(step.why), `why Chinese: ${step.q}`);
      assert(!/[\u4e00-\u9fff]/.test(step.answer), `answer English: ${step.q}`);
      assert(step.options.includes(step.answer), `mcq option missing: ${step.q}`);
    }
    if (step.kind === "bank") {
      const need = {};
      step.items.forEach((item) => {
        need[item.answer] = (need[item.answer] || 0) + 1;
      });
      const have = {};
      step.bank.forEach((word) => {
        have[word] = (have[word] || 0) + 1;
      });
      Object.entries(need).forEach(([word, count]) => {
        assert((have[word] || 0) >= count, `${mod.id} bank needs ${count} × ${word}`);
      });
    }
    walk(step, (answer, options, label) => {
      answers.push(answer);
      if (options) assert(options.includes(answer), `${mod.id} missing option for ${label}: ${answer}`);
      neverAnswer.forEach((bad) => {
        assert(answer !== bad, `${mod.id} marked a wrong answer correct: ${bad} (${label})`);
      });
    });
  });
});

const vocab = content.modules.find((mod) => mod.id === "vocab");
const iconHunt = vocab.steps.find((step) => step.kind === "iconHunt");
assert(iconHunt.items.length === 9, "icon hunt 9");
iconHunt.items.forEach((item) => {
  assert(item.say === content.gloss[item.answer], `Chinese prompt for ${item.answer}`);
  assert(/[\u4e00-\u9fff]/.test(item.say), `prompt Chinese ${item.answer}`);
  assert(!/[\u4e00-\u9fff]/.test(item.answer), `English answer ${item.answer}`);
});

const match = vocab.steps.find((step) => step.kind === "pictureMatch");
const matchMap = Object.fromEntries(match.items.map((item) => [item.answer, item.sentence]));
assert(match.items.map((item) => item.answer).join("") === "ABCDEFGHI", "picture letters A-I");
assert(new Set(match.items.map((item) => item.answer)).size === 9, "letters once");
assert(match.pictures.map((pic) => pic.icon).join("|") === [
  "go on a charity walk",
  "sell flags",
  "run a charity sale",
  "go on a charity run",
  "take part in a charity show",
  "visit the elderly",
  "run a second-hand stall",
  "clean the beach",
  "donate canned food",
].join("|"), "picture files");
match.items.forEach((item) => {
  assert(!/[\u4e00-\u9fff]/.test(item.sentence), "match sentence stays English");
  assert(/[\u4e00-\u9fff]/.test(item.why), "match why Chinese");
});
assert(matchMap.A.includes("charity walk"), "walk sentence");
assert(matchMap.I.includes("canned food"), "cans sentence");
assert(answers.includes("charity work"), "charity work");
assert(answers.includes("canned food"), "canned food");

const phraseBank = vocab.steps.find((step) => step.kind === "bank");
const phrases = Object.fromEntries(phraseBank.items.map((item) => [item.id, item.answer]));
assert(phrases.visit === "visit the elderly", "visit");
assert(phrases.flags === "sell flags", "flags");
assert(phrases.stall === "run a second-hand stall", "stall");
assert(phrases.homeless === "homeless", "homeless");
assert(phrases.clothes === "collect clothes", "clothes");
assert(phrases.organise === "organise a charity sale", "organise");
assert(phrases.run === "go on a charity run", "run");
assert(phrases.food === "donate canned food", "food");
assert(phrases.show === "take part in a charity show", "show");
assert(phrases.walk === "go on a charity walk", "walk");
assert(phrases.sale === "run a charity sale", "sale");
assert(phraseBank.bank.includes("earthquake") && phraseBank.bank.includes("drought"), "vocab traps");

const grammar = content.modules.find((mod) => mod.id === "grammar");
const structure = grammar.steps.find((step) => step.kind === "bank" && step.bank.includes("Shall we"));
const link = Object.fromEntries(structure.items.map((item) => [item.id, item.answer]));
assert(link.n1 === "Neither" && link.n2 === "nor" && link.n3 === "neither" && link.n4 === "nor", "neither table");
assert(link.e1 === "either" && link.e2 === "or" && link.s1 === "Shall we", "either and shall we");
assert(structure.bank.filter((word) => word === "nor").length === 2, "two nor chips");
assert(structure.bank.includes("since") && structure.bank.includes("too") && structure.bank.includes("enough"), "ch3 traps");
grammar.steps.forEach((step) => {
  walk(step, (answer) => {
    assert(!/^\s*(since|too|enough|too little|not enough)\s*$/i.test(String(answer)), `grammar target drifted: ${answer}`);
  });
});

const yourSay = grammar.steps.find((step) => step.kind === "bank" && step.bank.includes("visit"));
const say = Object.fromEntries(yourSay.items.map((item) => [item.id, item.answer]));
assert(say.elderly === "visit" && say.show === "organise" && say.money === "donate", "your say start");
assert(say.raffle === "sell" && say.blankets === "collect", "your say end");

const builder = grammar.steps.find((step) => step.kind === "builder");
assert(builder.items.map((item) => item.full).join(" | ") === [
  "We can either go on a charity walk or run a green stall.",
  "We can either visit the elderly or sell flags.",
  "We can either visit the homeless or take part in a charity concert.",
].join(" | "), "builder sentences");
assert(answers.includes("Shall we visit them and talk to them?"), "jessica suggestion");
assert(answers.includes("I'm afraid I don't like walking. Shall we run a green stall instead?"), "green stall instead");
assert(answers.includes("visit the homeless"), "december choice");
assert(answers.includes("Neither Kelly nor I have free time in the morning."), "verb agreement");
assert(answers.includes("Good idea."), "shall we reply");

function passageText(mod) {
  return mod.steps.filter((step) => step.kind === "read").map((step) => JSON.stringify(step.paragraphs)).join("\n");
}

const play = content.modules.find((mod) => mod.id === "play");
const playText = passageText(play);
[
  "Vivienne Harr was",
  "eight",
  "neither",
  "lemonade",
  "rain or shine",
  "US$100,000",
  "social media",
  "Lemon-aid",
  "Hailey Ford",
  "Hailey's Harvest",
  "shelters",
  "Charity Club",
  "Josh Lau",
  "donate money or time",
].forEach((bit) => assert(playText.includes(bit), `play missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(playText), "play passage stays English");
assert(!/kind heart|children don't give up|tommy|senior citizen/i.test(playText), "play is not the RW-Ch4 script");
assert(!/kids-opedia|help international|hari,/i.test(playText), "play is not chapter 3");

const playMcq = play.steps.filter((step) => step.kind === "mcq");
assert(playMcq.map((step) => step.answer).join("|") === [
  "eight",
  "work as child workers",
  "neither … nor",
  "selling lemonade",
  "sell lemonade for 365 days",
  "to tell a lot of people about something",
  "11",
  "builds shelters and grows vegetables",
  "when she was about five or six",
  "to get students to join the Charity Club",
  "False",
  "True",
  "True",
].join("|"), "play key");

const summary = play.steps.find((step) => step.kind === "bank");
const words = Object.fromEntries(summary.items.map((item) => [item.id, item.answer]));
assert(words.age === "eight" && words.drink === "lemonade" && words.home === "shelters", "summary vivienne");
assert(words.club === "Charity" && words.money === "donate" && words.link === "neither", "summary appeal");
assert(summary.bank.includes("earthquake") && summary.bank.includes("plates"), "summary traps");

const book = content.modules.find((mod) => mod.id === "book");
const bookText = passageText(book);
[
  "Miss Ma",
  "Charity Walk",
  "flood victims in Thailand",
  "Green Sale",
  "Africa",
  "Tai Po",
  "Hong Kong Hospital",
  "free lunchboxes and clothes",
  "Concert for the poor in India",
].forEach((bit) => assert(bookText.includes(bit), `book missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(bookText), "book passage stays English");
assert(!/children don't give up/i.test(bookText), "not the RW-Ch4 back cover");
const bookMcq = book.steps.filter((step) => step.kind === "mcq");
assert(bookMcq.map((step) => step.answer).join("|") === [
  "flood victims in Thailand",
  "Sunday",
  "Visit the elderly",
  "Hong Kong Hospital",
  "free lunchboxes and clothes",
  "Concert for the poor in India",
  "Green Sale",
  "7:00 a.m.",
  "Miss Ma",
].join("|"), "book key");
const board = book.steps.find((step) => step.kind === "bank");
const boardMap = Object.fromEntries(board.items.map((item) => [item.id, item.answer]));
assert(boardMap.th === "Thailand" && boardMap.af === "Africa" && boardMap.el === "elderly", "board start");
assert(boardMap.hosp === "Hospital" && boardMap.hl === "homeless" && boardMap.con === "concert", "board end");

const letter = content.modules.find((mod) => mod.id === "letter");
const order = letter.steps.find((step) => step.kind === "order");
assert(order.items[0] === "Date of the letter", "order starts with the date");
assert(order.items[6].startsWith("Closing"), "order ends with the closing");
assert(order.items.length === 7, "seven letter parts");
const letterBank = letter.steps.find((step) => step.kind === "bank");
const bits = Object.fromEntries(letterBank.items.map((item) => [item.id, item.answer]));
assert(bits.dear === "Dear Mrs Ling,", "dear");
assert(bits.like === "We would like to", "would like");
assert(bits.hope === "We hope you will", "hope");
assert(bits.close === "Yours sincerely,", "close");
assert(letterBank.bank.includes("Hi Mrs Ling,") && letterBank.bank.includes("Lots of love,"), "rude traps");
assert(letterBank.bank.includes("Let's") && letterBank.bank.includes("We want you to"), "command traps");
const letterMcq = letter.steps.filter((step) => step.kind === "mcq");
assert(letterMcq.map((step) => step.answer).join("|") === [
  "Yours sincerely,",
  "We would like to organise a talent show to raise money for the victims.",
  "Raising money for victims in Nepal",
  "a talent show and a second-hand stall",
].join("|"), "letter key");

const free = letter.steps.find((step) => step.kind === "write");
assert(free.samples.length === 3, "three teacher samples");
assert(free.samples.every((sample) => sample.name.includes("範例／教師用")), "samples marked for teachers");
assert(free.samples[0].text.includes("Raising money for victims in Nepal"), "sample A subject");
assert(free.samples[0].text.includes("talent show") && free.samples[0].text.includes("Yours sincerely,"), "sample A letter");
assert(free.samples[0].text.includes("Ken Chan, Doris Ng, Jessica Yu"), "sample A names");
assert(free.samples[1].text.includes("homeless people") && free.samples[1].text.includes("Peter Chan"), "sample B");
assert(free.samples[2].text.includes("Yours faithfully,"), "sample C closing");
assert(free.prompt.includes("正式信"), "prompt");
const visibleLetter = JSON.stringify(letter.steps.filter((step) => step.kind !== "write"));
assert(!visibleLetter.includes("Ken Chan"), "sample A stays on the write step");
assert(!visibleLetter.includes("2nd May 20XX"), "model date stays hidden");
assert(!letter.steps.some((step) => step.kind === "read"), "no model letter as a reading");

const dumped = JSON.stringify(content);
assert(!/children don't give up/i.test(dumped), "no back-cover book");
assert(!/tommy/i.test(dumped), "no Tommy bank");
assert(!/senior citizen/i.test(dumped), "no senior citizen pad");
assert(!/kind heart school play|the selfish giant/i.test(dumped), "no play script");

const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
assert(game.includes("p6-peter-leap-ch4-v1"), "stars key");
assert(game.includes("主頁") && game.includes("提示") && game.includes("音效"), "Chinese buttons");
assert(game.includes("範例／教師用"), "teacher label");
assert(game.includes("const showSamples = submitted || state.teacher"), "samples gated");
assert(game.includes("assets/vocab/go_on_a_charity_walk.png"), "walk photo");
assert(game.includes("assets/vocab/charity_cake_sale.png"), "cake photo");
assert(game.includes("assets/vocab/clean_the_beach.png"), "beach photo");
assert(!/drought\.png|Kids-Opedia|Help International/.test(game), "game has no chapter 3 targets");
assert(!/kind heart|children don't give up|tommy/i.test(game), "game has no RW-Ch4 targets");
const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
assert(sw.includes("p6-peter-leap-ch4-v1"), "cache name");
assert(sw.includes("./assets/vocab/donate_canned_food.png"), "sw caches photos");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert(html.includes("js/content.js") && html.includes("js/game.js") && html.includes("manifest.webmanifest"), "page links");
assert(html.includes("Peter · Reading &amp; Writing Ch4"), "html title");
assert(fs.existsSync(path.join(__dirname, "../.nojekyll")), "root pages marker");

[
  "go_on_a_charity_walk.png",
  "sell_flags.png",
  "charity_cake_sale.png",
  "go_on_a_charity_run.png",
  "take_part_in_a_charity_show.png",
  "visit_the_elderly.png",
  "run_a_second_hand_stall.png",
  "clean_the_beach.png",
  "donate_canned_food.png",
  "manifest.json",
].forEach((file) => {
  const full = path.join(__dirname, "../assets/vocab", file);
  assert(fs.existsSync(full) && fs.statSync(full).size > 50, `missing crop ${file}`);
});

const simplified = "这们为国学问后发体东车来过还对时样经书长门开关云产广贝页风飞马鱼鸟龙";
const chineseBits = [];
function collectChinese(value) {
  if (typeof value === "string") chineseBits.push(value);
  else if (Array.isArray(value)) value.forEach(collectChinese);
  else if (value && typeof value === "object") Object.values(value).forEach(collectChinese);
}
collectChinese(content);
const joined = chineseBits.join("\n");
[...simplified].forEach((ch) => {
  if (joined.includes(ch)) failures.push(`simplified character ${ch}`);
});
["js/game.js", "index.html", "README.md"].forEach((file) => {
  const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  [...simplified].forEach((ch) => {
    if (text.includes(ch)) failures.push(`simplified character ${ch} in ${file}`);
  });
});

const kinds = new Set();
content.modules.forEach((mod) => mod.steps.forEach((step) => kinds.add(step.kind)));
["teach", "mcq", "iconHunt", "pictureMatch", "bank", "builder", "read", "order", "write"].forEach((kind) => {
  assert(kinds.has(kind), `missing step kind ${kind}`);
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`ok ${answers.length} keyed answers`);
