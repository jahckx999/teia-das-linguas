"""Monta a base completa de verbos do inglês (Teia das Línguas).
Fontes abertas: Open English WordNet (lista de verbos + definições),
CMU Pronouncing Dictionary (pronúncia), FrequencyWords/OpenSubtitles 2018 (frequência).
Uso: python3 build_base_en.py <pasta_dados_brutos> <pasta_saida>
"""
import sys, os, re, json, glob, yaml
sys.path.insert(0, os.path.dirname(__file__))
from pronuncia_ptbr import adaptar
from irregulares_en import IRREG

RAW = sys.argv[1] if len(sys.argv) > 1 else "/root/data"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "dados", "en")
os.makedirs(OUT, exist_ok=True)

# 1) frequência
freq = {}
with open(f"{RAW}/FrequencyWords/content/2018/en/en_full.txt", encoding="utf-8") as f:
    for line in f:
        w, _, c = line.rstrip("\n").rpartition(" ")
        if w and c.isdigit():
            freq[w] = int(c)

# 2) pronúncia CMU (primeira variante)
cmu = {}
with open(f"{RAW}/cmudict/cmudict.dict", encoding="utf-8") as f:
    for line in f:
        line = line.split("#")[0].strip()
        if not line: continue
        w, _, ph = line.partition(" ")
        if "(" in w: continue
        cmu[w] = ph.strip()

extra = os.path.join(os.path.dirname(os.path.abspath(__file__)), "arpabet_extra.tsv")
if os.path.exists(extra):
    for line in open(extra, encoding="utf-8"):
        if "\t" in line:
            w, ph = line.rstrip("\n").split("\t", 1); cmu[w.strip().lower()] = ph.strip()

# 3) WordNet: lemas verbais, nº de sentidos, IPA, definições
yd = f"{RAW}/english-wordnet/src/yaml"
synsets = {}
for fp in glob.glob(f"{yd}/verb.*.yaml"):
    for sid, s in yaml.load(open(fp), Loader=yaml.CLoader).items():
        synsets[sid] = s
lemas = {}
for fp in sorted(glob.glob(f"{yd}/entries-*.yaml")):
    for lemma, val in yaml.load(open(fp), Loader=yaml.CLoader).items():
        if "v" not in val: continue
        w = lemma.lower().strip()
        if not re.fullmatch(r"[a-z][a-z' -]*[a-z]", w): continue
        vs = val["v"].get("sense", [])
        total = sum(len(p.get("sense", [])) for p in val.values() if isinstance(p, dict))
        ipa = ""
        for pos in ("v", "n", "a", "s", "r"):
            if pos in val and val[pos].get("pronunciation"):
                ipa = val[pos]["pronunciation"][0].get("value", ""); break
        defs, ex = [], ""
        for s in vs[:3]:
            sy = synsets.get(s.get("synset"), {})
            if sy.get("definition"): defs.append(sy["definition"][0])
            if not ex and sy.get("example"):
                e = sy["example"][0]
                ex = e if isinstance(e, str) else e.get("text", "")
        prev = lemas.get(w)
        if prev and prev["nsent"] >= len(vs): continue
        lemas[w] = {"nsent": len(vs), "ratio": len(vs) / max(total, 1), "ipa": ipa, "def": defs, "ex": ex}

# 4) conjugação básica
VOW = "aeiou"
def regular_past(v):
    if v.endswith("e"): return v + "d"
    if re.search(r"[^aeiou]y$", v): return v[:-1] + "ied"
    if re.fullmatch(r"[^aeiou]*[aeiou][^aeiouwxy]", v): return v + v[-1] + "ed"
    return v + "ed"
def ing(v):
    if v.endswith("ie"): return v[:-2] + "ying"
    if v.endswith(("ee", "ye", "oe")) or v in ("be", "see", "singe"): return v + "ing"
    if v.endswith("e") and len(v) > 2: return v[:-1] + "ing"
    if re.fullmatch(r"[^aeiou]*[aeiou][^aeiouwxy]", v): return v + v[-1] + "ing"
    return v + "ing"
def third(v):
    if v in ("be",): return "is"
    if v == "have": return "has"
    if re.search(r"(s|sh|ch|x|z|o)$", v): return v + "es"
    if re.search(r"[^aeiou]y$", v): return v[:-1] + "ies"
    return v + "s"

def _cmu(p):
    for c in (p, re.sub(r"is(e|ing|ed)$", r"iz\1", p), re.sub(r"ys(e)$", r"yz\1", p), p.replace("our", "or")):
        if c in cmu: return cmu[c]
    return None

def pron(word):
    parts = word.replace("-", " ").split()
    if all(_cmu(p) for p in parts):
        res = [adaptar(_cmu(p)) for p in parts]
        return " ".join(r[0] for r in res), " · ".join(r[1] for r in res), sum(r[2] for r in res), " ".join(_cmu(p) for p in parts)
    if all(p in cmu for p in parts):
        res = [adaptar(cmu[p]) for p in parts]
        return " ".join(r[0] for r in res), " · ".join(r[1] for r in res), sum(r[2] for r in res), " ".join(cmu[p] for p in parts)
    return "", "", 0, ""

def first(forms): return forms.split("/")[0]

EXCLUIR = {"don","ain","gonna","wanna"}
DEMOTE = set("""people okay ooh aah wow tsk shush whoosh gee bleep beep out except down even still right lot man tree husband mother police doctor
couple harry josh lunch breakfast job school course chance bed evidence fee glass moon film letter head room cream lord
whore nick cop mine up headquarter base age map part ready top number team farm arm wine bitch father parent finger seat
better sort stuff pop dog boy girl baby brother sister son daughter wife friend guy dad mom kid hell god sir lady king
queen car home house door table window water fire sun night morning day week year money gold blood heart eye ear nose
mouth hand head face hair book paper bottle cup box bag key gun knife sword horse cat fish bird bear pig cow chicken
egg bread milk tea coffee beer wine cake candy apple orange lemon cherry corn rice salt sugar butter cheese meat
army navy class club court church bank office market hotel hospital prison station street road bridge river sea lake
island mountain hill rock stone wood tree flower grass leaf garden park field city town village country world earth
sky rain snow wind storm cloud ice air light dark color red blue green white black brown gray yellow pink""".split())
PAST_FORMS = {f for a, b in IRREG.values() for f in (a.split("/") + b.split("/"))}
AJUSTE = {"guy":0.005,"found":0.2,"time":0.2,"name":0.4,"back":0.3,"place":0.5,"water":0.3,"head":0.4,"face":0.5,
          "book":0.5,"eye":0.3,"hand":0.4,"can":0.3,"will":0.3,"thank":1.0}
VULGAR = {"fuck","shit","piss","bugger","bullshit","fart","screw up"}
donos = {}
for w in lemas:
    if " " in w or "-" in w: continue
    for f_ in {third(w), ing(w)}:
        if f_ in lemas and f_ != w: continue
        if f_ not in donos or freq.get(w, 0) > freq.get(donos[f_], 0): donos[f_] = w
def fq(form, lemma):
    return freq.get(form, 0) if donos.get(form, lemma) == lemma else 0
verbos = []
for w, d in lemas.items():
    if w in EXCLUIR: continue
    multi = " " in w or "-" in w
    if w in IRREG: past, pp = IRREG[w]; irr = True
    elif multi:
        head, rest = w.split(" ", 1) if " " in w else (w, "")
        if head in IRREG:
            past, pp = (IRREG[head][0] + " " + rest).strip(), (IRREG[head][1] + " " + rest).strip(); irr = True
        else:
            past = (regular_past(head) + " " + rest).strip(); pp = past; irr = False
    else:
        past = pp = regular_past(w); irr = False
    if not multi:
        r2 = d["ratio"] ** 3 * (0.05 if w in PAST_FORMS and w not in IRREG else 1)
        score = freq.get(w, 0) * r2 + fq(third(w), w) * r2 + fq(ing(w), w) * 0.8 * d["ratio"]
        for f_ in set(past.split("/") + pp.split("/")):
            score += freq.get(f_, 0) * (0.6 if f_ in lemas else 1.0) * (0.5 + d["ratio"])
    else:
        comps = w.replace("-", " ").split()
        score = min(freq.get(c, 0) for c in comps) * 0.004 * d["nsent"] * (0.15 ** max(0, len(comps) - 2))
    score *= AJUSTE.get(w, 1)
    if w in DEMOTE: score *= 0.03
    if w in VULGAR: score *= 0.01
    completa, silabada, nsil, arpa = pron(w)
    verbos.append({
        "v": w, "irr": irr, "past": past, "pp": pp,
        "ing": ing(w.split(" ")[0]) + (" " + w.split(" ", 1)[1] if " " in w else ""),
        "s3": third(w.split(" ")[0]) + (" " + w.split(" ", 1)[1] if " " in w else ""),
        "pr": completa, "sil": silabada, "ns": nsil, "ipa": d["ipa"], "arpa": arpa,
        "defEn": d["def"], "vulgar": w in VULGAR, "ex": d["ex"], "fras": multi, "score": round(score, 2),
    })

verbos.sort(key=lambda x: -x["score"])
NIVEIS = [(300, "A1"), (800, "A2"), (1600, "B1"), (3000, "B2"), (5500, "C1"), (10**9, "C2")]
for i, x in enumerate(verbos, 1):
    x["rank"] = i
    x["nivel"] = next(n for lim, n in NIVEIS if i <= lim)
    del x["score"]

json.dump(verbos, open(f"{OUT}/base_bruta.json", "w"), ensure_ascii=False)
print("verbos:", len(verbos), "frasais:", sum(x["fras"] for x in verbos),
      "sem pronúncia:", sum(1 for x in verbos if not x["pr"]))
print("top 40:", [x["v"] for x in verbos[:40]])
