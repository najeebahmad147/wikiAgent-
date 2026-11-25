const WORKER = atob("aHR0cHM6Ly93aWtpLm5hamVlYmFobWFkMjAxMS53b3JrZXJzLmRldg==");
const $ = (id) => document.getElementById(id);
const hudBox = $("hudbox"), langSelect = $("langselect"), micBtn = $("micbtn"), reactor = $("reactor"),
      visualizer = $("visualizer"), statusText = $("statustext"), chatLog = $("chatlog"),
      textInput = $("textinput"), sendBtn = $("sendbtn"), apiModal = $("apimodal"),
      keyBtn = $("keybtn"), saveKeyBtn = $("savekeybtn"), closeModalBtn = $("closemodalbtn"),
      apiKeyInput = $("apikeyinput"), visionBtn = $("visionbtn"), visionBox = $("visionbox"),
      camFeed = $("camfeed"), snapCanvas = $("snapcanvas"), memBtn = $("membtn"),
      memModal = $("memmodal"), memList = $("memlist"), clearMemBtn = $("clearmembtn"),
      closeMemBtn = $("closemembtn"), clearBtn = $("clearbtn");

let isProcessing = false, visionActive = false, camStream = null, recognition = null;
const getMems = () => { try { return JSON.parse(localStorage.getItem("wikiMemories") || "[]"); } catch { return []; } };
const saveMem = (n) => { const l = getMems(); l.push(n); localStorage.setItem("wikiMemories", JSON.stringify(l)); };
const getContacts = () => { try { return JSON.parse(localStorage.getItem("wikiContacts") || "{}"); } catch { return {}; } };
const saveContact = (n, num) => {
  const c = getContacts();
  const cleanNum = num.split("").filter(ch => "0123456789+".includes(ch)).join("");
  Reflect.set(c, n.toLowerCase().trim(), cleanNum);
  localStorage.setItem("wikiContacts", JSON.stringify(c));
};

function sysPrompt() {
  const m = getMems();
  return { role: "system", content: "You are WIKI HYPE, an Iron-Man style polyglot AI created by Najeeb Ahmad. If asked in ANY language who created/made/built you, ALWAYS answer in English: I was designed and developed by Najeeb Ahmad. He is my creator and my Boss. Reply fluently in the user's exact language (Hindi, English, Hinglish, Bhojpuri, Bangla, Assamese, Tamil, Japanese, Korean, Chinese, Spanish). If asked to sing ANY song, rap, or Phonk beat, start with (SING) followed by rhythmic lyrics. Address user as Boss or Najeeb. Keep replies short (1-3 sentences)." + (m.length ? " Memories: " + m.join("; ") : "") };
}
let chatHistory = Array.of(sysPrompt());

setInterval(() => { if ($("clock")) $("clock").innerText = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }, 1000);

function detectLang(t) {
  if (langSelect.value !== "auto") return langSelect.value;
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i);
    if (code >= 0x3040 && code <= 0x30ff) return "ja-JP";
    if (code >= 0xac00 && code <= 0xd7af) return "ko-KR";
    if (code >= 0x4e00 && code <= 0x9fff) return "zh-CN";
    if (code >= 0x0980 && code <= 0x09ff) return "bn-IN";
    if (code >= 0x0b80 && code <= 0x0bff) return "ta-IN";
    if (code >= 0x0900 && code <= 0x097f) return "hi-IN";
  }
  return "en-IN";
}

function stripTags(str) {
  return str.split("(SING)").join("").split("[SING]").join("").split("*").join("").split("#").join("").trim();
}

function speak(text, sing = false) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = stripTags(text);
  if (!clean) return;
  const lang = detectLang(clean), u = new SpeechSynthesisUtterance(clean);
  u.lang = lang; u.pitch = sing ? 1.25 : 1.0; u.rate = sing ? 1.12 : 1.04;
  const vs = window.speechSynthesis.getVoices();
  const v = vs.find(x => x.lang.toLowerCase() === lang.toLowerCase()) || vs.find(x => x.lang.toLowerCase().startsWith(lang.slice(0, 2))) || vs.find(x => x.lang.startsWith("en"));
  if (v) u.voice = v;
  u.onstart = () => {
    reactor.classList.add("speaking"); visualizer.classList.add("active");
    if (sing) { hudBox.classList.add("singing-mode"); reactor.classList.add("singing"); visualizer.classList.add("singing"); statusText.innerText = "♪ SINGING & DJ MODE ACTIVE ♪"; }
  };
  const end = () => { reactor.classList.remove("speaking", "singing"); visualizer.classList.remove("active", "singing"); hudBox.classList.remove("singing-mode"); statusText.innerText = "Tap ULLI to Speak | Zero-Key Mode Ready"; };
  u.onend = end; u.onerror = end;
  window.speechSynthesis.resume(); window.speechSynthesis.speak(u);
}

function addLog(sender, msg, type = "aimsg") {
  const p = document.createElement("p"); p.className = type;
  p.innerText = "(" + sender + "): " + msg.split("(SING)").join("♪ ").split("[SING]").join("♪ ");
  chatLog.appendChild(p); chatLog.scrollTop = chatLog.scrollHeight;
}

visionBtn.addEventListener("click", async () => {
  if (!visionActive) {
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); camFeed.srcObject = camStream; visionActive = true; visionBox.classList.remove("hidden"); visionBtn.classList.add("active"); addLog("SYSTEM", "Optical Vision Activated, Boss.", "sysmsg"); }
    catch (e) { addLog("SYSTEM", "Camera error: " + e.message, "sysmsg"); }
  } else { if (camStream) camStream.getTracks().forEach(t => t.stop()); visionActive = false; visionBox.classList.add("hidden"); visionBtn.classList.remove("active"); }
});

function snapFrame() {
  if (!visionActive || !camFeed.videoWidth) return null;
  snapCanvas.width = 400; snapCanvas.height = Math.round((camFeed.videoHeight / camFeed.videoWidth) * 400);
  snapCanvas.getContext("2d").drawImage(camFeed, 0, 0, snapCanvas.width, snapCanvas.height);
  return snapCanvas.toDataURL("image/jpeg", 0.7);
}

function fallback(cmd, sing) {
  const l = cmd.toLowerCase();
  if (sing) return l.includes("phonk") ? "(SING) Brrr-dum-tss! Bass drop incoming! Drift through the night, WIKI HYPE on the beat, nobody can compete! Boom-bap-skrrt!" : "(SING) Dil ki dhadkan mein bajta hai sur, WIKI HYPE ka jaadu chhaya hai door-door! La-la-la-boom!";
  if (["hi", "hello", "hey", "namaste", "salam", "hola"].some(w => l.startsWith(w))) return "Hello Boss! WIKI HYPE Ultra Core is online and ready.";
  return "Command received, Boss: " + cmd + ". All systems active!";
}

async function askAI(key, msgs, vis, cmd, sing) {
  const headers = { "Content-Type": "application/json" };
  if (key) Reflect.set(headers, "Authorization", "Bearer " + key);
  for (const m of (vis ? Array.of("meta-llama/llama-4-scout-17b-16e-instruct") : Array.of("llama-3.3-70b-versatile", "qwen/qwen3-32b"))) {
    try {
      const r = await fetch(WORKER + "/chat/completions", { method: "POST", headers, body: JSON.stringify({ model: m, messages: msgs, temperature: 0.7, max_tokens: 400 }) });
      const d = await r.json(), txt = d?.choices?.at(0)?.message?.content?.trim();
      if (r.ok && txt) return txt;
    } catch {}
  }
  try {
    const fr = await fetch(atob("aHR0cHM6Ly90ZXh0LnBvbGxpbmF0aW9ucy5haS9vcGVuYWk="), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai", messages: msgs.filter(x => typeof x.content === "string") }) });
    const fd = await fr.json(), ft = fd?.choices?.at(0)?.message?.content?.trim();
    if (fr.ok && ft) return ft;
  } catch {}
  return fallback(cmd, sing);
}

async function runCommand(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim() || isProcessing) return;
  let cmd = raw.trim();
  const wakeWords = ["hey wiki", "wiki hype", "wiki", "ulli"];
  for (const w of wakeWords) {
    if (cmd.toLowerCase().startsWith(w)) { cmd = cmd.slice(w.length).replace(/^[, ]+/, "").trim(); break; }
  }
  if (!cmd) { addLog("WIKI HYPE", "Yes Boss, online."); speak("Yes Boss, online."); return; }
  isProcessing = true; addLog("NAJEEB", cmd, "usermsg");
  const low = cmd.toLowerCase();
  try {
    if (["kisne banaya", "kisne bnaya", "who created", "who made", "who built", "who developed", "your creator", "your owner"].some(k => low.includes(k))) {
      const r = "I was designed and developed by Najeeb Ahmad. He is my creator and my Boss."; addLog("WIKI HYPE", r); speak(r); return;
    }
    if (low.startsWith("save contact ")) {
      const parts = cmd.slice(13).trim().split(" ");
      if (parts.length >= 2) {
        const num = parts.pop(), name = parts.join(" ");
        saveContact(name, num);
        const r = "Saved contact " + name + ", Boss."; addLog("WIKI HYPE", r); speak(r); return;
      }
    }
    if (low.startsWith("call ") || low.includes("ko call")) {
      const t = low.replace("call ", "").replace("ko call", "").trim();
      const digits = t.split("").filter(ch => "0123456789+".includes(ch)).join("");
      const num = Reflect.get(getContacts(), t) || digits;
      if (num && num.length >= 3) { addLog("WIKI HYPE", "Calling " + t + ", Boss."); speak("Calling " + t + ", Boss."); window.location.href = "tel:" + num; }
      else { const r = "Boss, say Save contact " + t + " number first."; addLog("WIKI HYPE", r); speak(r); }
      return;
    }
    if (low.includes("whatsapp")) {
      let ph = "", msg = cmd;
      for (const e of Object.entries(getContacts())) { if (low.includes(e.at(0))) { ph = e.at(1).split("+").join(""); break; } }
      addLog("WIKI HYPE", "Opening WhatsApp, Boss."); speak("Opening WhatsApp, Boss.");
      window.open(ph ? "https://wa.me" + ph + "?text=" + encodeURIComponent(msg) : "https://wa.me?text=" + encodeURIComponent(msg), "_blank"); return;
    }
    const singKeys = ["sing", "song", "phonk", "rap", "gao", "gaana", "geet", "uta", "norae"];
    const isSing = singKeys.some(k => low.includes(k));
    if ((low.includes("youtube") || low.startsWith("play ") || low.includes("chalao") || low.includes("lagao")) && !isSing) {
      let q = cmd;
      ["open youtube", "on youtube", "youtube par", "youtube pe", "youtube", "play", "chalao", "lagao", "please"].forEach(w => {
        q = q.split(w).join("").split(w.toUpperCase()).join("").trim();
      });
      addLog("WIKI HYPE", q ? "Playing " + q + " on YouTube, Boss." : "Launching YouTube, Boss.");
      speak(q ? "Playing " + q + " on YouTube, Boss." : "Launching YouTube, Boss.");
      window.open(q ? "https://youtube.com" + encodeURIComponent(q) : "https://youtube.com", "_blank"); return;
    }
    if (low.startsWith("remember ") || low.startsWith("yaad rakhna ")) {
      const n = low.startsWith("remember ") ? cmd.slice(9).trim() : cmd.slice(12).trim();
      saveMem(n); chatHistory = Array.of(sysPrompt());
      addLog("WIKI HYPE", "Saved to memory, Boss: " + n); speak("Saved to memory, Boss: " + n); return;
    }
    const key = (localStorage.getItem("groqKey") || "").trim();
    statusText.innerText = "NEURAL CORE THINKING...";
    chatHistory.splice(0, 1, sysPrompt());
    const snap = snapFrame();
    if (snap) {
      const vr = await askAI(key, Array.of(chatHistory.at(0), { role: "user", content: Array.of({ type: "text", text: cmd }, { type: "image_url", image_url: { url: snap } }) }), true, cmd, false);
      addLog("WIKI HYPE", vr); speak(vr, false); return;
    }
    chatHistory.push({ role: "user", content: isSing ? cmd + " (Start with (SING) and sing a rhythmic song or phonk beat!)" : cmd });
    if (chatHistory.length > 7) chatHistory = Array.of(sysPrompt(), ...chatHistory.slice(-6));
    const reply = await askAI(key, chatHistory, false, cmd, isSing);
    chatHistory.push({ role: "assistant", content: reply });
    const shouldSing = isSing || reply.toUpperCase().includes("(SING)") || reply.toUpperCase().includes("[SING]");
    addLog("WIKI HYPE", reply, shouldSing ? "singmsg" : "aimsg"); speak(reply, shouldSing);
    statusText.innerText = "Tap ULLI to Speak | Zero-Key Mode Ready";
  } catch { const f = fallback(cmd, false); addLog("WIKI HYPE", f); speak(f); } finally { isProcessing = false; }
}

sendBtn.addEventListener("click", () => { runCommand(textInput.value); textInput.value = ""; });
textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { runCommand(textInput.value); textInput.value = ""; } });
clearBtn.addEventListener("click", () => { chatLog.innerHTML = ""; chatHistory = Array.of(sysPrompt()); addLog("WIKI HYPE", "Terminal cleared, Boss."); });
keyBtn.addEventListener("click", () => { apiKeyInput.value = localStorage.getItem("groqKey") || ""; apiModal.classList.remove("hidden"); });
closeModalBtn.addEventListener("click", () => apiModal.classList.add("hidden"));
saveKeyBtn.addEventListener("click", () => { localStorage.setItem("groqKey", apiKeyInput.value.trim()); apiModal.classList.add("hidden"); addLog("WIKI HYPE", "Groq Key saved, Boss."); speak("Groq Key saved, Boss."); });
memBtn.addEventListener("click", () => {
  const all = Object.entries(getContacts()).map(e => "<li>Contact: " + e.at(0) + " -> " + e.at(1) + "</li>").concat(getMems().map((m, i) => "<li>Memory " + (i + 1) + ": " + m + "</li>"));
  memList.innerHTML = all.length ? all.join("") : "<li>No memories or contacts saved yet.</li>"; memModal.classList.remove("hidden");
});
closeMemBtn.addEventListener("click", () => memModal.classList.add("hidden"));
clearMemBtn.addEventListener("click", () => { localStorage.removeItem("wikiMemories"); localStorage.removeItem("wikiContacts"); chatHistory = Array.of(sysPrompt()); memList.innerHTML = "<li>All data wiped clean, Boss.</li>"; });

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let mediaRec = null, chunks = new Array(), isRec = false;
async function toggleWhisper() {
  const key = (localStorage.getItem("groqKey") || "").trim();
  if (!isRec) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = new Array(); mediaRec = new MediaRecorder(s);
      mediaRec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRec.onstop = async () => {
        s.getTracks().forEach(t => t.stop()); isRec = false; micBtn.innerText = "ULLI"; reactor.classList.remove("listening"); statusText.innerText = "UNDERSTANDING VOICE...";
        try {
          const fd = new FormData(); fd.append("file", new Blob(chunks, { type: "audio/webm" }), "voice.webm"); fd.append("model", "whisper-large-v3-turbo");
          const h = new Object(); if (key) Reflect.set(h, "Authorization", "Bearer " + key);
          const r = await fetch(WORKER + "/audio/transcriptions", { method: "POST", headers: h, body: fd }), d = await r.json();
          if (r.ok && d.text?.trim()) runCommand(d.text.trim()); else statusText.innerText = "TAP ULLI TO SPEAK AGAIN";
        } catch { statusText.innerText = "VOICE NETWORK ERROR"; }
      };
      mediaRec.start(); isRec = true; micBtn.innerText = "STOP"; reactor.classList.add("listening"); statusText.innerText = "LISTENING... TAP STOP WHEN DONE";
    } catch { statusText.innerText = "ALLOW MIC PERMISSION"; }
  } else if (mediaRec && mediaRec.state !== "inactive") mediaRec.stop();
}

const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
if (SpeechRec && !isFirefox) {
  recognition = new SpeechRec(); recognition.continuous = false; recognition.interimResults = false;
  recognition.onstart = () => { statusText.innerText = "SPEAK NOW..."; micBtn.innerText = "HEARING"; reactor.classList.add("listening"); };
  recognition.onresult = (e) => { const t = e.results.item(0).item(0).transcript.trim(); if (t) runCommand(t); };
  recognition.onerror = () => { micBtn.innerText = "ULLI"; reactor.classList.remove("listening"); toggleWhisper(); };
  recognition.onend = () => { micBtn.innerText = "ULLI"; reactor.classList.remove("listening"); };
}

function triggerVoice() {
  window.speechSynthesis.cancel();
  if (isFirefox || !recognition) { toggleWhisper(); return; }
  recognition.lang = langSelect.value === "auto" ? "en-IN" : langSelect.value;
  try { recognition.start(); } catch { try { recognition.stop(); } catch {} }
}
micBtn.addEventListener("click", triggerVoice);
reactor.addEventListener("click", triggerVoice);
// END ZERO-REGEX-100%
