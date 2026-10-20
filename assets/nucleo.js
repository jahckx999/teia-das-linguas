/* Teia das Línguas — núcleo compartilhado por todas as páginas */
(function () {
  const C = window.TDL_CONFIG;
  const raiz = document.documentElement.dataset.raiz || "./";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- tema ---------- */
  const tema = LS.get("tdl_tema", null);
  if (tema) document.documentElement.dataset.theme = tema;
  function alternarTema() {
    const escuroAgora = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const novo = escuroAgora ? "light" : "dark";
    document.documentElement.dataset.theme = novo; LS.set("tdl_tema", novo);
  }

  /* ---------- aviso rápido ---------- */
  let toastEl;
  function toast(msg, ms = 2600) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("ver");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("ver"), ms);
  }

  /* ---------- voz (Web Speech API, grátis e sem limite) ---------- */
  let vozes = [];
  function carregarVozes() { vozes = speechSynthesis.getVoices(); }
  if ("speechSynthesis" in window) { carregarVozes(); speechSynthesis.onvoiceschanged = carregarVozes; }
  function escolherVoz(lang) {
    const pref = LS.get("tdl_voz_" + lang, null);
    const doIdioma = vozes.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
    return doIdioma.find(v => v.name === pref)
      || doIdioma.find(v => v.lang.toLowerCase() === lang.toLowerCase() && /google|natural|neural|samantha|luciana|francisca/i.test(v.name))
      || doIdioma.find(v => v.lang.toLowerCase() === lang.toLowerCase()) || doIdioma[0] || null;
  }
  function falar(texto, lang = "en-US", opc = {}) {
    if (!("speechSynthesis" in window)) { toast("Seu navegador não tem voz. Use Chrome, Edge ou Safari atualizados."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = lang; const v = escolherVoz(lang); if (v) u.voice = v;
    u.rate = opc.rate || LS.get("tdl_velocidade", 0.9);
    if (opc.aoFim) u.onend = opc.aoFim;
    speechSynthesis.speak(u);
  }
  // pronúncia adaptada: uma voz em português lê a escrita adaptada (ex.: "abéndan")
  function falarAdaptado(pr, opc = {}) {
    const materna = LS.get("tdl_materna", "pt-BR");
    falar(pr.replace(/·/g, " "), materna, Object.assign({ rate: 0.85 }, opc));
  }
  function falarSilabas(sil, botoes) {
    const partes = sil.split(/[-·]/).map(s => s.trim()).filter(Boolean);
    let i = 0;
    const prox = () => {
      botoes && botoes.forEach(b => b.classList.remove("falando"));
      if (i >= partes.length) return;
      botoes && botoes[i] && botoes[i].classList.add("falando");
      falarAdaptado(partes[i].toLowerCase(), { rate: 0.7, aoFim: () => { i++; setTimeout(prox, 120); } });
    };
    prox();
  }
  function fitaSilabas(sil) {
    const wrap = document.createElement("div"); wrap.className = "fita";
    sil.split("-").forEach(s => {
      s.split("·").forEach(p => {
        const b = document.createElement("button");
        const t = p.trim(); if (!t) return;
        b.className = "silaba" + (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔ]/.test(t) ? " tonica" : "");
        b.type = "button"; b.textContent = t.toLowerCase();
        b.setAttribute("aria-label", "Ouvir a sílaba " + t.toLowerCase());
        b.onclick = () => falarAdaptado(t.toLowerCase(), { rate: 0.7 });
        wrap.appendChild(b);
      });
    });
    return wrap;
  }

  /* ---------- Supabase (carregado só quando preciso) ---------- */
  let _sb;
  async function sb() {
    if (_sb) return _sb;
    if (!window.supabase) {
      await new Promise((ok, erro) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
        s.onload = ok; s.onerror = erro; document.head.appendChild(s);
      });
    }
    _sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
    return _sb;
  }
  async function rest(caminho) {
    const r = await fetch(C.supabaseUrl + "/rest/v1/" + caminho, { headers: { apikey: C.supabaseKey } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function usuario() {
    try { const c = await sb(); const { data } = await c.auth.getSession(); return data.session ? data.session.user : null; }
    catch (e) { return null; }
  }

  /* ---------- configuração central (editada no painel) ---------- */
  async function config() {
    const cache = (() => { try { return JSON.parse(sessionStorage.getItem("tdl_cfg") || "null"); } catch (e) { return null; } })();
    if (cache && Date.now() - cache.t < 5 * 60 * 1000) return cache.c;
    try {
      const linhas = await rest("config?select=chave,valor");
      const c = {}; linhas.forEach(l => c[l.chave] = l.valor);
      try { sessionStorage.setItem("tdl_cfg", JSON.stringify({ t: Date.now(), c })); } catch (e) {}
      return c;
    } catch (e) { return {}; }
  }
  function aplicarConfig(c) {
    const site = c.site || {};
    const aviso = document.querySelector(".aviso-topo");
    if (aviso && site.aviso) { aviso.textContent = site.aviso; aviso.classList.add("ativo"); }
    if (site.manutencao && !location.pathname.includes("/painel")) {
      const m = document.querySelector("main");
      if (m) m.innerHTML = '<section class="pagina estreita"><h1>Voltamos em instantes</h1><p>Estamos atualizando o conteúdo do site. Tente de novo em alguns minutos.</p></section>';
    }
    const ads = c.adsense || {};
    if (ads.ativo && /^ca-pub-\d{10,}$/.test(ads.publisher || "")) {
      const s = document.createElement("script"); s.async = true; s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ads.publisher;
      document.head.appendChild(s);
      document.querySelectorAll(".anuncio[data-slot]").forEach(div => {
        const slot = ads["slot_" + div.dataset.slot]; if (!slot) return;
        div.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + ads.publisher + '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    }
  }

  /* ---------- correções feitas no painel (aplicadas ao vivo) ---------- */
  let _corr;
  async function correcoes(idioma = "en") {
    if (_corr) return _corr;
    try {
      const linhas = await rest("correcoes?select=verbo,campo,valor&idioma=eq." + idioma + "&order=id.asc");
      _corr = {}; linhas.forEach(l => { (_corr[l.verbo] = _corr[l.verbo] || {})[l.campo] = l.valor; });
    } catch (e) { _corr = {}; }
    return _corr;
  }

  /* ---------- progresso do aluno (local + nuvem quando logado) ---------- */
  function progresso(idioma = "en") { return LS.get("tdl_prog_" + idioma, { cartoes: {}, xp: 0, dias: {}, licoes: {} }); }
  let _syncT;
  function salvarProgresso(p, idioma = "en") {
    LS.set("tdl_prog_" + idioma, p);
    clearTimeout(_syncT);
    _syncT = setTimeout(async () => {
      const u = await usuario(); if (!u) return;
      const c = await sb();
      await c.from("progresso").upsert({ user_id: u.id, idioma, dados: p, atualizado_em: new Date().toISOString() });
    }, 1500);
  }
  async function puxarProgresso(idioma = "en") {
    const u = await usuario(); if (!u) return;
    const c = await sb();
    const { data } = await c.from("progresso").select("dados").eq("idioma", idioma).maybeSingle();
    if (data && data.dados) {
      const local = progresso(idioma);
      if ((data.dados.xp || 0) >= (local.xp || 0)) LS.set("tdl_prog_" + idioma, data.dados);
      else salvarProgresso(local, idioma);
    }
  }
  function marcarDia(p) { const d = new Date().toISOString().slice(0, 10); p.dias[d] = (p.dias[d] || 0) + 1; return p; }
  function sequencia(p) {
    let n = 0; const d = new Date();
    for (;;) { const k = d.toISOString().slice(0, 10); if (p.dias[k]) { n++; d.setDate(d.getDate() - 1); } else break; }
    return n;
  }

  /* ---------- relatar erro / sugerir (retroalimenta o conteúdo) ---------- */
  function abrirSugestao(verbo = "", tipo = "erro") {
    let d = document.getElementById("dlg-sugestao");
    if (!d) {
      d = document.createElement("dialog"); d.id = "dlg-sugestao";
      d.innerHTML = '<form method="dialog" id="f-sug"><h3>Ajude a melhorar o conteúdo</h3>' +
        '<p>Sua mensagem vai para a fila de revisão e a correção aparece para todos.</p>' +
        '<label for="sug-tipo">Tipo</label><select id="sug-tipo"><option value="erro">Erro no significado ou na pronúncia</option><option value="ideia">Ideia ou sugestão</option><option value="idioma">Quero um novo idioma</option><option value="outro">Outro assunto</option></select>' +
        '<label for="sug-txt">Mensagem</label><textarea id="sug-txt" required minlength="3" maxlength="2000"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn" id="sug-enviar" value="enviar">Enviar</button><button class="btn sec" value="cancelar" formnovalidate>Cancelar</button></div><p class="form-msg" id="sug-msg"></p></form>';
      document.body.appendChild(d);
      d.querySelector("#sug-enviar").addEventListener("click", async (ev) => {
        ev.preventDefault();
        const msg = d.querySelector("#sug-msg"); const txt = d.querySelector("#sug-txt").value.trim();
        if (txt.length < 3) { msg.className = "form-msg erro"; msg.textContent = "Escreva pelo menos 3 letras."; return; }
        const u = await usuario();
        if (!u) { msg.className = "form-msg erro"; msg.innerHTML = 'Entre na sua conta para enviar. <a href="' + raiz + 'conta.html">Entrar ou criar conta</a>'; return; }
        const c = await sb();
        const { error } = await c.from("sugestoes").insert({ tipo: d.querySelector("#sug-tipo").value, verbo: d.dataset.verbo || null, texto: txt });
        if (error) { msg.className = "form-msg erro"; msg.textContent = "Não foi possível enviar: " + error.message; return; }
        d.close(); toast("Mensagem enviada. Obrigado por melhorar a Teia!");
      });
    }
    d.dataset.verbo = verbo; d.querySelector("#sug-tipo").value = tipo;
    d.querySelector("#sug-txt").value = verbo ? "Verbo \"" + verbo + "\": " : "";
    d.querySelector("#sug-msg").textContent = ""; d.showModal();
  }

  /* ---------- cabeçalho ---------- */
  async function montarCabecalho() {
    const btn = document.querySelector(".btn-menu"), menu = document.querySelector(".menu");
    if (btn && menu) btn.onclick = () => { const a = menu.classList.toggle("aberto"); btn.setAttribute("aria-expanded", a); };
    document.querySelectorAll("[data-acao='tema']").forEach(b => b.onclick = alternarTema);
    document.querySelectorAll("[data-acao='sugerir']").forEach(b => b.onclick = () => abrirSugestao(b.dataset.verbo || "", b.dataset.tipo || "erro"));
    const link = document.querySelector(".conta-link");
    if (link && LS.get("tdl_logado", false)) link.textContent = "Minha conta";
    usuario().then(u => {
      LS.set("tdl_logado", !!u);
      if (link) link.textContent = u ? "Minha conta" : "Entrar";
      if (u) puxarProgresso();
    });
    config().then(aplicarConfig);
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register(raiz + "sw.js").catch(() => {});
  }

  window.TDL = { raiz, LS, toast, falar, falarAdaptado, falarSilabas, fitaSilabas, sb, rest, usuario, config, correcoes,
    progresso, salvarProgresso, marcarDia, sequencia, abrirSugestao, alternarTema };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarCabecalho); else montarCabecalho();
})();
