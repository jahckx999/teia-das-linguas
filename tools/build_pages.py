"""Gera todas as páginas HTML do site Teia das Línguas a partir dos dados e do conteúdo.
Uso: python3 build_pages.py [url_base]   ex.: https://www.seudominio.com.br
"""
import json, os, sys, html, string, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BASE = (sys.argv[1] if len(sys.argv) > 1 else open(os.path.join(ROOT, "tools", "url_base.txt")).read().strip()).rstrip("/")
H = html.escape
ANO = datetime.date.today().year
NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"]
CONT = json.load(open(os.path.join(ROOT, "conteudo", "en.json"), encoding="utf-8"))
LIC_FP = os.path.join(ROOT, "conteudo", "licoes_en.json")
LICOES = json.load(open(LIC_FP, encoding="utf-8")) if os.path.exists(LIC_FP) else []
IDX = json.load(open(os.path.join(ROOT, "dados", "en", "indice.json"), encoding="utf-8"))
STATUS = json.load(open(os.path.join(ROOT, "dados", "en", "status.json"), encoding="utf-8"))
DET = {}
for l in list(string.ascii_lowercase) + ["0"]:
    fp = os.path.join(ROOT, "dados", "en", "detalhes", f"{l}.json")
    if os.path.exists(fp): DET.update(json.load(open(fp, encoding="utf-8")))

def slug(v): return v.replace("'", "").replace(" ", "-")
def fmt(n): return f"{n:,}".replace(",", ".")

LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="var(--fio)" stroke-width="2" stroke-linecap="round">'
        '<path d="M6 8 L16 4 L26 8 L26 22 L16 28 L6 22 Z"/><path d="M6 8 L26 22 M26 8 L6 22 M16 4 L16 28"/></g>'
        '<circle cx="16" cy="16" r="4.2" fill="var(--acafrao)"/></svg>')
SOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>'

MENU = [("dicionario.html", "Dicionário"), ("niveis.html", "Níveis A1–C2"), ("praticar.html", "Praticar"),
        ("fonetica.html", "Fonética"), ("metodos.html", "Métodos"), ("idiomas.html", "Idiomas")]

def pagina(caminho, titulo, descricao, corpo, raiz, atual="", scripts=(), extra_head="", idioma_corpo="en", noindex=False, json_ld=None):
    canon = BASE + "/" + caminho.replace("index.html", "")
    menu = "".join(f'<a href="{raiz}{h}"{" aria-current=\"page\"" if h == atual else ""}>{n}</a>' for h, n in MENU)
    sc = "".join(f'<script src="{raiz}assets/{s}" defer></script>' for s in scripts)
    ld = f'<script type="application/ld+json">{json.dumps(json_ld, ensure_ascii=False)}</script>' if json_ld else ""
    return f"""<!doctype html>
<html lang="pt-BR" data-raiz="{raiz}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{H(titulo)}</title>
<meta name="description" content="{H(descricao)}">
<link rel="canonical" href="{H(canon)}">
{'<meta name="robots" content="noindex,nofollow">' if noindex else ''}
<meta property="og:title" content="{H(titulo)}"><meta property="og:description" content="{H(descricao)}"><meta property="og:type" content="website"><meta property="og:url" content="{H(canon)}"><meta property="og:image" content="{BASE}/assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:site_name" content="Teia das Línguas"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E7C86">
<link rel="icon" href="{raiz}assets/icone.svg" type="image/svg+xml">
<link rel="manifest" href="{raiz}manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{raiz}assets/estilo.css">
{extra_head}{ld}
<script src="{raiz}assets/config.js"></script>
<script src="{raiz}assets/nucleo.js" defer></script>{sc}
</head>
<body data-idioma="{idioma_corpo}">
<a class="sr" href="#principal">Pular para o conteúdo</a>
<div class="aviso-topo" role="note"></div>
<header class="topo"><div class="pagina">
<a class="marca" href="{raiz}index.html">{LOGO}<span>Teia das Línguas</span></a>
<button class="btn-menu" aria-expanded="false" aria-controls="menu">Menu</button>
<nav class="menu" id="menu" aria-label="Principal">{menu}<a class="conta-link" href="{raiz}conta.html">Entrar</a>
<button class="btn sec peq" data-acao="tema" type="button" aria-label="Alternar tema claro ou escuro">◐</button></nav>
</div></header>
<main id="principal">
{corpo}
</main>
<footer class="rodape"><div class="pagina">
<div><b>Teia das Línguas</b><br>Aprenda idiomas com ciência, voz e prática. © {ANO}</div>
<nav aria-label="Institucional"><a href="{raiz}sobre.html">Sobre</a><a href="{raiz}licoes.html">Lições</a><a href="{raiz}privacidade.html">Privacidade</a><a href="{raiz}termos.html">Termos</a><a href="{raiz}contato.html">Contato</a><button class="btn sec peq" type="button" data-acao="sugerir" data-tipo="ideia">Sugerir melhoria</button></nav>
</div></footer>
</body>
</html>
"""

def escrever(caminho, conteudo):
    fp = os.path.join(ROOT, caminho)
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    open(fp, "w", encoding="utf-8").write(conteudo)

def anuncio(slot): return f'<div class="anuncio pagina" data-slot="{slot}"></div>'

# ---------------------------------------------------------------- INÍCIO
destaque = next(i for i in IDX if i["v"] == "understand")
top_a1 = sorted([i for i in IDX if i["n"] == "A1" and i["pt"]], key=lambda x: x["r"])[:12]
def fita_html(sil):
    out = []
    for parte in sil.replace("·", "-").split("-"):
        t = parte.strip()
        if not t: continue
        ton = t.upper() == t and any(ch.isalpha() for ch in t)
        out.append(f'<button type="button" class="silaba{" tonica" if ton else ""}" data-sil="{H(t.lower())}">{H(t.lower())}</button>')
    return '<div class="fita">' + "".join(out) + "</div>"

escada = "".join(f'<a class="degrau n-{n}" href="nivel/{n.lower()}.html"><b>{n}</b><strong>{CONT["niveis"][n]["nome"]}</strong><br><span>{STATUS["por_nivel"].get(n, {}).get("total", 0)} verbos</span></a>' for n in NIVEIS)
inicio = f"""
<div class="pagina">
<section class="hero">
<div>
<h1>Fale inglês ouvindo cada sílaba no lugar certo.</h1>
<p class="lead">{fmt(STATUS['total'])} verbos com significado, pronúncia escrita do jeito que se fala em português, divisão em sílabas e áudio. Organizados pelos seis níveis do Quadro Europeu (CEFR), com treino diário baseado em ciência.</p>
<form class="busca-grande" action="dicionario.html" role="search"><label class="sr" for="bq">Buscar verbo</label><input id="bq" name="q" placeholder="Digite um verbo em inglês ou português" autocomplete="off"><button class="btn">Buscar</button></form>
<div class="acoes"><a class="btn sec" href="praticar.html">Começar a treinar</a><a class="btn sec" href="conta.html#criar">Criar conta grátis</a></div>
</div>
<div class="vitrine" id="vitrine">
<span class="selo n-{destaque['n']}">{destaque['n']}</span>
<div class="palavra" lang="en">{destaque['v']}</div>
{fita_html(destaque['sil'])}
<p class="signif">{H(destaque['pt'])}</p>
<div class="sons" style="margin-top:14px"><button class="som" type="button" id="v-en">{SOM}Inglês</button><button class="som" type="button" id="v-pt">{SOM}Pronúncia adaptada: {H(destaque['pr'])}</button></div>
</div>
</section>
</div>
{anuncio('topo')}
<section><div class="pagina">
<div class="secao-titulo"><div><h2>Suba um degrau por vez</h2><p>Do A1, primeiras frases, ao C2, domínio total. Cada nível tem metas, gramática, fonética e verbos próprios.</p></div><a class="btn sec peq" href="niveis.html">Ver todos os níveis</a></div>
<div class="escada">{escada}</div>
</div></section>
<section><div class="pagina">
<div class="secao-titulo"><div><h2>Os verbos que você mais vai usar</h2><p>Comece pelos mais frequentes do inglês real. Toque para ouvir.</p></div><a class="btn sec peq" href="dicionario.html?n=A1">Todos do A1</a></div>
<div class="grade">{''.join(f'<a class="bloco" style="text-decoration:none;color:var(--tinta)" href="en/verbos/{slug(i["v"])}.html"><h3 lang="en">{i["v"]}</h3><p style="margin:0;color:var(--tinta-2)">{H(i["pt"].split(";")[0])}</p><p style="margin:6px 0 0;font-size:.92rem">{H(i["pr"])}</p></a>' for i in top_a1)}</div>
</div></section>
<section><div class="pagina">
<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
<div class="bloco"><h3>Escrito como se fala</h3><p>Cada verbo tem a pronúncia adaptada ao português, como "abéndan" para abandon, e a sílaba forte destacada. Uma voz em português lê essa escrita para você comparar com a voz nativa.</p></div>
<div class="bloco"><h3>Treino que a ciência comprova</h3><p>Repetição espaçada, recordação ativa, ditado, fala com reconhecimento de voz e conjugação. Você escolhe o método e o site agenda as revisões na hora certa.</p></div>
<div class="bloco"><h3>Funciona sem internet</h3><p>Baixe o pacote do idioma para estudar offline no celular ou leve a planilha completa para o Excel ou Google Planilhas.</p></div>
</div></div></section>
{anuncio('rodape')}
<script>document.addEventListener('DOMContentLoaded',()=>{{const d={json.dumps({'v': destaque['v'], 'pr': destaque['pr']})};
document.getElementById('v-en').onclick=()=>TDL.falar(d.v,'en-US');document.getElementById('v-pt').onclick=()=>TDL.falarAdaptado(d.pr);
document.querySelectorAll('#vitrine .silaba').forEach(b=>b.onclick=()=>TDL.falarAdaptado(b.dataset.sil,{{rate:.7}}));}});</script>
"""
escrever("index.html", pagina("index.html", "Teia das Línguas: verbos em inglês com significado, pronúncia e áudio",
    f"{fmt(STATUS['total'])} verbos em inglês com significado em português, pronúncia adaptada, sílabas, áudio e treino por nível CEFR (A1 a C2). Grátis.",
    inicio, "./", json_ld={"@context": "https://schema.org", "@type": "WebSite", "name": "Teia das Línguas", "url": BASE + "/",
    "potentialAction": {"@type": "SearchAction", "target": BASE + "/dicionario.html?q={q}", "query-input": "required name=q"}}))

# ---------------------------------------------------------------- DICIONÁRIO
dic = f"""<div class="pagina"><section>
<h1>Dicionário de verbos em inglês</h1>
<p>Todos os {fmt(STATUS['total'])} verbos em ordem alfabética, de inglês para português ou de português para inglês. Toque em <b>Inglês</b> para a voz nativa e em <b>Adaptada</b> para ouvir a pronúncia escrita do jeito brasileiro.</p>
<div class="ferramentas">
<div class="q"><label class="sr" for="q">Buscar</label><input id="q" type="search" placeholder="Buscar verbo ou significado" autocomplete="off"></div>
<div><label class="sr" for="dir">Direção</label><select id="dir"><option value="en">Inglês → Português</option><option value="pt">Português → Inglês</option></select></div>
<div><label class="sr" for="nivel">Nível</label><select id="nivel"><option value="">Todos os níveis</option>{''.join(f'<option value="{n}">{n} · {CONT["niveis"][n]["nome"]}</option>' for n in NIVEIS)}</select></div>
<div><label class="sr" for="tipo">Tipo</label><select id="tipo"><option value="">Todos os tipos</option><option value="trad">Com tradução</option><option value="simples">Verbos simples</option><option value="fras">Phrasal verbs</option><option value="irr">Irregulares</option><option value="reg">Regulares</option></select></div>
</div>
<div class="alfabeto" id="alfabeto" aria-label="Filtrar por letra"></div>
<p class="contagem" id="contagem" aria-live="polite"></p>
<div class="verbos" id="lista"></div>
<div class="mais"><button class="btn sec" id="mais" hidden>Mostrar mais verbos</button></div>
<p style="color:var(--tinta-3);font-size:.9rem">Nível CEFR estimado pela frequência de uso no inglês atual. Encontrou um erro? <button class="btn sec peq" data-acao="sugerir">Avise aqui</button></p>
</section></div>{anuncio('rodape')}"""
escrever("dicionario.html", pagina("dicionario.html", "Dicionário de verbos em inglês com pronúncia | Teia das Línguas",
    "Lista completa de verbos em inglês em ordem alfabética, com significado, pronúncia adaptada ao português, sílabas e áudio. Busca de inglês para português e de português para inglês.",
    dic, "./", "dicionario.html", ["dicionario.js"]))

# ---------------------------------------------------------------- NÍVEIS
niveis_corpo = '<div class="pagina"><section><h1>Os seis níveis do CEFR</h1><p>O Quadro Europeu Comum de Referência para Línguas (CEFR) é o padrão internacional de proficiência. Escolha onde você está e siga a trilha.</p>'
for grupo in ["Usuário básico", "Usuário independente", "Usuário proficiente"]:
    niveis_corpo += f'<h2 style="margin-top:28px">{grupo}</h2><div class="grade">'
    for n in NIVEIS:
        d = CONT["niveis"][n]
        if d["grupo"] != grupo: continue
        niveis_corpo += f'<a class="bloco degrau n-{n}" href="nivel/{n.lower()}.html" style="min-height:0"><b>{n}</b><h3>{d["nome"]}</h3><p style="color:var(--tinta-2)">{H(d["descricao"])}</p></a>'
    niveis_corpo += "</div>"
niveis_corpo += "</section></div>"
escrever("niveis.html", pagina("niveis.html", "Níveis de inglês A1, A2, B1, B2, C1 e C2 (CEFR) | Teia das Línguas",
    "Entenda os níveis CEFR do inglês, do A1 iniciante ao C2 fluente, com metas, gramática, fonética e verbos de cada nível.", niveis_corpo, "./", "niveis.html"))

for k, n in enumerate(NIVEIS):
    d = CONT["niveis"][n]
    verbos_n = sorted([i for i in IDX if i["n"] == n and i["pt"] and not i.get("x")], key=lambda x: x["r"])[:48]
    gram = ""
    for g in d["gramatica"]:
        exs = "".join(f'<li lang="en">{H(e[0])}<span lang="pt-BR">{H(e[1])}</span></li>' for e in g["exemplos"])
        exe = "".join(f'<div class="exercicio" data-r="{H(x["r"])}"><span lang="en">{H(x["p"])}</span><div class="ops">' +
                      "".join(f'<button type="button">{H(o)}</button>' for o in x["o"]) + '</div></div>' for x in g["exercicios"])
        gram += f'<article class="bloco" id="{g["id"]}" style="margin-bottom:16px"><h3>{H(g["titulo"])}</h3><p>{H(g["explicacao"])}</p><ul class="exemplos">{exs}</ul><h4>Pratique</h4>{exe}</article>'
    prev_n = NIVEIS[k - 1] if k else None; next_n = NIVEIS[k + 1] if k < 5 else None
    corpo = f"""<div class="pagina"><section>
<p class="migalhas"><a href="../niveis.html">Níveis</a> / {n}</p>
<span class="selo n-{n}" style="font-size:1rem">{n} · {d['grupo']}</span>
<h1 style="margin-top:10px">Inglês {n}: {d['nome']}</h1>
<p class="lead" style="font-size:1.15rem;color:var(--tinta-2)">{H(d['descricao'])}</p>
<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin:20px 0">
<div class="bloco"><h3>Metas do nível</h3><ul class="lista-limpa">{''.join(f'<li>✓ {H(m)}</li>' for m in d['metas'])}</ul></div>
<div class="bloco"><h3>Treine agora</h3><p>{STATUS['por_nivel'].get(n, {}).get('total', 0)} verbos neste nível. Escolha um modo:</p>
<div style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn peq" href="../praticar.html?n={n}&modo=cartoes">Cartões</a><a class="btn sec peq" href="../praticar.html?n={n}&modo=quiz">Quiz</a><a class="btn sec peq" href="../praticar.html?n={n}&modo=fala">Fala</a><a class="btn sec peq" href="../praticar.html?n={n}&modo=conjugacao">Conjugação</a></div></div>
</div>
</section></div>{anuncio('topo')}
<div class="pagina"><section><h2>Gramática do {n}</h2>{gram}</section>
<section><div class="secao-titulo"><div><h2>Verbos essenciais do {n}</h2><p>Os mais frequentes deste nível.</p></div><a class="btn sec peq" href="../dicionario.html?n={n}">Ver todos do {n}</a></div>
<div class="grade">{''.join(f'<a class="bloco" style="text-decoration:none;color:var(--tinta);padding:14px" href="../en/verbos/{slug(i["v"])}.html"><b lang="en">{i["v"]}</b><br><span style="color:var(--tinta-2)">{H(i["pt"].split(";")[0])}</span><br><small>{H(i["pr"])}</small></a>' for i in verbos_n)}</div></section>
<section style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">{f'<a class="btn sec" href="{prev_n.lower()}.html">← Nível {prev_n}</a>' if prev_n else '<span></span>'}{f'<a class="btn" href="{next_n.lower()}.html">Próximo: nível {next_n}</a>' if next_n else ''}</section></div>
{anuncio('rodape')}
<script>document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.exercicio').forEach(ex=>ex.querySelectorAll('button').forEach(b=>b.onclick=()=>{{
const ok=b.textContent===ex.dataset.r;ex.querySelectorAll('button').forEach(x=>{{x.disabled=true;if(x.textContent===ex.dataset.r)x.style.borderColor='var(--ok)';}});
if(!ok)b.style.borderColor='var(--erro)';const s=ex.querySelector('span');TDL.falar(s.textContent.replace('___',ex.dataset.r),'en-US');
if(ok){{const p=TDL.progresso();p.xp=(p.xp||0)+3;TDL.marcarDia(p);TDL.salvarProgresso(p);}}}})));</script>"""
    escrever(f"nivel/{n.lower()}.html", pagina(f"nivel/{n.lower()}.html", f"Inglês nível {n} ({d['nome']}): gramática, verbos e exercícios | Teia das Línguas",
        f"Tudo do nível {n} do CEFR em inglês: o que você consegue fazer, gramática com exemplos e exercícios, e os verbos essenciais com pronúncia.", corpo, "../", "niveis.html"))

# ---------------------------------------------------------------- FONÉTICA
fon = "".join(f'<article class="bloco"><h3>{H(f["som"])}</h3><p>{H(f["dica"])}</p><div class="sons" style="flex-wrap:wrap">' +
              "".join(f'<button class="som" type="button" data-w="{H(w)}">{SOM}{H(w)}</button>' for w in f["palavras"]) + '</div></article>' for f in CONT["fonetica"])
corpo = f"""<div class="pagina"><section><h1>Fonética do inglês para brasileiros</h1>
<p>Os sons que mais confundem quem fala português, com dicas práticas e exemplos para ouvir. A pronúncia adaptada do site segue estas regras.</p>
<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">{fon}</div></section>
<section class="bloco"><h2>Como ler a pronúncia adaptada</h2>
<table class="tabela"><tr><th>Escrita adaptada</th><td><b>Som em inglês</b></td></tr>
<tr><th>Sílaba em MAIÚSCULAS e destacada</th><td>Sílaba tônica, a mais forte</td></tr>
<tr><th>â (rân, bârd)</th><td>Vogal curta e central, entre "a" e "ã" sem nasalizar</td></tr>
<tr><th>í, ú com acento (bilív, chúz)</th><td>Vogal longa: estique um pouco o som</td></tr>
<tr><th>i, u sem acento (guiv, buk)</th><td>Vogal curta e relaxada</td></tr>
<tr><th>r no começo (ráus, répan)</th><td>H aspirado inglês: apenas um sopro</td></tr>
<tr><th>f no lugar de th (fink)</th><td>Th surdo: língua entre os dentes, soprando</td></tr>
<tr><th>d no lugar de th (da)</th><td>Th sonoro: língua entre os dentes, vibrando</td></tr>
<tr><th>tch, dj, ch, j</th><td>Como em "tchau", "Djalma", "chave", "já"</td></tr></table>
<p style="margin-top:12px">A escrita adaptada é uma ponte para o seu ouvido. Use sempre a voz em inglês como referência final.</p></section></div>
<script>document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>TDL.falar(b.dataset.w,'en-US')));</script>"""
escrever("fonetica.html", pagina("fonetica.html", "Fonética do inglês para brasileiros: th, r, vogais e acento | Teia das Línguas",
    "Aprenda os sons do inglês que mais confundem brasileiros: th, r, h, schwa, vogais longas e curtas, final -ed e acento tônico. Com áudio.", corpo, "./", "fonetica.html"))

# ---------------------------------------------------------------- MÉTODOS
METODOS = [
    ("Repetição espaçada", "cartoes", "Revisar cada palavra pouco antes de esquecê-la fixa a memória de longo prazo com o menor esforço possível. O site agenda as revisões automaticamente: quanto mais fácil a lembrança, maior o intervalo.", "Baseada na curva do esquecimento de Ebbinghaus e em décadas de estudos sobre o efeito do espaçamento."),
    ("Prática de recordação", "quiz", "Tentar lembrar, em vez de só reler, é uma das formas mais eficazes de aprender. Cada pergunta do quiz força o cérebro a buscar a resposta.", "O efeito de testagem (testing effect) aparece de forma consistente em pesquisas de psicologia cognitiva."),
    ("Escuta ativa e ditado", "ditado", "Ouvir e escrever liga o som à forma escrita e treina o ouvido para separar palavras na fala real.", "Treino de percepção auditiva melhora compreensão e pronúncia em aprendizes de segunda língua."),
    ("Shadowing (fala em eco)", "fala", "Ouça o modelo e repita logo em seguida, imitando ritmo e entonação. O reconhecimento de voz confere se você foi entendido.", "Técnica usada na formação de intérpretes, associada a ganhos de fluência e prosódia."),
    ("Prática intercalada", "conjugacao", "Misturar tipos de exercício, como significado, som e conjugação, em vez de treinar um só por vez, melhora a retenção e a transferência para situações reais.", "O efeito de intercalação (interleaving) supera a prática em blocos em vários estudos de aprendizagem."),
    ("Input compreensível", None, "Ler e ouvir conteúdo um pouco acima do seu nível é o motor da aquisição. Use as lições e os exemplos do seu nível CEFR.", "Hipótese do input de Krashen, amplamente estudada em aquisição de segunda língua."),
    ("Codificação dupla", None, "Combinar palavra, som, escrita adaptada e sílaba destacada cria mais caminhos de memória para a mesma informação.", "Teoria da codificação dupla de Paivio: informação verbal e não verbal reforçam uma à outra."),
]
mt = "".join(f'<article class="bloco"><h3>{H(t)}</h3><p>{H(d)}</p><p style="font-size:.92rem;color:var(--tinta-3)">{H(c)}</p>' +
             (f'<a class="btn peq" href="praticar.html?modo={m}">Treinar com este método</a>' if m else '<a class="btn sec peq" href="licoes.html">Ver lições</a>') + '</article>' for t, m, d, c in METODOS)
corpo = f"""<div class="pagina"><section><h1>Métodos de estudo com base científica</h1>
<p>Escolha como quer aprender. Todos os métodos usam os mesmos verbos e o mesmo progresso, então você pode alternar quando quiser.</p>
<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">{mt}</div></section>
<section class="bloco"><h2>Rotina recomendada de 15 minutos</h2><ol>
<li>5 minutos de cartões com repetição espaçada (revisões primeiro, depois verbos novos).</li>
<li>4 minutos de quiz ou conjugação, intercalando.</li>
<li>3 minutos de fala em eco com os verbos do dia.</li>
<li>3 minutos lendo uma lição ou os exemplos do seu nível.</li></ol>
<p>Estudar um pouco todo dia vale mais do que muito de uma vez: o site conta sua sequência de dias.</p></section></div>"""
escrever("metodos.html", pagina("metodos.html", "Métodos científicos para aprender inglês | Teia das Línguas",
    "Repetição espaçada, prática de recordação, shadowing, ditado, prática intercalada e input compreensível: métodos comprovados para aprender idiomas.", corpo, "./", "metodos.html"))

# ---------------------------------------------------------------- PRATICAR
corpo = f"""<div class="pagina"><section>
<div class="secao-titulo"><div><h1>Praticar</h1><p>Seu progresso fica salvo neste aparelho e, com conta, em todos os seus aparelhos.</p></div>
<div><label for="nivel-treino" class="sr">Nível</label><select id="nivel-treino" style="width:auto">{''.join(f'<option value="{n}">Nível {n}</option>' for n in NIVEIS)}</select></div></div>
<div class="abas" role="tablist" id="modos"><button role="tab" data-modo="cartoes">Cartões</button><button role="tab" data-modo="quiz">Quiz</button><button role="tab" data-modo="ditado">Ditado</button><button role="tab" data-modo="fala">Fala</button><button role="tab" data-modo="conjugacao">Conjugação</button></div>
<div id="treino" aria-live="polite"></div>
<div class="placar" id="placar"></div>
</section></div>{anuncio('rodape')}"""
escrever("praticar.html", pagina("praticar.html", "Praticar verbos em inglês: cartões, quiz, ditado e fala | Teia das Línguas",
    "Treine verbos em inglês com repetição espaçada, quiz, ditado, reconhecimento de voz e conjugação, por nível CEFR.", corpo, "./", "praticar.html", ["praticar.js"]))

# ---------------------------------------------------------------- IDIOMAS
FILA = [("Espanhol", "es"), ("Francês", "fr"), ("Alemão", "de"), ("Italiano", "it"), ("Japonês", "ja")]
corpo = f"""<div class="pagina"><section><h1>Idiomas</h1>
<p>Cada idioma é um pacote completo: todos os verbos no infinitivo, significado, pronúncia adaptada à sua língua materna, sílabas, áudio e trilhas do A1 ao C2.</p>
<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
<article class="bloco"><span class="selo" style="--cor:var(--ok)">Disponível</span><h2 style="margin-top:8px">Inglês</h2>
<p>{fmt(STATUS['total'])} verbos · {fmt(STATUS['traduzidos'])} com significado em português · {fmt(STATUS['com_pronuncia'])} com pronúncia adaptada. Atualizado todos os dias.</p>
<div style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn" href="dicionario.html">Estudar no site</a><button class="btn sec" id="offline">Baixar para usar offline</button><a class="btn sec" href="dados/en/pacote.csv" download="teia-das-linguas-verbos-ingles.csv">Baixar planilha (CSV)</a></div>
<p class="form-msg" id="off-msg"></p></article>
{''.join(f'<article class="bloco"><span class="selo" style="--cor:var(--acafrao)">Em produção</span><h2 style="margin-top:8px">{n}</h2><p>Na fila da automação. Peça prioridade e avisaremos quando chegar.</p><button class="btn sec" data-acao="sugerir" data-tipo="idioma" type="button">Quero este idioma</button></article>' for n, c in FILA)}
</div></section></div>
<script>document.addEventListener('DOMContentLoaded',()=>{{const b=document.getElementById('offline'),m=document.getElementById('off-msg');
b.onclick=async()=>{{if(!('caches' in window)){{m.className='form-msg erro';m.textContent='Seu navegador não permite uso offline.';return;}}
m.className='form-msg';m.textContent='Baixando o pacote de inglês…';const r=TDL.raiz;
const arqs=['index.html','dicionario.html','praticar.html','fonetica.html','metodos.html','niveis.html','dados/en/indice.json','dados/en/status.json','assets/estilo.css','assets/nucleo.js','assets/config.js','assets/dicionario.js','assets/praticar.js'].concat('abcdefghijklmnopqrstuvwxyz'.split('').map(l=>'dados/en/detalhes/'+l+'.json'));
try{{const c=await caches.open('tdl-pacote-en');await c.addAll(arqs.map(a=>r+a));TDL.LS.set('tdl_offline_en',Date.now());m.className='form-msg ok';m.textContent='Pronto! O inglês está disponível offline neste aparelho.';}}
catch(e){{m.className='form-msg erro';m.textContent='Não foi possível baixar agora. Verifique a conexão e tente de novo.';}}}};}});</script>"""
escrever("idiomas.html", pagina("idiomas.html", "Idiomas disponíveis e pacotes para baixar | Teia das Línguas",
    "Baixe pacotes completos de verbos de cada idioma para estudar online ou offline. Inglês disponível; espanhol, francês, alemão, italiano e japonês em produção.", corpo, "./", "idiomas.html"))

# ---------------------------------------------------------------- CONTA
escrever("conta.html", pagina("conta.html", "Minha conta | Teia das Línguas", "Entre ou crie sua conta grátis para salvar seu progresso em todos os aparelhos.",
    '<div class="pagina estreita"><section><h1>Minha conta</h1><p>Com a conta grátis, seu progresso, sequência de dias e revisões ficam salvos em todos os seus aparelhos.</p><div id="conta"><div class="vazio">Carregando…</div></div></section></div>',
    "./", "", ["conta.js"], noindex=True))

# ---------------------------------------------------------------- LIÇÕES (geradas pela automação)
lic_lista = "".join(f'<article class="bloco"><span class="selo n-{l["nivel"]}">{l["nivel"]}</span><h3 style="margin-top:6px"><a href="licoes/{l["id"]}.html">{H(l["titulo"])}</a></h3><p>{H(l["resumo"])}</p><small style="color:var(--tinta-3)">{l["data"]}</small></article>' for l in sorted(LICOES, key=lambda x: x["data"], reverse=True))
escrever("licoes.html", pagina("licoes.html", "Lições de inglês por nível | Teia das Línguas", "Lições curtas de inglês por nível CEFR, com textos, vocabulário e exercícios. Novas lições toda semana.",
    f'<div class="pagina"><section><h1>Lições</h1><p>Lições novas chegam automaticamente, cada uma ligada aos verbos e à gramática do seu nível.</p><div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">{lic_lista or "<div class=vazio>A primeira lição chega na próxima atualização automática.</div>"}</div></section></div>', "./"))
for l in LICOES:
    blocos = "".join(f'<h2>{H(b["titulo"])}</h2>' + "".join(f"<p>{H(p)}</p>" for p in b.get("paragrafos", [])) +
                     (('<ul class="exemplos">' + "".join(f'<li lang="en">{H(e[0])}<span lang="pt-BR">{H(e[1])}</span></li>' for e in b["exemplos"]) + "</ul>") if b.get("exemplos") else "")
                     for b in l.get("blocos", []))
    escrever(f"licoes/{l['id']}.html", pagina(f"licoes/{l['id']}.html", f"{l['titulo']} | Teia das Línguas", l["resumo"],
        f'<div class="pagina estreita"><section><p class="migalhas"><a href="../licoes.html">Lições</a> / {l["nivel"]}</p><span class="selo n-{l["nivel"]}">{l["nivel"]}</span><h1 style="margin-top:8px">{H(l["titulo"])}</h1><p class="lead">{H(l["resumo"])}</p>{blocos}</section></div>{anuncio("meio")}', "../"))

# ---------------------------------------------------------------- INSTITUCIONAIS
INST = {
 "sobre.html": ("Sobre a Teia das Línguas", "O que é a Teia das Línguas, como o conteúdo é produzido e atualizado.",
  f"""<h1>Sobre a Teia das Línguas</h1><p>A Teia das Línguas é um site gratuito para aprender idiomas de forma prática e baseada em ciência. Começamos pelo inglês, com {fmt(STATUS['total'])} verbos no infinitivo organizados em ordem alfabética e pelos seis níveis do Quadro Europeu Comum de Referência (CEFR).</p>
<h2>De onde vêm os dados</h2><p>A lista de verbos e as definições em inglês vêm do Open English WordNet. A pronúncia parte do CMU Pronouncing Dictionary e é convertida automaticamente para uma escrita adaptada ao português. A frequência de uso, que define o nível estimado de cada verbo, vem de grandes corpora de legendas (OpenSubtitles). Significados, lições e revisões são produzidos com auxílio de inteligência artificial e revisados continuamente com a ajuda dos alunos.</p>
<h2>Como o conteúdo se atualiza</h2><p>Todos os dias uma rotina automática traduz novos verbos, aplica correções enviadas pelos alunos, cria lições e publica as mudanças. Quando você relata um erro, ele entra nessa fila e a correção aparece para todos.</p>"""),
 "privacidade.html": ("Política de privacidade", "Como a Teia das Línguas coleta, usa e protege seus dados, incluindo cookies e anúncios.",
  f"""<h1>Política de privacidade</h1><p>Última atualização: {datetime.date.today().strftime('%d/%m/%Y')}.</p>
<h2>Dados que coletamos</h2><p>Para visitantes sem conta, guardamos preferências e progresso apenas no seu navegador (armazenamento local). Ao criar uma conta, guardamos seu e-mail, o nome que você informar, suas preferências de estudo e seu progresso. Senhas são processadas pelo serviço de autenticação Supabase e nunca ficam visíveis para nós.</p>
<h2>Como usamos</h2><p>Usamos seus dados apenas para oferecer o serviço: salvar progresso, sincronizar aparelhos, enviar e-mails de confirmação e recuperação de senha, e melhorar o conteúdo a partir das sugestões enviadas. Não vendemos dados pessoais.</p>
<h2>Cookies e anúncios</h2><p>Este site pode exibir anúncios do Google AdSense. O Google e seus parceiros usam cookies para exibir anúncios com base em visitas anteriores a este e a outros sites. Você pode desativar a publicidade personalizada nas <a href="https://adssettings.google.com" rel="noopener">Configurações de anúncios do Google</a> e saber mais em <a href="https://policies.google.com/technologies/ads" rel="noopener">como o Google usa dados</a>.</p>
<h2>Seus direitos (LGPD)</h2><p>Você pode acessar, baixar e pedir a exclusão dos seus dados a qualquer momento na página Minha conta ou pela página de contato.</p>
<h2>Voz e microfone</h2><p>O áudio é gerado pelo próprio navegador. No treino de fala, o reconhecimento de voz é feito pelo navegador e o áudio não é armazenado por nós.</p>"""),
 "termos.html": ("Termos de uso", "Condições de uso do site Teia das Línguas.",
  """<h1>Termos de uso</h1><p>Ao usar a Teia das Línguas você concorda com estes termos. O conteúdo é oferecido gratuitamente para fins educacionais.</p>
<h2>Uso do conteúdo</h2><p>Você pode estudar, baixar os pacotes para uso pessoal e compartilhar links. A redistribuição comercial em massa do conteúdo não é permitida.</p>
<h2>Conta</h2><p>Você é responsável por manter sua senha segura. Podemos suspender contas usadas para abuso, spam ou tentativa de violar a segurança do site.</p>
<h2>Precisão</h2><p>Trabalhamos para manter o conteúdo correto, mas ele pode conter erros. Use o botão de relatar erro para nos ajudar.</p>
<h2>Mudanças</h2><p>Estes termos podem ser atualizados. A data da última versão aparece na política de privacidade.</p>"""),
 "contato.html": ("Contato", "Fale com a Teia das Línguas: sugestões, correções e parcerias.",
  """<h1>Contato</h1><p>A forma mais rápida de falar com a gente é pelo formulário abaixo. Ele exige uma conta grátis para evitar spam.</p>
<p><button class="btn" data-acao="sugerir" data-tipo="outro" type="button">Enviar mensagem</button></p>
<h2>Relatar um erro</h2><p>Em qualquer página de verbo há um botão para relatar erro de significado ou pronúncia. A correção entra na fila de revisão automática.</p>"""),
}
for fp, (t, d, c) in INST.items():
    escrever(fp, pagina(fp, f"{t} | Teia das Línguas", d, f'<div class="pagina estreita"><section>{c}</section></div>', "./"))

# ---------------------------------------------------------------- PÁGINAS DE VERBO
ordem = sorted(IDX, key=lambda x: x["v"])
por_rank = sorted(IDX, key=lambda x: x["r"])
pos_rank = {x["v"]: k for k, x in enumerate(por_rank)}
for k, i in enumerate(ordem):
    v = i["v"]; d = DET.get(v, {}); n = i["n"]
    sig = i["pt"]
    prev_v = ordem[k - 1]["v"] if k else None; next_v = ordem[k + 1]["v"] if k + 1 < len(ordem) else None
    pr_idx = pos_rank[v]
    rel = [x for x in por_rank[max(0, pr_idx - 6): pr_idx + 7] if x["v"] != v and x["n"] == n][:8]
    defs = "".join(f"<li lang=\"en\">{H(x)}</li>" for x in d.get("def", []))
    sil_html = fita_html(i["sil"]) if i["sil"] else '<p style="color:var(--tinta-3)">Pronúncia em revisão.</p>'
    titulo = f"{v}: significado, pronúncia e conjugação em inglês | Teia das Línguas"
    descr = (f"O que significa \"{v}\" em inglês: {sig.split(';')[0]}. " if sig else f"Verbo \"{v}\" em inglês: ") + \
            (f"Pronúncia adaptada: {i['pr']}. " if i["pr"] else "") + f"Passado: {d.get('past','')}. Nível {n}."
    corpo = f"""<div class="pagina"><p class="migalhas"><a href="../../dicionario.html">Dicionário</a> / <a href="../../dicionario.html?n={n}">{n}</a> / {H(v)}</p>
<div class="ficha">
<section class="bloco" style="padding:28px">
<span class="selo n-{n}">{n} · {CONT['niveis'][n]['nome']}</span>{' <span class="selo" style="--cor:var(--acafrao)">irregular</span>' if i.get('i') else ''}{' <span class="selo" style="--cor:var(--fio)">phrasal verb</span>' if i.get('f') else ''}
<h1 lang="en" style="margin:12px 0 6px">to {H(v)}</h1>
<p class="signif" id="sig" style="margin:0 0 18px;font-size:1.3rem">{H(sig) if sig else '<i style="color:var(--tinta-3)">Significado em português chegando na próxima atualização.</i>'}</p>
<h2 style="font-size:1.1rem">Pronúncia</h2>
<p style="font-size:1.4rem;margin:0 0 10px" id="pr">{H(i['pr']) if i['pr'] else '—'}</p>
<div id="fita">{sil_html}</div>
<div class="sons" style="flex-wrap:wrap;margin-top:16px">
<button class="som" type="button" id="b-en">{SOM}Voz nativa</button>
<button class="som" type="button" id="b-lento">{SOM}Nativa devagar</button>
{f'<button class="som" type="button" id="b-pt">{SOM}Adaptada</button><button class="som" type="button" id="b-sil">{SOM}Sílaba por sílaba</button>' if i['pr'] else ''}
</div>
{f'<p style="margin-top:14px;color:var(--tinta-3);font-size:.95rem">Fonética internacional (IPA): /{H(d.get("ipa",""))}/</p>' if d.get('ipa') else ''}
</section>
<section class="bloco"><h2 style="font-size:1.2rem">Conjugação</h2>
<table class="tabela" lang="en">
<tr><th>Infinitivo</th><td><button class="som" type="button" data-f="{H(v)}">to {H(v)}</button></td></tr>
<tr><th>Presente (he/she/it)</th><td><button class="som" type="button" data-f="{H(d.get('s3',''))}">{H(d.get('s3',''))}</button></td></tr>
<tr><th>Passado simples</th><td><button class="som" type="button" data-f="{H(d.get('past','').split('/')[0])}">{H(d.get('past',''))}</button></td></tr>
<tr><th>Particípio passado</th><td><button class="som" type="button" data-f="{H(d.get('pp','').split('/')[0])}">{H(d.get('pp',''))}</button></td></tr>
<tr><th>Gerúndio</th><td><button class="som" type="button" data-f="{H(d.get('ing',''))}">{H(d.get('ing',''))}</button></td></tr>
</table>
<p style="font-size:.9rem;color:var(--tinta-3);margin-top:10px">{'Verbo irregular: memorize as formas do passado.' if i.get('i') else 'Verbo regular: passado e particípio terminam em -ed.'}</p>
</section></div>
{anuncio('meio')}
<div class="ficha" style="margin-top:0">
<section class="bloco"><h2 style="font-size:1.2rem">Definição em inglês</h2><ol>{defs or '<li>—</li>'}</ol>
{f'<h3 style="margin-top:14px">Exemplo</h3><p lang="en" id="ex"><button class="som" type="button" data-f="{H(d["ex"])}">{SOM}</button> {H(d["ex"])}</p>' if d.get('ex') else '<p id="ex"></p>'}
</section>
<section class="bloco"><h2 style="font-size:1.2rem">Continue aprendendo</h2>
<div class="vizinhos" style="margin-bottom:14px">{''.join(f'<a href="{slug(x["v"])}.html" lang="en">{H(x["v"])}</a>' for x in rel)}</div>
<div style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn peq" href="../../praticar.html?n={n}">Treinar o nível {n}</a><a class="btn sec peq" href="../../nivel/{n.lower()}.html">Gramática do {n}</a>
<button class="btn sec peq" type="button" data-acao="sugerir" data-verbo="{H(v)}">Relatar erro</button></div>
</section></div>
<nav class="vizinhos" style="justify-content:space-between;margin:20px 0" aria-label="Verbos vizinhos">{f'<a href="{slug(prev_v)}.html">← {H(prev_v)}</a>' if prev_v else '<span></span>'}{f'<a href="{slug(next_v)}.html">{H(next_v)} →</a>' if next_v else ''}</nav>
</div>
<script type="application/json" id="dados-verbo">{json.dumps({'v': v, 'pr': i['pr'], 'sil': i['sil']}, ensure_ascii=False)}</script>"""
    ld = {"@context": "https://schema.org", "@type": "DefinedTerm", "name": v, "description": sig or "; ".join(d.get("def", [])),
          "inDefinedTermSet": BASE + "/dicionario.html", "url": f"{BASE}/en/verbos/{slug(v)}.html"}
    escrever(f"en/verbos/{slug(v)}.html", pagina(f"en/verbos/{slug(v)}.html", titulo, descr, corpo, "../../", scripts=["verbo.js"], json_ld=ld))

# ---------------------------------------------------------------- PAINEL, 404, SITEMAP, ROBOTS, PWA
escrever("painel/index.html", pagina("painel/index.html", "Painel de controle | Teia das Línguas", "Painel administrativo.",
    '<div class="pagina"><section id="painel"><div class="vazio">Carregando o painel…</div></section></div>', "../", scripts=["painel.js"], noindex=True))
escrever("404.html", pagina("404.html", "Página não encontrada | Teia das Línguas", "Página não encontrada.",
    '<div class="pagina estreita"><section><h1>Esta página não existe</h1><p>O endereço pode ter mudado. Busque o verbo que procura:</p><form class="busca-grande" action="/dicionario.html"><input name="q" placeholder="Digite um verbo"><button class="btn">Buscar</button></form></section></div>', "/", noindex=True))

urls = ["", "dicionario.html", "niveis.html", "praticar.html", "fonetica.html", "metodos.html", "idiomas.html", "licoes.html", "sobre.html", "privacidade.html", "termos.html", "contato.html"]
urls += [f"nivel/{n.lower()}.html" for n in NIVEIS] + [f"licoes/{l['id']}.html" for l in LICOES]
urls += [f"en/verbos/{slug(i['v'])}.html" for i in ordem]
hoje = datetime.date.today().isoformat()
escrever("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
         "".join(f"<url><loc>{H(BASE + '/' + u)}</loc><lastmod>{hoje}</lastmod></url>\n" for u in urls) + "</urlset>\n")
escrever("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /painel/\nDisallow: /tools/\nSitemap: {BASE}/sitemap.xml\n")
escrever("manifest.webmanifest", json.dumps({"name": "Teia das Línguas", "short_name": "Teia Línguas", "start_url": "./index.html", "display": "standalone",
    "background_color": "#F3F5F8", "theme_color": "#0E7C86", "lang": "pt-BR", "icons": [{"src": "assets/icone.svg", "sizes": "any", "type": "image/svg+xml"}]}, ensure_ascii=False))
escrever("assets/icone.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#10162A"/><g fill="none" stroke="#3CC1CB" stroke-width="2" stroke-linecap="round"><path d="M6 8 L16 4 L26 8 L26 22 L16 28 L6 22 Z"/><path d="M6 8 L26 22 M26 8 L6 22 M16 4 L16 28"/></g><circle cx="16" cy="16" r="4.2" fill="#F2B65A"/></svg>')
print("páginas geradas:", len(urls) + 4, "| base:", BASE)
