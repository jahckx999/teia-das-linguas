/* Treino: repetição espaçada, quiz, ditado, fala e conjugação */
(async function () {
  const T = window.TDL, { raiz, falar, falarAdaptado, toast } = T;
  const idioma = document.body.dataset.idioma || "en";
  const area = document.getElementById("treino"), abas = document.getElementById("modos"), selNivel = document.getElementById("nivel-treino");
  const placar = document.getElementById("placar");
  const url = new URLSearchParams(location.search);
  let dados = [];
  try { dados = (await (await fetch(raiz + "dados/" + idioma + "/indice.json")).json()).filter(d => d.pt && !d.x); }
  catch (e) { area.innerHTML = '<div class="vazio">Não foi possível carregar os verbos. Recarregue a página.</div>'; return; }
  const corr = await T.correcoes(idioma);
  dados.forEach(d => { const c = corr[d.v]; if (c && c.pt) d.pt = c.pt; if (c && c.pr) d.pr = c.pr; });

  let p = T.progresso(idioma);
  selNivel.value = url.get("n") || T.LS.get("tdl_nivel", "A1");
  selNivel.onchange = () => { T.LS.set("tdl_nivel", selNivel.value); iniciar(modo); };

  const DIA = 864e5;
  const intervalos = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 16, 5: 35, 6: 90 };
  const sig = d => d.pt.split(";")[0].replace(/\(.*?\)/g, "").trim();
  const embaralhar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const doNivel = () => { const ordem = ["A1", "A2", "B1", "B2", "C1", "C2"]; const ate = ordem.indexOf(selNivel.value); return dados.filter(d => ordem.indexOf(d.n) <= ate && (d.n === selNivel.value || Math.random() < 0.25)); };

  function atualizarPlacar() {
    const cart = Object.values(p.cartoes), agora = Date.now();
    const devidos = cart.filter(c => c.prox <= agora).length;
    placar.innerHTML = "<span>⚡ " + (p.xp || 0) + " XP</span><span>🔥 " + T.sequencia(p) + " dia(s) seguidos</span><span>🧠 " + cart.length + " verbos estudados</span><span>⏰ " + devidos + " para revisar</span>";
  }
  function ganhar(xp) { p.xp = (p.xp || 0) + xp; T.marcarDia(p); T.salvarProgresso(p, idioma); atualizarPlacar(); }

  /* ----- 1. Repetição espaçada (cartões) ----- */
  function proximoCartao() {
    const agora = Date.now();
    const devidos = Object.entries(p.cartoes).filter(([, c]) => c.prox <= agora).map(([v]) => dados.find(d => d.v === v)).filter(Boolean);
    if (devidos.length) return devidos[0];
    const novos = doNivel().filter(d => !p.cartoes[d.v]).sort((a, b) => a.r - b.r);
    return novos[0] || null;
  }
  function modoCartoes() {
    const d = proximoCartao();
    if (!d) { area.innerHTML = '<div class="cartao"><h2>Tudo revisado por hoje</h2><p>Volte amanhã para manter a memória fresca, ou suba de nível.</p></div>'; return; }
    area.innerHTML = '<div class="cartao"><span class="selo n-' + d.n + '">' + d.n + '</span><div class="frente">' + d.v + '</div>' +
      '<div class="sons" style="justify-content:center"><button class="som" id="c-en">Ouvir em inglês</button>' + (d.pr ? '<button class="som" id="c-pt">Ouvir adaptada</button>' : '') + '</div>' +
      '<div id="verso" hidden><p class="signif">' + d.pt + '</p><p>' + (d.pr || "") + '</p><div id="c-fita" style="display:flex;justify-content:center;margin:10px 0"></div>' +
      '<p style="color:var(--tinta-2)">Quão fácil foi lembrar?</p><div class="opcoes" style="grid-template-columns:repeat(4,1fr)">' +
      '<button data-q="0">Errei</button><button data-q="1">Difícil</button><button data-q="2">Bom</button><button data-q="3">Fácil</button></div></div>' +
      '<button class="btn" id="virar" style="margin-top:18px">Mostrar resposta</button></div>';
    falar(d.v, "en-US");
    area.querySelector("#c-en").onclick = () => falar(d.v, "en-US");
    const bpt = area.querySelector("#c-pt"); if (bpt) bpt.onclick = () => falarAdaptado(d.pr);
    area.querySelector("#virar").onclick = (e) => { area.querySelector("#verso").hidden = false; e.target.hidden = true; if (d.sil) area.querySelector("#c-fita").appendChild(T.fitaSilabas(d.sil)); };
    area.querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
      const q = +b.dataset.q, c = p.cartoes[d.v] || { caixa: 0, prox: 0, vistos: 0 };
      c.caixa = q === 0 ? 1 : Math.min(6, c.caixa + q); c.vistos++;
      c.prox = Date.now() + (q === 0 ? 60e3 : intervalos[c.caixa] * DIA);
      p.cartoes[d.v] = c; ganhar(q === 0 ? 1 : 5 + q * 2); modoCartoes();
    });
  }

  /* ----- 2. Quiz de significado ----- */
  function modoQuiz() {
    const base = doNivel(); if (base.length < 4) { area.innerHTML = '<div class="vazio">Poucos verbos neste nível ainda.</div>'; return; }
    const d = base[Math.random() * base.length | 0];
    const erradas = embaralhar(base.filter(x => sig(x) !== sig(d))).slice(0, 3);
    const ops = embaralhar([d, ...erradas]);
    area.innerHTML = '<div class="cartao"><p>O que significa</p><div class="frente">' + d.v + '</div><button class="som" id="q-en">Ouvir</button><div class="opcoes">' +
      ops.map(o => '<button data-v="' + o.v + '">' + sig(o) + '</button>').join("") + '</div></div>';
    area.querySelector("#q-en").onclick = () => falar(d.v, "en-US");
    area.querySelectorAll("[data-v]").forEach(b => b.onclick = () => {
      const ok = b.dataset.v === d.v;
      area.querySelectorAll("[data-v]").forEach(x => { x.disabled = true; if (x.dataset.v === d.v) x.classList.add("certa"); });
      if (!ok) b.classList.add("errada");
      ganhar(ok ? 6 : 1); falar(d.v, "en-US");
      setTimeout(modoQuiz, ok ? 900 : 1900);
    });
  }

  /* ----- 3. Ditado (ouvir e escrever) ----- */
  function modoDitado() {
    const base = doNivel().filter(d => !d.f); const d = base[Math.random() * base.length | 0];
    area.innerHTML = '<div class="cartao"><p>Ouça e escreva o verbo em inglês</p><button class="btn" id="d-ouvir">▶ Ouvir</button>' +
      '<form id="d-f" style="margin-top:18px"><input id="d-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Sua resposta"><button class="btn" style="margin-top:10px">Conferir</button></form><p id="d-res" class="form-msg"></p></div>';
    const ouvir = () => falar(d.v, "en-US", { rate: 0.8 }); ouvir();
    area.querySelector("#d-ouvir").onclick = ouvir;
    area.querySelector("#d-in").focus();
    area.querySelector("#d-f").onsubmit = (e) => {
      e.preventDefault(); const r = area.querySelector("#d-in").value.trim().toLowerCase(), out = area.querySelector("#d-res");
      if (r === d.v) { out.className = "form-msg ok"; out.textContent = "Certo! " + d.v + " = " + sig(d); ganhar(8); setTimeout(modoDitado, 1300); }
      else { out.className = "form-msg erro"; out.textContent = "Era \"" + d.v + "\" (" + sig(d) + ")."; ganhar(1); setTimeout(modoDitado, 2400); }
    };
  }

  /* ----- 4. Fala (reconhecimento de voz) ----- */
  function modoFala() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { area.innerHTML = '<div class="cartao"><h2>Seu navegador não ouve sua voz</h2><p>O treino de fala funciona no Chrome e no Edge (computador e Android). Os outros modos funcionam em qualquer navegador.</p></div>'; return; }
    const base = doNivel().filter(d => d.pr); const d = base[Math.random() * base.length | 0];
    area.innerHTML = '<div class="cartao"><p>Diga em voz alta</p><div class="frente">' + d.v + '</div><p>' + d.pr + '</p><div id="f-fita" style="display:flex;justify-content:center"></div>' +
      '<div class="sons" style="justify-content:center;margin:14px 0"><button class="som" id="f-en">Ouvir modelo</button></div><button class="btn" id="f-gravar">🎙 Falar agora</button><p id="f-res" class="form-msg"></p><button class="btn sec peq" id="f-prox" style="margin-top:10px">Próximo</button></div>';
    if (d.sil) area.querySelector("#f-fita").appendChild(T.fitaSilabas(d.sil));
    area.querySelector("#f-en").onclick = () => falar(d.v, "en-US");
    area.querySelector("#f-prox").onclick = modoFala;
    area.querySelector("#f-gravar").onclick = () => {
      const r = new R(); r.lang = "en-US"; r.maxAlternatives = 5; const out = area.querySelector("#f-res");
      out.className = "form-msg"; out.textContent = "Ouvindo…";
      r.onresult = (ev) => {
        const alts = [...ev.results[0]].map(a => a.transcript.trim().toLowerCase().replace(/[.!?]/g, ""));
        if (alts.some(a => a === d.v || a.endsWith(" " + d.v) || a.startsWith(d.v))) { out.className = "form-msg ok"; out.textContent = "Perfeito! Entendi \"" + alts[0] + "\"."; ganhar(10); }
        else { out.className = "form-msg erro"; out.textContent = "Entendi \"" + alts[0] + "\". Ouça o modelo e tente de novo, prestando atenção na sílaba destacada."; ganhar(1); }
      };
      r.onerror = (e) => { out.className = "form-msg erro"; out.textContent = e.error === "not-allowed" ? "Permita o uso do microfone para treinar a fala." : "Não consegui ouvir. Tente de novo em um lugar silencioso."; };
      r.start();
    };
  }

  /* ----- 5. Conjugação (passado e particípio) ----- */
  const detCache = {};
  async function detalhes(v) {
    const l = /[a-z]/.test(v[0]) ? v[0] : "0";
    if (!detCache[l]) detCache[l] = await (await fetch(raiz + "dados/" + idioma + "/detalhes/" + l + ".json")).json();
    return detCache[l][v];
  }
  async function modoConjugacao() {
    const base = doNivel().filter(d => !d.f && (d.i || Math.random() < 0.3));
    const d = base[Math.random() * base.length | 0]; const det = await detalhes(d.v);
    const pede = Math.random() < 0.5 ? "past" : "pp"; const nome = pede === "past" ? "passado simples" : "particípio passado";
    area.innerHTML = '<div class="cartao"><p>Escreva o <b>' + nome + '</b> de</p><div class="frente">' + d.v + '</div><p style="color:var(--tinta-2)">' + sig(d) + '</p>' +
      '<form id="cj-f"><input id="cj-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Sua resposta"><button class="btn" style="margin-top:10px">Conferir</button></form><p id="cj-res" class="form-msg"></p></div>';
    area.querySelector("#cj-in").focus();
    area.querySelector("#cj-f").onsubmit = (e) => {
      e.preventDefault(); const r = area.querySelector("#cj-in").value.trim().toLowerCase(), certo = det[pede].split("/"), out = area.querySelector("#cj-res");
      if (certo.includes(r)) { out.className = "form-msg ok"; out.textContent = "Certo! " + d.v + " → " + det.past + " → " + det.pp; ganhar(8); falar(r, "en-US"); setTimeout(modoConjugacao, 1500); }
      else { out.className = "form-msg erro"; out.textContent = "Resposta: " + det[pede] + "  (" + d.v + " → " + det.past + " → " + det.pp + ")"; ganhar(1); falar(certo[0], "en-US"); setTimeout(modoConjugacao, 2800); }
    };
  }

  const MODOS = { cartoes: modoCartoes, quiz: modoQuiz, ditado: modoDitado, fala: modoFala, conjugacao: modoConjugacao };
  let modo = MODOS[url.get("modo")] ? url.get("modo") : "cartoes";
  function iniciar(m) {
    modo = m; abas.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.modo === m)));
    MODOS[m]();
  }
  abas.querySelectorAll("button").forEach(b => b.onclick = () => iniciar(b.dataset.modo));
  atualizarPlacar(); iniciar(modo);
})();
