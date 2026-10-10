const ORDER = ["opening", "feed", "login", "article", "reporter", "editor", "tech", "weather", "prompt"];

const state = { station: "opening" };

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[ch]));
}

function text(value) {
  return esc(value).replace(/אטומי(?:ת|ים|ות)?/g, (word) => word + "<span class=\"bonus\">בונוס</span>");
}

function stations() {
  return ORDER.map((id) => STATIONS.find((s) => s.id === id)).filter(Boolean);
}

function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

function reqHtml(st) {
  return (st.requirements || []).map((group) => {
    const title = group.h ? "<h3 class=\"subhead\">" + text(group.h) + "</h3>" : "";
    const flow = group.flow
      ? "<div class=\"flow\">" + group.flow.map((name, i) =>
          (i ? "<span class=\"arr\">←</span>" : "") + "<span>" + text(name) + "</span>"
        ).join("") + "</div>"
      : "";
    const items = (group.items || []).map((item) =>
      "<p class=\"req-line\">" + text(item) + "</p>"
    ).join("");
    return "<section class=\"card\">" + title + flow + items + "</section>";
  }).join("");
}

function lineHtml(item) {
  const body = typeof item === "string"
    ? text(item)
    : "<b>" + text(item.lead) + ".</b> " + text(item.text);
  return "<p class=\"req-line\">" + body + "</p>";
}

function blockHtml(block) {
  const items = (block.items || []).map(lineHtml).join("");
  const codes = ["code", "code2", "code3"].filter((key) => block[key]).map((key) =>
    "<pre>" + esc(block[key]) + "</pre>"
  ).join("");
  const title = text(block.title) + (block.advanced ? " <span class=\"badge\">מתקדם</span>" : "");
  if (block.kind === "note") {
    const links = (block.links || []).map((link) =>
      "<button type=\"button\" class=\"text-btn\" data-go=\"" + link.station + "\">" + text(link.label) + "</button>"
    ).join(" · ");
    return "<div class=\"callout\"><p>" + text(block.text) + "</p>" + (links ? "<p>" + links + "</p>" : "") + "</div>";
  }
  if (block.kind === "table") {
    const head = "<tr>" + block.headers.map((h) => "<th>" + text(h) + "</th>").join("") + "</tr>";
    const rows = block.rows.map((row) => "<tr>" + row.map((cell) => "<td>" + text(cell) + "</td>").join("") + "</tr>").join("");
    return "<div class=\"guide\"><h3 class=\"block-title\">" + title + "</h3><table>" + head + rows + "</table></div>";
  }
  if (block.kind === "q") {
    return "<article class=\"q-card\">" +
      "<h3 class=\"block-title\">" + title + "</h3>" +
      "<p class=\"prompt\">" + text(block.prompt) + "</p>" +
      "<div class=\"answer\"><span class=\"who\">תשובה טובה</span>" + text(block.answer) + "</div>" +
      (block.follow ? "<p class=\"lead\" style=\"margin-top:10px\">" + text(block.follow) + "</p>" : "") +
      items + codes +
    "</article>";
  }
  return "<section class=\"guide\">" +
    "<h3 class=\"block-title\">" + title + "</h3>" +
    (block.intro ? "<p class=\"lead\">" + text(block.intro) + "</p>" : "") +
    (block.scenario ? "<p class=\"prompt\">" + text(block.scenario) + "</p>" : "") +
    (block.after ? "<p class=\"lead\">" + text(block.after) + "</p>" : "") +
    codes + items +
  "</section>";
}

function promptHtml(st) {
  return "<div class=\"prompt-bar\"><button type=\"button\" class=\"primary\" id=\"copy-prompt\">העתקת הפרומפט</button>" +
    "<span id=\"copy-state\"></span></div>" +
    "<pre class=\"prompt-text\" id=\"prompt-text\">" + esc(st.prompt) + "</pre>";
}

function openingHtml(st) {
  return "<p class=\"read-label\">להקריא בתחילת ההגנה</p>" +
    "<article class=\"script\">" +
    st.lines.map((line) => "<p>" + text(line) + "</p>").join("") +
    "</article>";
}

function pageHtml(st) {
  const req = reqHtml(st);
  const checks = st.script
    ? "<h3 class=\"section-label\">מה לבדוק עכשיו</h3><section class=\"card\">" +
      st.script.map(lineHtml).join("") + "</section>"
    : "";
  const blocks = st.guide || [];
  const questions = blocks.filter((block) => block.kind !== "note");
  const notes = blocks.filter((block) => block.kind === "note");
  const questionsHtml = questions.length
    ? "<h3 class=\"section-label\">שאלות שאפשר לשאול בנושא</h3>" + questions.map(blockHtml).join("")
    : "";
  return (req ? "<h3 class=\"section-label\">דרישות</h3>" + req : "") +
    checks + questionsHtml + notes.map(blockHtml).join("");
}

function pager(st) {
  const list = stations();
  const index = list.findIndex((s) => s.id === st.id);
  const prev = list[index - 1];
  const next = list[index + 1];
  return "<div class=\"pager\">" +
    (prev ? "<button type=\"button\" class=\"ghost\" data-go=\"" + prev.id + "\">הקודם · " + esc(prev.nav) + "</button>" : "") +
    (next ? "<button type=\"button\" class=\"primary\" data-go=\"" + next.id + "\">הבא · " + esc(next.nav) + "</button>" : "") +
  "</div>";
}

function renderSide() {
  document.getElementById("side").innerHTML = stations().map((st) =>
    "<button type=\"button\" data-go=\"" + st.id + "\"" + (st.id === state.station ? " class=\"active\"" : "") + ">" +
      "<strong>" + esc(st.nav) + "</strong></button>"
  ).join("");
}

function renderMain(scroll) {
  const st = stationById(state.station);
  const head = st.opening ? "" : "<div class=\"station-head\"><div><h2>" + text(st.title) + "</h2>" +
    (st.blurb ? "<p>" + text(st.blurb) + "</p>" : "") + "</div></div>";
  const body = st.opening ? openingHtml(st) : st.promptPage ? promptHtml(st) : pageHtml(st);
  const main = document.getElementById("main");
  main.innerHTML = head + body + "<div style=\"margin-top:18px\">" + pager(st) + "</div>";
  if (scroll) window.scrollTo(0, 0);
}

function render(scroll) {
  renderSide();
  renderMain(scroll);
}

function go(id) {
  if (!stationById(id)) return;
  state.station = id;
  render(true);
}

function markCopied() {
  const state = document.getElementById("copy-state");
  if (state) state.textContent = "הועתק";
}

function copyPrompt() {
  const value = stationById("prompt").prompt;
  const node = document.getElementById("prompt-text");
  if (node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(markCopied).catch(() => {
      try { document.execCommand("copy"); } catch (_) {}
      markCopied();
    });
    return;
  }
  try { document.execCommand("copy"); } catch (_) {}
  markCopied();
}

document.body.addEventListener("click", (event) => {
  if (event.target.closest("#copy-prompt")) {
    copyPrompt();
    return;
  }
  const goBtn = event.target.closest("[data-go]");
  if (goBtn) go(goBtn.getAttribute("data-go"));
});

document.addEventListener("keydown", (event) => {
  const list = stations();
  const index = list.findIndex((s) => s.id === state.station);
  if (event.altKey && event.key === "ArrowLeft" && list[index + 1]) go(list[index + 1].id);
  if (event.altKey && event.key === "ArrowRight" && list[index - 1]) go(list[index - 1].id);
});

render(false);
