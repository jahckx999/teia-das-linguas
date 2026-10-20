/* Dicionário de verbos: busca, filtros, ordem alfabética, inglês→português e português→inglês */
(async function () {
  const { raiz, falar, falarAdaptado, correcoes, LS } = window.TDL;
  const lista = document.getElementById("lista"), cont = document.getElementById("contagem");
  const q = document.getElementById("q"), dir = document.getElementById("dir"), niv = document.getElementById("nivel"), tipo = document.getElementById("tipo");
  const alfa = document.getElementById("alfabeto"), maisBtn = document.getElementById("mais");
  const idioma = document.body.dataset.idioma || "en";
  const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
  const slug = v => v.replace(/'/g, "").replace(/[ ]+/g, "-");
  const tirarAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  lista.innerHTML = '<div class="vazio">Carregando os verbos…</div>';
  let dados;
  try {
    dados = await (await fetch(raiz + "dados/" + idioma + "/indice.json")).json();
  } catch (e) {
    lista.innerHTML = '<div class="vazio">Não foi possível carregar a lista. Verifique sua conexão e recarregue a página.</div>'; return;
  }
  const corr = await correcoes(idioma);
  dados.forEach(d => { const c = corr[d.v]; if (c) { if (c.pt) d.pt = c.pt; if (c.pr) d.pr = c.pr; if (c.sil) d.sil = c.sil; if (c.nivel) d.n = c.nivel; } });

  // índice português → inglês
  let reverso = null;
  function montarReverso() {
    const m = new Map();
    dados.forEach(d => {
      if (!d.pt) return;
      d.pt.split(";").forEach(s => {
        const termo = s.replace(/\(.*?\)/g, "").trim().toLowerCase();
        if (!termo) return;
        if (!m.has(termo)) m.set(termo, []);
        m.get(termo).push(d);
      });
    });
    reverso = [...m.entries()].map(([t, vs]) => ({ t, vs: vs.sort((a, b) => a.r - b.r) }))
      .sort((a, b) => tirarAcento(a.t).localeCompare(tirarAcento(b.t)));
  }

  // letras
  let letra = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = L; b.setAttribute("aria-pressed", "false");
    b.onclick = () => { letra = letra === L.toLowerCase() ? "" : L.toLowerCase(); render(true); };
    alfa.appendChild(b);
  });

  // estado inicial pela URL (?q=give&n=A1)
  const url = new URLSearchParams(location.search);
  if (url.get("q")) q.value = url.get("q");
  if (url.get("n")) niv.value = url.get("n");
  if (url.get("dir")) dir.value = url.get("dir");
  if (url.get("tipo")) tipo.value = url.get("tipo");

  let filtrados = [], mostrados = 0;
  const POR_PAGINA = 60;

  function filtrar() {
    const termo = tirarAcento(q.value.trim());
    if (dir.value === "pt") {
      if (!reverso) montarReverso();
      return reverso.filter(e =>
        (!letra || tirarAcento(e.t).startsWith(letra)) &&
        (!termo || tirarAcento(e.t).includes(termo)) &&
        (!niv.value || e.vs.some(v => v.n === niv.value)));
    }
    return dados.filter(d =>
      (!letra || d.v.startsWith(letra)) &&
      (!niv.value || d.n === niv.value) &&
      (tipo.value !== "irr" || d.i) && (tipo.value !== "reg" || !d.i) &&
      (tipo.value !== "fras" || d.f) && (tipo.value !== "simples" || !d.f) &&
      (tipo.value !== "trad" || d.pt) &&
      (!termo || d.v.includes(termo) || tirarAcento(d.pt || "").includes(termo)))
      .sort((a, b) => {
        if (termo) { const ea = a.v === termo ? 0 : a.v.startsWith(termo) ? 1 : 2, eb = b.v === termo ? 0 : b.v.startsWith(termo) ? 1 : 2; if (ea !== eb) return ea - eb; }
        return a.v.localeCompare(b.v);
      });
  }

  function linhaVerbo(d) {
    const el = document.createElement("article"); el.className = "verbo";
    const sil = d.sil ? d.sil.replace(/([A-ZÁÉÍÓÚÂÊÔ]{2,}|\b[A-ZÁÉÍÓÚÂÊÔ]\b)/g, "<b>$1</b>") : "";
    el.innerHTML =
      '<div class="v-nome"><a href="' + raiz + idioma + '/verbos/' + slug(d.v) + '.html">' + d.v + '</a> <span class="selo n-' + d.n + '">' + d.n + '</span>' +
      (d.i ? ' <span class="selo" style="--cor:var(--acafrao)">irregular</span>' : '') + '</div>' +
      '<div class="v-sig">' + (d.pt || '<i style="color:var(--tinta-3)">tradução na fila da automação</i>') + '</div>' +
      '<div class="v-pr">' + (d.pr ? d.pr + '<br><span style="color:var(--tinta-3)">' + sil + '</span>' : '<span style="color:var(--tinta-3)">pronúncia em revisão</span>') + '</div>' +
      '<div class="sons"><button class="som" type="button" data-s="en" aria-label="Ouvir ' + d.v + ' em inglês">' + ICONE + 'Inglês</button>' +
      (d.pr ? '<button class="som" type="button" data-s="pt" aria-label="Ouvir a pronúncia adaptada de ' + d.v + '">' + ICONE + 'Adaptada</button>' : '') + '</div>';
    el.querySelector('[data-s="en"]').onclick = () => falar(d.v, "en-US");
    const bpt = el.querySelector('[data-s="pt"]'); if (bpt) bpt.onclick = () => falarAdaptado(d.pr);
    return el;
  }
  function linhaReversa(e) {
    const el = document.createElement("article"); el.className = "verbo";
    el.style.gridTemplateColumns = "minmax(150px,1fr) 2fr auto";
    const top = e.vs.slice(0, 6);
    el.innerHTML = '<div class="v-nome">' + e.t + '</div><div class="v-sig">' +
      top.map(v => '<a href="' + raiz + idioma + '/verbos/' + slug(v.v) + '.html">' + v.v + '</a> <span class="selo n-' + v.n + '">' + v.n + '</span>').join(" &nbsp; ") +
      '</div><div class="sons"><button class="som" type="button">' + ICONE + top[0].v + '</button></div>';
    el.querySelector(".som").onclick = () => falar(top[0].v, "en-US");
    return el;
  }

  function render(reset) {
    alfa.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.textContent.toLowerCase() === letra)));
    if (reset) { filtrados = filtrar(); mostrados = 0; lista.innerHTML = ""; }
    const frag = document.createDocumentFragment();
    filtrados.slice(mostrados, mostrados + POR_PAGINA).forEach(d => frag.appendChild(dir.value === "pt" ? linhaReversa(d) : linhaVerbo(d)));
    lista.appendChild(frag); mostrados += POR_PAGINA;
    const total = filtrados.length;
    cont.textContent = total.toLocaleString("pt-BR") + (dir.value === "pt" ? " termos em português" : " verbos") + (total > 0 ? " · mostrando " + Math.min(mostrados, total).toLocaleString("pt-BR") : "");
    if (!total) lista.innerHTML = '<div class="vazio">Nenhum resultado. Tente outra palavra, tire o filtro de nível ou troque a direção da busca.</div>';
    maisBtn.hidden = mostrados >= total;
    tipo.disabled = dir.value === "pt";
  }

  let t; q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => render(true), 160); });
  [dir, niv, tipo].forEach(el => el.addEventListener("change", () => render(true)));
  maisBtn.onclick = () => render(false);
  render(true);
})();
