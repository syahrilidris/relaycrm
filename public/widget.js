/* Bintang Kids website chat. Embed: <script src="https://crm.bintangkids.com/widget.js" async></script> */
(function () {
  if (window.__bintangChat) return
  window.__bintangChat = true
  var script = document.currentScript
  var API = (script && script.src ? new URL(script.src).origin : "https://crm.bintangkids.com") + "/api/webchat"
  var COLOR = (script && script.getAttribute("data-color")) || "#3fd05a"
  var KEY = "bintang-chat-v1"
  var state = load()
  var open = false, timer = null, lastCount = 0, seenCount = state.seen || 0, sending = false

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") } catch (e) { return {} } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) {} }
  function el(tag, attrs, kids) {
    var node = document.createElement(tag)
    for (var k in attrs || {}) { if (k === "text") node.textContent = attrs[k]; else node.setAttribute(k, attrs[k]) }
    ;(kids || []).forEach(function (c) { if (c) node.appendChild(c) })
    return node
  }

  var host = el("div", { id: "bintang-chat" })
  var root = host.attachShadow({ mode: "open" })
  root.innerHTML = "<style>" +
    ":host{all:initial}*{box-sizing:border-box;font-family:ui-rounded,'Nunito','Segoe UI',system-ui,sans-serif}" +
    ".fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;background:" + COLOR + ";color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".fab:hover{transform:scale(1.06)}.fab svg{width:28px;height:28px}.dot{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;display:none}" +
    ".panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100dvh - 120px);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;color:#1e293b}" +
    ".panel.on{display:flex}@media(max-width:480px){.panel{right:0;left:0;bottom:0;width:100%;max-width:100%;height:100dvh;max-height:100dvh;border-radius:0}.fab.hide{display:none}}" +
    ".head{background:" + COLOR + ";color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}.head b{font-size:17px;display:block}.head span{font-size:12.5px;opacity:.9}.x{margin-left:auto;background:rgba(255,255,255,.2);border:0;color:#fff;width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:18px}" +
    ".body{flex:1;overflow-y:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}" +
    ".msg{max-width:80%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}.me{align-self:flex-end;background:" + COLOR + ";color:#fff;border-bottom-right-radius:5px}.them{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:5px}" +
    ".msg img{max-width:100%;border-radius:10px;display:block}.msg a{color:inherit}.sys{align-self:center;font-size:11.5px;color:#94a3b8}" +
    "form{display:flex;flex-direction:column;gap:10px;padding:18px}label{font-size:12.5px;font-weight:700;color:#475569}input,textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:14px;outline:none;color:#1e293b;background:#fff}input:focus,textarea:focus{border-color:" + COLOR + "}" +
    ".send{border:0;background:" + COLOR + ";color:#fff;font-weight:800;border-radius:12px;padding:11px 14px;cursor:pointer;font-size:14px}.send:disabled{opacity:.5;cursor:default}" +
    ".foot{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff;align-items:flex-end}.foot textarea{resize:none;max-height:120px;min-height:42px}" +
    ".err{color:#dc2626;font-size:12.5px}.hint{font-size:12.5px;color:#64748b;line-height:1.5}.hp{position:absolute;left:-9999px}" +
    "</style>"

  var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  var fab = el("button", { class: "fab", "aria-label": "Chat with Bintang Kids" })
  fab.innerHTML = icon
  var dot = el("span", { class: "dot" })
  fab.appendChild(dot)
  var closeBtn = el("button", { class: "x", "aria-label": "Close chat", text: "×" })
  var head = el("div", { class: "head" }, [el("div", {}, [el("b", { text: "Bintang Kids ⭐" }), el("span", { text: "We usually reply within a few hours" })]), closeBtn])
  var body = el("div", { class: "body", role: "log", "aria-live": "polite" })
  var panel = el("div", { class: "panel", role: "dialog", "aria-label": "Chat with Bintang Kids" }, [head, body])
  root.appendChild(fab)
  root.appendChild(panel)

  function render(messages) {
    body.innerHTML = ""
    body.appendChild(el("div", { class: "msg them", text: "Hi there! 👋 Ask us anything about Bintang Kids and we'll get back to you here." }))
    messages.forEach(function (m) {
      var node = el("div", { class: "msg " + (m.from === "visitor" ? "me" : "them") })
      ;(m.attachments || []).forEach(function (a) {
        if (a.kind === "image") node.appendChild(el("a", { href: a.url, target: "_blank", rel: "noopener" }, [el("img", { src: a.url, alt: a.name })]))
        else node.appendChild(el("a", { href: a.url, target: "_blank", rel: "noopener", text: "📄 " + a.name }))
      })
      if (m.text) node.appendChild(document.createTextNode(m.text))
      body.appendChild(node)
    })
    body.scrollTop = body.scrollHeight
  }

  function startForm() {
    panel.querySelectorAll("form,.foot").forEach(function (n) { n.remove() })
    body.innerHTML = ""
    var err = el("div", { class: "err" })
    var form = el("form", {}, [
      el("p", { class: "hint", text: "Hi! 👋 Tell us who you are so we can reply, even if you leave the page." }),
      el("label", { text: "Your name" }), el("input", { name: "name", required: "", maxlength: "80", autocomplete: "name" }),
      el("label", { text: "Email or WhatsApp number" }), el("input", { name: "contact", required: "", maxlength: "160", autocomplete: "email" }),
      el("label", { text: "Message" }), el("textarea", { name: "text", required: "", rows: "3", maxlength: "2000" }),
      el("input", { name: "website", class: "hp", tabindex: "-1", autocomplete: "off" }),
      err, el("button", { class: "send", type: "submit", text: "Start chat" })
    ])
    form.addEventListener("submit", function (e) {
      e.preventDefault()
      var f = new FormData(form), contact = String(f.get("contact") || "").trim()
      var isEmail = contact.indexOf("@") > 0
      post({ name: f.get("name"), email: isEmail ? contact : "", phone: isEmail ? "" : contact, text: f.get("text"), website: f.get("website") }, form.querySelector(".send"), err, function () { state.name = String(f.get("name")); save(); form.remove(); chatView() })
    })
    body.appendChild(form)
  }

  function chatView() {
    if (panel.querySelector(".foot")) return
    var input = el("textarea", { rows: "1", placeholder: "Type a message…", "aria-label": "Message", maxlength: "2000" })
    var btn = el("button", { class: "send", text: "Send" })
    var err = el("div", { class: "err" })
    function go() { var t = input.value.trim(); if (!t || sending) return; post({ text: t }, btn, err, function () { input.value = ""; input.style.height = "" }) }
    btn.addEventListener("click", go)
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); go() } })
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px" })
    panel.appendChild(el("div", { class: "foot" }, [el("div", { style: "flex:1;display:flex;flex-direction:column;gap:4px" }, [input, err]), btn]))
    poll()
    setTimeout(function () { input.focus() }, 50)
  }

  function post(payload, btn, err, done) {
    sending = true; btn.disabled = true; err.textContent = ""
    payload.v = state.v; payload.t = state.t; payload.page = location.pathname
    fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Not sent"); return j }) })
      .then(function (j) { if (j.v) { state.v = j.v; state.t = j.t; save() } update(j.messages || []); done() })
      .catch(function (e) { err.textContent = e.message || "Not sent. Please try again." })
      .then(function () { sending = false; btn.disabled = false })
  }

  function update(messages) {
    var changed = messages.length !== lastCount
    lastCount = messages.length
    if (open) { if (changed) render(messages); seenCount = lastCount; state.seen = seenCount; save() }
    dot.style.display = !open && lastCount > seenCount ? "block" : "none"
  }

  function poll() {
    clearTimeout(timer)
    if (!state.v) return
    fetch(API + "?v=" + encodeURIComponent(state.v) + "&t=" + encodeURIComponent(state.t))
      .then(function (r) { if (r.status === 401) { state = {}; save(); return null } return r.json() })
      .then(function (j) { if (j) update(j.messages || []) })
      .catch(function () {})
      .then(function () { timer = setTimeout(poll, open && !document.hidden ? 4000 : 30000) })
  }

  function toggle(next) {
    open = next
    panel.classList.toggle("on", open)
    fab.classList.toggle("hide", open)
    if (open) { lastCount = -1; state.v ? chatView() : startForm(); dot.style.display = "none" }
    poll()
  }
  fab.addEventListener("click", function () { toggle(!open) })
  closeBtn.addEventListener("click", function () { toggle(false) })
  window.BintangChat = { open: function () { toggle(true) } }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.v) poll() })

  function mount() { document.body.appendChild(host); if (state.v) poll() }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount)
})()
