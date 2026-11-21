"""Enriquecimento das páginas de verbo (Teia das Línguas).

Conteúdo original em conteudo/verbos_ricos_en.json, no formato:
{
  "verbo": {
    "uso": "1 a 3 parágrafos curtos em português explicando como e quando usar (separe parágrafos com \\n\\n)",
    "exemplos": [["frase em inglês", "tradução natural em português"], ... 5 a 6 itens, do simples ao avançado],
    "dicas": ["dica prática para brasileiros (erro comum, falso cognato, pronúncia)", ... 2 a 4],
    "expressoes": [["expressão / collocation / phrasal", "significado em português"], ... 3 a 5],
    "data": "AAAA-MM-DD"
  }
}
A conjugação completa (5 tempos x 5 pessoas) é gerada automaticamente a partir das formas do verbo.

Uso:
  python3 tools/verbos_ricos.py fila 20     -> próximos 20 verbos (mais usados primeiro) ainda sem enriquecimento, com os dados de apoio
  python3 tools/verbos_ricos.py validar     -> confere o JSON (campos obrigatórios, tamanhos, verbos existentes)
  python3 tools/verbos_ricos.py status      -> quantos já foram enriquecidos
"""
import json, os, string, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FP = os.path.join(ROOT, "conteudo", "verbos_ricos_en.json")

PESSOAS = ["I", "you", "he/she/it", "we", "they"]


def carregar():
    return json.load(open(FP, encoding="utf-8")) if os.path.exists(FP) else {}


def _f(x):
    return (x or "").split("/")[0].strip()


def conjugacao(v, d):
    """Retorna [(tempo, [(pessoa, forma), ...]), ...] para as tabelas da página."""
    s3, past, pp, ing = d.get("s3") or v + "s", _f(d.get("past")) or v + "ed", _f(d.get("pp")) or v + "ed", d.get("ing") or v + "ing"
    if " " in v:  # phrasal verb: conjuga só a primeira palavra
        base, resto = v.split(" ", 1)
        resto = " " + resto
    else:
        base, resto = v, ""

    def r(forma):  # coloca a partícula do phrasal depois da forma
        if not resto or forma.endswith(resto):
            return forma
        return forma + resto

    if v == "be":
        pres = ["am", "are", "is", "are", "are"]
        pas = ["was", "were", "was", "were", "were"]
        cont = ["am being", "are being", "is being", "are being", "are being"]
    else:
        pres = [v, v, s3, v, v]
        pas = [past] * 5
        cont = [f"am {ing}", f"are {ing}", f"is {ing}", f"are {ing}", f"are {ing}"]
    perf = [f"have {pp}", f"have {pp}", f"has {pp}", f"have {pp}", f"have {pp}"]
    fut = [f"will {v}"] * 5
    tempos = [
        ("Presente simples", pres),
        ("Passado simples", pas),
        ("Presente contínuo", cont),
        ("Presente perfeito", perf),
        ("Futuro (will)", fut),
    ]
    return [(t, [(p, r(f)) for p, f in zip(PESSOAS, formas)]) for t, formas in tempos]


def _detalhes():
    det = {}
    for l in list(string.ascii_lowercase) + ["0"]:
        fp = os.path.join(ROOT, "dados", "en", "detalhes", f"{l}.json")
        if os.path.exists(fp):
            det.update(json.load(open(fp, encoding="utf-8")))
    return det


def validar(ricos=None, quieto=False):
    ricos = carregar() if ricos is None else ricos
    idx = {x["v"] for x in json.load(open(os.path.join(ROOT, "dados", "en", "indice.json"), encoding="utf-8"))}
    erros = []
    for v, e in ricos.items():
        if v not in idx:
            erros.append(f"{v}: verbo não existe no índice")
        if not isinstance(e.get("uso"), str) or len(e["uso"]) < 120:
            erros.append(f"{v}: 'uso' ausente ou curto demais (mín. 120 caracteres)")
        ex = e.get("exemplos", [])
        if len(ex) < 4 or any(not (isinstance(x, list) and len(x) == 2 and all(x)) for x in ex):
            erros.append(f"{v}: 'exemplos' precisa de pelo menos 4 pares [inglês, português]")
        if len(e.get("dicas", [])) < 2:
            erros.append(f"{v}: 'dicas' precisa de pelo menos 2 itens")
        exp = e.get("expressoes", [])
        if len(exp) < 3 or any(not (isinstance(x, list) and len(x) == 2 and all(x)) for x in exp):
            erros.append(f"{v}: 'expressoes' precisa de pelo menos 3 pares [expressão, significado]")
    if not quieto:
        print("\n".join(erros) if erros else f"ok: {len(ricos)} verbos enriquecidos, sem erros")
    return erros


def fila(n):
    ricos = carregar()
    det = _detalhes()
    idx = sorted(json.load(open(os.path.join(ROOT, "dados", "en", "indice.json"), encoding="utf-8")), key=lambda x: x["r"])
    saida = []
    for x in idx:
        if x["v"] in ricos:
            continue
        d = det.get(x["v"], {})
        saida.append({"v": x["v"], "pt": x["pt"], "nivel": x["n"], "irregular": bool(x.get("i")), "phrasal": bool(x.get("f")),
                      "formas": {k: d.get(k, "") for k in ("s3", "past", "pp", "ing")}, "def_en": d.get("def", []), "ex_en": d.get("ex", "")})
        if len(saida) >= n:
            break
    print(json.dumps(saida, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "fila":
        fila(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif cmd == "validar":
        sys.exit(1 if validar() else 0)
    else:
        total = len(json.load(open(os.path.join(ROOT, "dados", "en", "indice.json"), encoding="utf-8")))
        print(f"{len(carregar())} de {total} verbos enriquecidos")
