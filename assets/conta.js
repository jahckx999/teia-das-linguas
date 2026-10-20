/* Conta do aluno: entrar, criar conta, recuperar senha, perfil e progresso */
(async function () {
  const T = window.TDL, area = document.getElementById("conta");
  const c = await T.sb();
  const voltar = location.origin + location.pathname;

  function msg(el, texto, tipo) { el.className = "form-msg " + (tipo || ""); el.textContent = texto; }
  const traduzErro = (e) => {
    const m = (e && e.message || "").toLowerCase();
    if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
    if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    if (m.includes("already registered")) return "Este e-mail já tem conta. Use a aba Entrar.";
    if (m.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
    if (m.includes("rate")) return "Muitas tentativas seguidas. Aguarde alguns minutos.";
    return e.message || "Algo deu errado. Tente novamente.";
  };

  function telaAcesso(aba = "entrar") {
    area.innerHTML =
      '<div class="abas" role="tablist"><button role="tab" data-aba="entrar">Entrar</button><button role="tab" data-aba="criar">Criar conta grátis</button><button role="tab" data-aba="senha">Esqueci a senha</button></div>' +
      '<form id="f" class="bloco" novalidate></form>';
    const f = area.querySelector("#f");
    area.querySelectorAll("[data-aba]").forEach(b => { b.setAttribute("aria-selected", String(b.dataset.aba === aba)); b.onclick = () => telaAcesso(b.dataset.aba); });
    if (aba === "entrar") {
      f.innerHTML = '<label for="em">E-mail</label><input id="em" type="email" autocomplete="email" required><label for="se">Senha</label><input id="se" type="password" autocomplete="current-password" required minlength="8">' +
        '<button class="btn" style="margin-top:16px">Entrar</button><p class="form-msg" id="m"></p>';
      f.onsubmit = async e => { e.preventDefault(); const m = f.querySelector("#m"); msg(m, "Entrando…");
        const { error } = await c.auth.signInWithPassword({ email: f.em.value.trim(), password: f.se.value });
        if (error) return msg(m, traduzErro(error), "erro"); location.reload(); };
    } else if (aba === "criar") {
      f.innerHTML = '<label for="no">Como quer ser chamado</label><input id="no" autocomplete="given-name" required maxlength="60">' +
        '<label for="em">E-mail</label><input id="em" type="email" autocomplete="email" required><label for="se">Senha (mínimo 8 caracteres)</label><input id="se" type="password" autocomplete="new-password" required minlength="8">' +
        '<label style="font-weight:400;display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="ac" style="width:auto;margin-top:5px" required> Li e aceito os <a href="termos.html">termos</a> e a <a href="privacidade.html">política de privacidade</a>.</label>' +
        '<button class="btn" style="margin-top:16px">Criar conta</button><p class="form-msg" id="m"></p>';
      f.onsubmit = async e => { e.preventDefault(); const m = f.querySelector("#m");
        if (!f.ac.checked) return msg(m, "Aceite os termos para continuar.", "erro");
        if (f.se.value.length < 8) return msg(m, "A senha precisa ter pelo menos 8 caracteres.", "erro");
        msg(m, "Criando sua conta…");
        const { data, error } = await c.auth.signUp({ email: f.em.value.trim(), password: f.se.value, options: { data: { nome: f.no.value.trim() }, emailRedirectTo: voltar } });
        if (error) return msg(m, traduzErro(error), "erro");
        if (data.session) return location.reload();
        msg(m, "Conta criada! Enviamos um link de confirmação para " + f.em.value.trim() + ". Abra o e-mail (veja também o spam) e depois entre.", "ok"); };
    } else {
      f.innerHTML = '<label for="em">E-mail da sua conta</label><input id="em" type="email" autocomplete="email" required><button class="btn" style="margin-top:16px">Enviar link para nova senha</button><p class="form-msg" id="m"></p>';
      f.onsubmit = async e => { e.preventDefault(); const m = f.querySelector("#m");
        const { error } = await c.auth.resetPasswordForEmail(f.em.value.trim(), { redirectTo: voltar + "#nova-senha" });
        if (error) return msg(m, traduzErro(error), "erro"); msg(m, "Se este e-mail tiver conta, o link chega em instantes.", "ok"); };
    }
  }

  function telaNovaSenha() {
    area.innerHTML = '<form id="f" class="bloco"><h2>Crie sua nova senha</h2><label for="se">Nova senha</label><input id="se" type="password" autocomplete="new-password" minlength="8" required><button class="btn" style="margin-top:16px">Salvar nova senha</button><p class="form-msg" id="m"></p></form>';
    const f = area.querySelector("#f");
    f.onsubmit = async e => { e.preventDefault(); const m = f.querySelector("#m");
      const { error } = await c.auth.updateUser({ password: f.se.value });
      if (error) return msg(m, traduzErro(error), "erro"); msg(m, "Senha alterada. Você já está conectado.", "ok"); setTimeout(() => location.replace(voltar), 1200); };
  }

  async function telaPerfil(u) {
    const { data: perfil } = await c.from("perfis").select("*").eq("user_id", u.id).maybeSingle();
    const pr = perfil || { nome: "", lingua_materna: "pt", nivel: "A1", metodo: "srs", meta_diaria: 10 };
    const prog = T.progresso("en");
    const niveis = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const metodos = { srs: "Repetição espaçada", quiz: "Prática de recordação (quiz)", fala: "Shadowing e fala", ditado: "Ditado e escuta ativa", conjugacao: "Conjugação e gramática" };
    area.innerHTML =
      '<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">' +
      '<div class="bloco"><h3>' + (prog.xp || 0) + ' XP</h3><p>pontos de estudo</p></div>' +
      '<div class="bloco"><h3>' + T.sequencia(prog) + ' dias</h3><p>de sequência</p></div>' +
      '<div class="bloco"><h3>' + Object.keys(prog.cartoes || {}).length + '</h3><p>verbos estudados</p></div></div>' +
      '<form id="f" class="bloco"><h2>Seu perfil</h2><p>Conectado como <b>' + u.email + '</b></p>' +
      '<label for="no">Nome</label><input id="no" value="' + (pr.nome || "").replace(/"/g, "&quot;") + '" maxlength="60">' +
      '<label for="li">Sua língua materna (voz da pronúncia adaptada)</label><select id="li"><option value="pt">Português (Brasil)</option><option value="pt-PT">Português (Portugal)</option><option value="es">Espanhol</option></select>' +
      '<label for="ni">Seu nível atual</label><select id="ni">' + niveis.map(n => '<option>' + n + '</option>').join("") + '</select>' +
      '<label for="me">Método preferido</label><select id="me">' + Object.entries(metodos).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join("") + '</select>' +
      '<label for="mt">Meta diária de verbos novos</label><input id="mt" type="number" min="3" max="100" value="' + (pr.meta_diaria || 10) + '">' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px"><button class="btn">Salvar perfil</button><a class="btn sec" href="praticar.html">Ir treinar</a></div><p class="form-msg" id="m"></p></form>' +
      '<div class="bloco" style="margin-top:16px"><h3>Seus dados</h3><p>Você pode baixar tudo o que guardamos sobre seu estudo ou sair da conta.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn sec" id="exp">Baixar meus dados</button><button class="btn sec" id="sair">Sair da conta</button><button class="btn sec" id="exc">Pedir exclusão da conta</button></div></div>';
    const f = area.querySelector("#f");
    f.li.value = pr.lingua_materna || "pt"; f.ni.value = pr.nivel || "A1"; f.me.value = pr.metodo || "srs";
    f.onsubmit = async e => { e.preventDefault(); const m = f.querySelector("#m");
      const novo = { user_id: u.id, nome: f.no.value.trim(), lingua_materna: f.li.value, nivel: f.ni.value, metodo: f.me.value, meta_diaria: +f.mt.value || 10 };
      const { error } = await c.from("perfis").upsert(novo);
      if (error) return msg(m, "Não foi possível salvar: " + error.message, "erro");
      T.LS.set("tdl_nivel", novo.nivel); T.LS.set("tdl_materna", { pt: "pt-BR", "pt-PT": "pt-PT", es: "es-ES" }[novo.lingua_materna]);
      msg(m, "Perfil salvo.", "ok"); };
    area.querySelector("#sair").onclick = async () => { await c.auth.signOut(); T.LS.set("tdl_logado", false); location.reload(); };
    area.querySelector("#exp").onclick = () => {
      const blob = new Blob([JSON.stringify({ email: u.email, perfil: pr, progresso: prog }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "teia-das-linguas-meus-dados.json"; a.click();
    };
    area.querySelector("#exc").onclick = () => T.abrirSugestao("", "outro");
  }

  c.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") telaNovaSenha(); });
  const { data } = await c.auth.getSession();
  if (location.hash.includes("nova-senha") && data.session) telaNovaSenha();
  else if (data.session) telaPerfil(data.session.user);
  else telaAcesso(location.hash === "#criar" ? "criar" : "entrar");
})();
