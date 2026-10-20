"""Gera os arquivos que o site lê, a partir da base bruta + traduções + correções.
Uso: python3 build_site_data.py [idioma=en]
Saídas em dados/<idioma>/: indice.json, detalhes/<letra>.json, pacote.csv, pacote.json, status.json
"""
import json, os, glob, csv, sys, string, datetime

LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
D = os.path.join(ROOT, "dados", LANG)
base = json.load(open(os.path.join(D, "base_bruta.json"), encoding="utf-8"))

# traduções (arquivos tsv numerados; o último vence)
pt = {}
for fp in sorted(glob.glob(os.path.join(ROOT, "tools", "traducoes", f"{'pt' if LANG == 'en' else LANG + '_pt'}_*.tsv"))):
    for line in open(fp, encoding="utf-8"):
        if "\t" in line:
            k, v = line.rstrip("\n").split("\t", 1)
            pt[k.strip()] = v.strip()

# correções manuais vindas do painel (aplicadas por cima de tudo)
corr_fp = os.path.join(D, "correcoes.json")
corr = json.load(open(corr_fp, encoding="utf-8")) if os.path.exists(corr_fp) else {}

indice, det = [], {}
for x in base:
    c = corr.get(x["v"], {})
    item = {
        "v": x["v"], "pt": c.get("pt", pt.get(x["v"], "")), "n": c.get("nivel", x["nivel"]), "r": x["rank"],
        "pr": c.get("pr", x["pr"]), "sil": c.get("sil", x["sil"]),
    }
    if x["irr"]: item["i"] = 1
    if x["fras"]: item["f"] = 1
    if x.get("vulgar"): item["x"] = 1
    indice.append(item)
    letra = x["v"][0] if x["v"][0] in string.ascii_lowercase else "0"
    det.setdefault(letra, {})[x["v"]] = {
        "past": x["past"], "pp": x["pp"], "ing": x["ing"], "s3": x["s3"],
        "ipa": x["ipa"], "def": x["defEn"], "ex": c.get("ex", x["ex"]), "ns": x["ns"],
    }

indice.sort(key=lambda i: i["v"])
os.makedirs(os.path.join(D, "detalhes"), exist_ok=True)
json.dump(indice, open(os.path.join(D, "indice.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
for l, d in det.items():
    json.dump(d, open(os.path.join(D, "detalhes", f"{l}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# pacote para download (CSV abre no Excel/Sheets)
with open(os.path.join(D, "pacote.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["verbo", "significado_pt", "pronuncia_adaptada", "pronuncia_silabas", "ipa", "nivel_cefr",
                "ranking_frequencia", "passado", "participio", "gerundio", "irregular", "phrasal_verb", "definicao_en", "exemplo_en"])
    for i in indice:
        d = det[i["v"][0] if i["v"][0] in string.ascii_lowercase else "0"][i["v"]]
        w.writerow([i["v"], i["pt"], i["pr"], i["sil"], d["ipa"], i["n"], i["r"], d["past"], d["pp"], d["ing"],
                    "sim" if i.get("i") else "não", "sim" if i.get("f") else "não", " | ".join(d["def"]), d["ex"]])

niveis = {}
for i in indice:
    niveis.setdefault(i["n"], [0, 0])
    niveis[i["n"]][0] += 1
    if i["pt"]: niveis[i["n"]][1] += 1
status = {
    "idioma": LANG, "atualizado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "total": len(indice), "traduzidos": sum(1 for i in indice if i["pt"]),
    "com_pronuncia": sum(1 for i in indice if i["pr"]), "irregulares": sum(1 for i in indice if i.get("i")),
    "phrasal": sum(1 for i in indice if i.get("f")),
    "por_nivel": {k: {"total": v[0], "traduzidos": v[1]} for k, v in sorted(niveis.items())},
    "fila_traducao": [b["v"] for b in base if not pt.get(b["v"]) and not corr.get(b["v"], {}).get("pt")][:200],
}
json.dump(status, open(os.path.join(D, "status.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in status.items() if k != "fila_traducao"}, ensure_ascii=False))
