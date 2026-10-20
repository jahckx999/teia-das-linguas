/* Painel de controle unificado — Teia das Línguas (somente administrador) */
(async function () {
  const T = window.TDL, raiz = T.raiz, app = document.getElementById("painel");
  const c = await T.sb();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const dataBR = d => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

  /* ---------- acesso ---------- */
  const { data: ses } = await c.auth.getSession();
  if (!ses.session) {
    app.innerHTML = '<div class="bloco estreita"><h2>Entre para administrar</h2><p>O painel é exclusivo do administrador.</p><form id="f"><label for="em">E-mail</label><input id="em" type="email" required autocomplete="email"><label for="se">Senha</label><input id="se" type="password" required autocomplete="current-password"><button class="btn" style="margin-top:14px">Entrar</button><p class="form-msg" id="m"></p></form><p style="margin-top:12px">Primeira vez? <a href="../conta.html#criar">Crie sua conta</a> com o e-mail de administrador e confirme pelo link enviado.</p></div>';
    const f = app.querySelector("#f");
    f.onsubmit = async e => { e.preventDefault(); const { error } = await c.auth.signInWithPassword({ email: f.em.value.trim(), password: f.se.value }); if (error) { f.querySelector("#m").className = "form-msg erro"; f.querySelector("#m").textContent = "E-mail ou senha incorretos, ou e-mail ainda não confirmado."; } else location.reload(); };
    return;
  }
  const { data: admin } = await c.rpc("is_admin");
  if (!admin) { app.innerHTML = '<div class="bloco"><h2>Acesso restrito</h2><p>Esta conta não é de administrador.</p><a class="btn sec" href="../index.html">Voltar ao site</a></div>'; return; }

  /* ---------- estrutura ---------- */
  const ABAS = [["geral", "Visão geral"], ["comandos", "Comandos"], ["conteudo", "Conteúdo"], ["sugestoes", "Sugestões"], ["idiomas", "Idiomas"], ["monetizacao", "Monetização"], ["config", "Configurações"], ["diagnostico", "Diagnóstico"]];
  app.innerHTML = '<div class="secao-titulo"><div><h1 style="font-size:2rem">Painel de controle</h1><p>Conectado como ' + esc(ses.session.user.email) + '</p></div><div style="display:flex;gap:8px"><a class="btn sec peq" href="../index.html">Ver site</a><button class="btn sec peq" id="sair">Sair</button></div></div>' +
    '<div class="abas" role="tablist">' + ABAS.map(([k, n]) => '<button role="tab" data-aba="' + k + '">' + n + '</button>').join("") + '</div><div id="conteudo-aba"></div>';
  app.querySelector("#sair").onclick = async () => { await c.auth.signOut(); location.reload(); };
  const alvo = app.querySelector("#conteudo-aba");
  app.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => abrir(b.dataset.aba));

  async function getConfig() { const { data } = await c.from("config").select("chave,valor"); const o = {}; (data || []).forEach(l => o[l.chave] = l.valor); return o; }
  async function setConfig(chave, valor) { const { error } = await c.from("config").upsert({ chave, valor, atualizado_em: new Date().toISOString() }); try { sessionStorage.removeItem("tdl_cfg"); } catch (e) {} return error; }
  async function comando(texto, tipo = "livre") { const { error } = await c.from("comandos").insert({ texto, tipo }); T.toast(error ? "Erro: " + error.message : "Comando enviado para a fila. A automação executa na próxima rodada."); return !error; }
  async function statusDados(idioma = "en") { try { return await (await fetch(raiz + "dados/" + idioma + "/status.json?t=" + Date.now())).json(); } catch (e) { return null; } }

  /* ---------- 1. Visão geral ---------- */
  async function abaGeral() {
    const [{ data: est, error }, st, cfg] = await Promise.all([c.rpc("estatisticas_admin"), statusDados(), getConfig()]);
    const a = cfg.automacao || {};
    const pct = st ? Math.round(st.traduzidos / st.total * 100) : 0;
    alvo.innerHTML =
      '<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      card("Alunos cadastrados", est ? est.usuarios : "—", est ? "+" + est.usuarios_7d + " nos últimos 7 dias" : esc(error && error.message)) +
      card("Alunos ativos (7 dias)", est ? est.ativos_7d : "—", "estudaram e salvaram progresso") +
      card("Verbos de inglês", st ? st.total.toLocaleString("pt-BR") : "—", st ? st.traduzidos.toLocaleString("pt-BR") + " traduzidos (" + pct + "%)" : "") +
      card("Comandos na fila", est ? est.comandos_pendentes : "—", "executados pela automação") +
      card("Sugestões novas", est ? est.sugestoes_novas : "—", "enviadas pelos alunos") +
      card("Correções ao vivo", est ? est.correcoes : "—", "feitas por você no painel") + '</div>' +
      '<div class="bloco" style="margin-top:16px"><h3>Automação diária</h3><p>Status: <b>' + (a.ativa ? "ligada" : "pausada") + '</b> · ritmo: ' + (a.verbos_por_dia || 50) + ' verbos e ' + (a.licoes_por_dia || 1) + ' lição por dia · última execução: ' + dataBR(a.ultima_execucao) + '</p>' +
      (a.ultimo_relatorio ? '<p style="color:var(--tinta-2)">' + esc(a.ultimo_relatorio) + '</p>' : '') +
      '<div class="barra" style="margin:10px 0 16px"><i style="width:' + pct + '%"></i></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" id="rodar">Rodar automação agora</button><button class="btn sec" id="pausar">' + (a.ativa ? "Pausar automação" : "Ligar automação") + '</button><button class="btn sec" id="ir-diag">Fazer diagnóstico</button></div></div>' +
      (st ? '<div class="bloco" style="margin-top:16px"><h3>Progresso por nível</h3><table class="tabela"><tr><th>Nível</th><td><b>Traduzidos / total</b></td></tr>' +
        Object.entries(st.por_nivel).map(([n, v]) => '<tr><th><span class="selo n-' + n + '">' + n + '</span></th><td>' + v.traduzidos + ' / ' + v.total + '</td></tr>').join("") + '</table></div>' : '');
    alvo.querySelector("#rodar").onclick = () => comando("Rodar a automação completa agora: traduzir o próximo lote, aplicar correções e sugestões, publicar.", "rodar_agora");
    alvo.querySelector("#pausar").onclick = async () => { a.ativa = !a.ativa; const e = await setConfig("automacao", a); T.toast(e ? "Erro: " + e.message : a.ativa ? "Automação ligada." : "Automação pausada."); abaGeral(); };
    alvo.querySelector("#ir-diag").onclick = () => abrir("diagnostico");
  }
  const card = (t, n, s) => '<div class="bloco"><p style="margin:0;color:var(--tinta-2);font-size:.9rem">' + t + '</p><h2 style="margin:.2em 0">' + n + '</h2><p style="margin:0;font-size:.85rem;color:var(--tinta-3)">' + s + '</p></div>';

  /* ---------- 2. Comandos ---------- */
  const RAPIDOS = [
    ["Traduzir o próximo lote de 200 verbos para o português", "traduzir"],
    ["Completar a pronúncia adaptada dos verbos que ainda não têm", "pronuncia"],
    ["Criar 1 lição nova de gramática para o nível mais acessado", "licao"],
    ["Adicionar frases de exemplo traduzidas aos 100 verbos mais usados", "exemplos"],
    ["Revisar e aplicar todas as sugestões novas dos alunos", "sugestoes"],
    ["Gerar áudios ElevenLabs dos 100 verbos mais usados", "audio"],
    ["Criar o arquivo ads.txt com o ID do AdSense salvo no painel", "adstxt"],
    ["Fazer uma auditoria de SEO e corrigir o que for preciso", "seo"]
  ];
  async function abaComandos() {
    const { data } = await c.from("comandos").select("*").order("id", { ascending: false }).limit(40);
    alvo.innerHTML = '<div class="bloco"><h3>Peça qualquer mudança em português</h3><p>Escreva como falaria comigo. Exemplos: "adicione o espanhol", "mude a cor principal para verde", "crie uma página sobre phrasal verbs de viagem".</p>' +
      '<form id="f"><textarea id="tx" required maxlength="4000" placeholder="O que você quer que eu faça no site?"></textarea><button class="btn" style="margin-top:10px">Enviar comando</button></form></div>' +
      '<div class="bloco" style="margin-top:16px"><h3>Atalhos de um clique</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + RAPIDOS.map(([t, k], i) => '<button class="btn sec peq" data-r="' + i + '">' + esc(t) + '</button>').join("") + '</div></div>' +
      '<div class="bloco" style="margin-top:16px"><h3>Histórico</h3>' + (data && data.length ? '<table class="tabela">' + data.map(cm =>
        '<tr><th>' + dataBR(cm.criado_em) + '<br><span class="selo" style="--cor:' + ({ pendente: "var(--acafrao)", feito: "var(--ok)", erro: "var(--erro)", executando: "var(--fio)", cancelado: "var(--tinta-3)" }[cm.status]) + '">' + cm.status + '</span></th><td>' + esc(cm.texto) +
        (cm.resultado ? '<br><span style="color:var(--tinta-2);font-size:.92rem">' + esc(cm.resultado) + '</span>' : '') +
        (cm.status === "pendente" ? '<br><button class="btn sec peq" data-cancel="' + cm.id + '" style="margin-top:6px">Cancelar</button>' : '') + '</td></tr>').join("") + '</table>' : '<p>Nenhum comando ainda.</p>') + '</div>';
    alvo.querySelector("#f").onsubmit = async e => { e.preventDefault(); if (await comando(alvo.querySelector("#tx").value.trim())) abaComandos(); };
    alvo.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => { const [t, k] = RAPIDOS[+b.dataset.r]; if (await comando(t, k)) abaComandos(); });
    alvo.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => { await c.from("comandos").update({ status: "cancelado" }).eq("id", +b.dataset.cancel); abaComandos(); });
  }

  /* ---------- 3. Conteúdo (correções ao vivo) ---------- */
  let indice;
  async function abaConteudo() {
    if (!indice) indice = await (await fetch(raiz + "dados/en/indice.json")).json();
    const { data: recentes } = await c.from("correcoes").select("*").order("id", { ascending: false }).limit(30);
    alvo.innerHTML = '<div class="bloco"><h3>Editar um verbo</h3><p>A correção aparece para todos na hora e entra nos arquivos na próxima automação.</p>' +
      '<label for="bq">Buscar verbo em inglês</label><input id="bq" list="dl" placeholder="ex.: give up"><datalist id="dl"></datalist><div id="ed"></div></div>' +
      '<div class="bloco" style="margin-top:16px"><h3>Correções recentes</h3>' + (recentes && recentes.length ? '<table class="tabela">' + recentes.map(r =>
        '<tr><th>' + esc(r.verbo) + ' · ' + r.campo + '</th><td>' + esc(r.valor) + ' <button class="btn sec peq" data-del="' + r.id + '">Desfazer</button></td></tr>').join("") + '</table>' : '<p>Nenhuma correção ainda.</p>') + '</div>';
    const bq = alvo.querySelector("#bq"), dl = alvo.querySelector("#dl");
    bq.oninput = () => { const t = bq.value.toLowerCase().trim(); dl.innerHTML = indice.filter(d => d.v.startsWith(t)).slice(0, 12).map(d => '<option value="' + esc(d.v) + '">').join(""); const d = indice.find(x => x.v === t); if (d) editor(d); };
    alvo.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await c.from("correcoes").delete().eq("id", +b.dataset.del); T.toast("Correção desfeita."); abaConteudo(); });
  }
  function editor(d) {
    const ed = alvo.querySelector("#ed");
    ed.innerHTML = '<form id="fe" style="margin-top:12px"><h3>' + esc(d.v) + ' <span class="selo n-' + d.n + '">' + d.n + '</span></h3>' +
      '<label>Significado em português</label><input name="pt" value="' + esc(d.pt) + '">' +
      '<label>Pronúncia adaptada</label><input name="pr" value="' + esc(d.pr) + '">' +
      '<label>Pronúncia por sílabas (tônica em MAIÚSCULAS)</label><input name="sil" value="' + esc(d.sil) + '">' +
      '<label>Nível CEFR</label><select name="nivel">' + ["A1", "A2", "B1", "B2", "C1", "C2"].map(n => '<option' + (n === d.n ? " selected" : "") + '>' + n + '</option>').join("") + '</select>' +
      '<label>Frase de exemplo (inglês = português)</label><input name="ex" placeholder="I give up. = Eu desisto.">' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn">Salvar correção</button><button type="button" class="btn sec" id="ouvir">Ouvir adaptada</button></div></form>';
    const f = ed.querySelector("#fe");
    f.querySelector("#ouvir").onclick = () => T.falarAdaptado(f.pr.value);
    f.onsubmit = async e => {
      e.preventDefault(); const linhas = [];
      [["pt", d.pt], ["pr", d.pr], ["sil", d.sil], ["nivel", d.n], ["ex", ""]].forEach(([k, antes]) => { const v = f[k].value.trim(); if (v && v !== antes) linhas.push({ idioma: "en", verbo: d.v, campo: k, valor: v }); });
      if (!linhas.length) return T.toast("Nada mudou.");
      const { error } = await c.from("correcoes").insert(linhas);
      T.toast(error ? "Erro: " + error.message : "Correção salva e já visível no site."); if (!error) { Object.assign(d, { pt: f.pt.value, pr: f.pr.value, sil: f.sil.value, n: f.nivel.value }); abaConteudo(); }
    };
  }

  /* ---------- 4. Sugestões dos alunos ---------- */
  async function abaSugestoes() {
    const { data } = await c.from("sugestoes").select("*").order("id", { ascending: false }).limit(60);
    alvo.innerHTML = '<div class="bloco"><h3>O que os alunos estão pedindo</h3><p>Erros relatados viram correções; pedidos de idioma entram na fila de idiomas.</p>' +
      '<div style="margin-bottom:12px"><button class="btn sec peq" id="todas">Mandar a automação revisar todas as novas</button></div>' +
      (data && data.length ? '<table class="tabela">' + data.map(s => '<tr><th>' + dataBR(s.criado_em) + '<br><span class="selo" style="--cor:var(--fio)">' + s.tipo + '</span> <span class="selo" style="--cor:' + (s.status === "nova" ? "var(--acafrao)" : "var(--tinta-3)") + '">' + s.status + '</span></th><td>' +
        (s.verbo ? '<b>' + esc(s.verbo) + '</b>: ' : '') + esc(s.texto) + (s.status === "nova" ? '<br><button class="btn sec peq" data-st="aplicada" data-id="' + s.id + '">Marcar como aplicada</button> <button class="btn sec peq" data-st="ignorada" data-id="' + s.id + '">Ignorar</button>' : '') + '</td></tr>').join("") + '</table>' : '<p>Nenhuma sugestão ainda.</p>') + '</div>';
    alvo.querySelector("#todas").onclick = () => comando("Revisar e aplicar todas as sugestões novas dos alunos", "sugestoes");
    alvo.querySelectorAll("[data-st]").forEach(b => b.onclick = async () => { await c.from("sugestoes").update({ status: b.dataset.st }).eq("id", +b.dataset.id); abaSugestoes(); });
  }

  /* ---------- 5. Idiomas ---------- */
  const TODOS = { en: "Inglês", es: "Espanhol", fr: "Francês", de: "Alemão", it: "Italiano", ja: "Japonês", zh: "Chinês (mandarim)", ko: "Coreano", ru: "Russo", ar: "Árabe", nl: "Holandês", tr: "Turco", pl: "Polonês", sv: "Sueco", hi: "Hindi", he: "Hebraico", el: "Grego", eo: "Esperanto", la: "Latim", "pt-en": "Português para falantes de inglês" };
  async function abaIdiomas() {
    const cfg = await getConfig(); const id = cfg.idiomas || { ativos: ["en"], fila: [] };
    alvo.innerHTML = '<div class="bloco"><h3>Idiomas no ar</h3><p>' + id.ativos.map(k => '<span class="selo" style="--cor:var(--ok);font-size:.95rem">' + esc(TODOS[k] || k) + '</span>').join(" ") + '</p>' +
      '<h3 style="margin-top:20px">Fila de produção</h3><p>A automação constrói o próximo idioma da fila: lista completa de verbos, significado em português, pronúncia adaptada, sílabas, níveis CEFR e trilhas.</p>' +
      '<ol>' + (id.fila || []).map((k, i) => '<li style="margin:6px 0">' + esc(TODOS[k] || k) + ' <button class="btn sec peq" data-sobe="' + i + '">Priorizar</button> <button class="btn sec peq" data-tira="' + i + '">Remover</button></li>').join("") + '</ol>' +
      '<label for="novo">Adicionar idioma à fila</label><div style="display:flex;gap:8px"><select id="novo">' + Object.entries(TODOS).filter(([k]) => !id.ativos.includes(k) && !(id.fila || []).includes(k)).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join("") + '</select><button class="btn" id="add">Adicionar</button></div>' +
      '<div style="margin-top:16px"><button class="btn sec" id="construir">Construir o primeiro da fila agora</button></div></div>';
    const salvar = async () => { const e = await setConfig("idiomas", id); if (e) T.toast("Erro: " + e.message); abaIdiomas(); };
    alvo.querySelector("#add").onclick = () => { id.fila = id.fila || []; id.fila.push(alvo.querySelector("#novo").value); salvar(); };
    alvo.querySelectorAll("[data-sobe]").forEach(b => b.onclick = () => { const [x] = id.fila.splice(+b.dataset.sobe, 1); id.fila.unshift(x); salvar(); });
    alvo.querySelectorAll("[data-tira]").forEach(b => b.onclick = () => { id.fila.splice(+b.dataset.tira, 1); salvar(); });
    alvo.querySelector("#construir").onclick = () => id.fila && id.fila.length ? comando("Construir o pacote completo do idioma " + (TODOS[id.fila[0]] || id.fila[0]) + " (" + id.fila[0] + ") e publicar no site", "idioma") : T.toast("A fila está vazia.");
  }

  /* ---------- 6. Monetização ---------- */
  async function abaMonetizacao() {
    const cfg = await getConfig(); const a = cfg.adsense || {}; const st = await statusDados();
    const checklist = [
      ["Política de privacidade publicada", true], ["Termos de uso e página de contato", true],
      ["Conteúdo original em volume (mais de 30 páginas)", st && st.total > 30],
      ["Domínio próprio conectado", !location.hostname.endsWith("github.io")],
      ["ID de editor (ca-pub-…) salvo", /^ca-pub-\d{10,}$/.test(a.publisher || "")],
      ["Arquivo ads.txt publicado", null]
    ];
    alvo.innerHTML = '<div class="bloco"><h3>Google AdSense</h3><p>Cole os dados da sua conta AdSense. O código dos anúncios é inserido automaticamente em todas as páginas, sem mexer em código.</p>' +
      '<form id="f"><label for="pub">ID de editor</label><input id="pub" placeholder="ca-pub-1234567890123456" value="' + esc(a.publisher) + '">' +
      '<label for="s1">Bloco do topo (data-ad-slot)</label><input id="s1" value="' + esc(a.slot_topo) + '" inputmode="numeric">' +
      '<label for="s2">Bloco do meio</label><input id="s2" value="' + esc(a.slot_meio) + '" inputmode="numeric">' +
      '<label for="s3">Bloco do rodapé</label><input id="s3" value="' + esc(a.slot_rodape) + '" inputmode="numeric">' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="at" style="width:auto"' + (a.ativo ? " checked" : "") + '> Exibir anúncios no site</label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button class="btn">Salvar AdSense</button><button type="button" class="btn sec" id="adstxt">Publicar ads.txt</button><a class="btn sec" href="https://adsense.google.com" target="_blank" rel="noopener">Abrir AdSense</a></div><p class="form-msg" id="m"></p></form></div>' +
      '<div class="bloco" style="margin-top:16px"><h3>Checklist de aprovação</h3><ul class="lista-limpa">' + checklist.map(([t, ok]) => '<li>' + (ok === true ? "✅" : ok === false ? "⬜" : "🔄") + ' ' + t + '</li>').join("") + '</ul>' +
      '<p style="margin-top:12px;color:var(--tinta-2)">Dica: o Google aprova mais rápido sites com domínio próprio e tráfego orgânico. As 11 mil páginas de verbos já são indexáveis pelo sitemap.</p></div>';
    const f = alvo.querySelector("#f");
    f.onsubmit = async e => {
      e.preventDefault(); const m = f.querySelector("#m"); const pub = f.pub.value.trim();
      if (pub && !/^ca-pub-\d{10,}$/.test(pub)) { m.className = "form-msg erro"; m.textContent = "O ID deve ter o formato ca-pub- seguido de números."; return; }
      const novo = Object.assign(a, { publisher: pub, slot_topo: f.s1.value.trim(), slot_meio: f.s2.value.trim(), slot_rodape: f.s3.value.trim(), ativo: f.at.checked });
      const err = await setConfig("adsense", novo);
      m.className = "form-msg " + (err ? "erro" : "ok"); m.textContent = err ? "Erro: " + err.message : "Salvo. " + (novo.ativo ? "Os anúncios aparecem assim que o Google aprovar o site." : "Anúncios desligados.");
    };
    alvo.querySelector("#adstxt").onclick = () => comando("Criar/atualizar o arquivo ads.txt na raiz do site com o ID de editor salvo no painel (" + (a.publisher || "ainda não informado") + ")", "adstxt");
  }

  /* ---------- 7. Configurações ---------- */
  async function abaConfig() {
    const cfg = await getConfig(); const s = cfg.site || {}, a = cfg.automacao || {};
    alvo.innerHTML = '<form id="f" class="bloco"><h3>Site</h3>' +
      '<label for="no">Nome do site</label><input id="no" value="' + esc(s.nome) + '">' +
      '<label for="sl">Frase de apresentação</label><input id="sl" value="' + esc(s.slogan) + '">' +
      '<label for="av">Aviso no topo de todas as páginas (deixe vazio para esconder)</label><input id="av" value="' + esc(s.aviso) + '" placeholder="ex.: Novo: treino de fala com reconhecimento de voz!">' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="mn" style="width:auto"' + (s.manutencao ? " checked" : "") + '> Modo manutenção (esconde o conteúdo para visitantes)</label>' +
      '<h3 style="margin-top:24px">Automação</h3>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="aa" style="width:auto"' + (a.ativa ? " checked" : "") + '> Automação diária ligada</label>' +
      '<label for="vd">Verbos traduzidos por dia</label><input id="vd" type="number" min="0" max="500" value="' + (a.verbos_por_dia ?? 50) + '">' +
      '<label for="ld">Lições novas por dia</label><input id="ld" type="number" min="0" max="5" value="' + (a.licoes_por_dia ?? 1) + '">' +
      '<label for="ia">Inteligência que gera o conteúdo</label><select id="ia"><option value="claude">Claude</option><option value="claude+gemini">Claude + Gemini (revisão cruzada, requer chave do Gemini)</option></select>' +
      '<button class="btn" style="margin-top:16px">Salvar configurações</button><p class="form-msg" id="m"></p></form>';
    const f = alvo.querySelector("#f"); f.ia.value = a.ia || "claude";
    f.onsubmit = async e => {
      e.preventDefault(); const m = f.querySelector("#m");
      const e1 = await setConfig("site", Object.assign(s, { nome: f.no.value.trim(), slogan: f.sl.value.trim(), aviso: f.av.value.trim(), manutencao: f.mn.checked }));
      const e2 = await setConfig("automacao", Object.assign(a, { ativa: f.aa.checked, verbos_por_dia: +f.vd.value, licoes_por_dia: +f.ld.value, ia: f.ia.value }));
      m.className = "form-msg " + (e1 || e2 ? "erro" : "ok"); m.textContent = e1 || e2 ? "Erro ao salvar: " + (e1 || e2).message : "Configurações salvas e aplicadas no site.";
    };
  }

  /* ---------- 8. Diagnóstico ---------- */
  async function abaDiagnostico() {
    alvo.innerHTML = '<div class="bloco"><h3>Diagnóstico completo</h3><p>Verificando o site agora…</p><ul class="lista-limpa" id="res"></ul><div style="display:flex;gap:8px;margin-top:14px"><button class="btn sec" id="de-novo">Verificar de novo</button><button class="btn" id="corrigir" hidden>Mandar a automação corrigir</button></div></div>';
    const res = alvo.querySelector("#res"), problemas = [];
    const item = (ok, t) => { res.insertAdjacentHTML("beforeend", "<li>" + (ok ? "✅ " : "❌ ") + esc(t) + "</li>"); if (!ok) problemas.push(t); };
    const testar = async (t, fn) => { try { const r = await fn(); item(r !== false, t + (typeof r === "string" ? ": " + r : "")); } catch (e) { item(false, t + ": " + e.message); } };
    await testar("Lista de verbos carrega", async () => { const r = await fetch(raiz + "dados/en/indice.json"); if (!r.ok) throw new Error("HTTP " + r.status); const d = await r.json(); return d.length.toLocaleString("pt-BR") + " verbos"; });
    await testar("Status dos dados", async () => { const s = await statusDados(); if (!s) throw new Error("status.json ausente"); const h = (Date.now() - new Date(s.atualizado)) / 36e5; if (h > 48) throw new Error("dados sem atualização há " + Math.round(h) + " horas"); return "atualizado em " + dataBR(s.atualizado); });
    await testar("Página de verbo de exemplo", async () => { const r = await fetch(raiz + "en/verbos/be.html"); return r.ok ? "ok" : false; });
    await testar("Sitemap para o Google", async () => { const r = await fetch(raiz + "sitemap.xml"); return r.ok ? "ok" : false; });
    await testar("Banco de dados e login (Supabase)", async () => { const { error } = await c.from("config").select("chave").limit(1); if (error) throw error; return "conectado"; });
    await testar("Fila de comandos sem travamento", async () => { const { data } = await c.from("comandos").select("criado_em").eq("status", "pendente").order("criado_em").limit(1); if (data && data[0] && Date.now() - new Date(data[0].criado_em) > 2 * 864e5) throw new Error("há comando pendente há mais de 2 dias"); return "ok"; });
    await testar("Automação rodou nas últimas 36 horas", async () => { const cfg = await getConfig(); const u = cfg.automacao && cfg.automacao.ultima_execucao; if (!u) throw new Error("ainda não rodou"); if (Date.now() - new Date(u) > 36 * 36e5) throw new Error("última execução em " + dataBR(u)); return dataBR(u); });
    await testar("AdSense configurado corretamente", async () => { const a = (await getConfig()).adsense || {}; if (!a.ativo) return "desligado (ligue em Monetização quando aprovado)"; if (!/^ca-pub-\d{10,}$/.test(a.publisher)) throw new Error("ID de editor inválido"); return "ativo"; });
    await testar("Voz em inglês disponível neste aparelho", async () => { const v = speechSynthesis.getVoices(); return v.some(x => x.lang.startsWith("en")) ? v.filter(x => x.lang.startsWith("en")).length + " vozes" : "carregando vozes (normal no primeiro acesso)"; });
    await testar("Voz em português disponível neste aparelho", async () => { const v = speechSynthesis.getVoices(); return v.some(x => x.lang.startsWith("pt")) ? "ok" : "carregando vozes (normal no primeiro acesso)"; });
    alvo.querySelector("#de-novo").onclick = abaDiagnostico;
    const btn = alvo.querySelector("#corrigir");
    if (problemas.length) { btn.hidden = false; btn.onclick = () => comando("Diagnóstico encontrou problemas, corrija: " + problemas.join(" | "), "diagnostico"); }
    else res.insertAdjacentHTML("beforeend", "<li><b>Tudo funcionando.</b></li>");
  }

  const MAPA = { geral: abaGeral, comandos: abaComandos, conteudo: abaConteudo, sugestoes: abaSugestoes, idiomas: abaIdiomas, monetizacao: abaMonetizacao, config: abaConfig, diagnostico: abaDiagnostico };
  function abrir(k) {
    app.querySelectorAll("[data-aba]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.aba === k)));
    alvo.innerHTML = '<div class="vazio">Carregando…</div>'; history.replaceState(null, "", "#" + k);
    MAPA[k]().catch(e => alvo.innerHTML = '<div class="vazio">Erro: ' + esc(e.message) + '</div>');
  }
  abrir(MAPA[location.hash.slice(1)] ? location.hash.slice(1) : "geral");
})();
