"""Converte a transcrição ARPAbet (CMU) em pronúncia adaptada ao português do Brasil.
Saída: pronúncia completa (ex.: "abéndan") e por sílabas (ex.: "a-BÉN-dan", tônica em maiúsculas).
"""
import re

VOG_T = {  # vogais tônicas (com acento)
 "AA":"á","AE":"é","AH":"â","AO":"ó","AW":"áu","AY":"ái","EH":"é","ER":"âr",
 "EY":"êi","IH":"i","IY":"í","OW":"ôu","OY":"ói","UH":"u","UW":"ú"}
VOG_A = {  # vogais átonas
 "AA":"a","AE":"é","AH":"a","AO":"o","AW":"au","AY":"ai","EH":"e","ER":"âr",
 "EY":"ei","IH":"i","IY":"i","OW":"ou","OY":"oi","UH":"u","UW":"u"}
CONS = {"B":"b","CH":"tch","D":"d","DH":"d","F":"f","G":"g","HH":"r","JH":"dj","K":"k",
 "L":"l","M":"m","N":"n","NG":"ng","P":"p","R":"r","S":"s","SH":"ch","T":"t","TH":"f",
 "V":"v","W":"u","Y":"i","Z":"z","ZH":"j"}
# ataques (onsets) permitidos em inglês para dividir sílabas
ONSETS = {tuple(o.split()) for o in """
P R|P L|B R|B L|T R|D R|K R|K L|G R|G L|F R|F L|TH R|SH R|S P|S T|S K|S M|S N|S L|S W|S P R|S T R|S K R|S P L|S K W|K W|T W|D W|G W|TH W|P Y|B Y|K Y|F Y|M Y|HH Y|V Y|S K Y""".replace("\n"," ").split("|") if o.strip()}

def _is_v(p): return p[:2] in VOG_T and p[-1].isdigit()

def silabas(phones):
    """Divide fonemas em sílabas usando o princípio do ataque máximo."""
    idx=[i for i,p in enumerate(phones) if _is_v(p)]
    if not idx: return [phones]
    cuts=[]
    for a,b in zip(idx,idx[1:]):
        mid=phones[a+1:b]
        if not mid: cuts.append(b); continue
        best=len(mid)  # tudo no ataque? só se permitido
        for k in range(len(mid)+1):
            onset=tuple(mid[k:])
            if len(onset)<=1 or onset in ONSETS:
                best=k; break
        cuts.append(a+1+best)
    sy=[];s=0
    for c in cuts: sy.append(phones[s:c]); s=c
    sy.append(phones[s:])
    return sy

def _render(syl, tonica):
    out=""
    for p in syl:
        base=re.sub(r"\d","",p)
        if base in VOG_T:
            out+=VOG_T[base] if tonica else VOG_A[base]
        else:
            out+=CONS.get(base,base.lower())
    # ajustes ortográficos para leitura em português
    out=re.sub(r"g(?=[eiéêí])","gu",out)
    out=out.replace("ngk","nk")
    return out

def adaptar(arpabet):
    """Recebe 'AH0 B AE1 N D AH0 N' e devolve (completa, silabada, n_silabas)."""
    phones=arpabet.split()
    sy=silabas(phones)
    tonicas=[any(p.endswith("1") for p in s) for s in sy]
    if len(sy)>1 and not any(tonicas):
        tonicas=[any(p.endswith("2") for p in s) for s in sy]
    partes=[]
    for s,t in zip(sy,tonicas):
        r=_render(s,t)
        partes.append(r)
    # s entre vogais vira ss (leitura correta em PT)
    completa="".join(partes)
    completa=re.sub(r"(?<=[aeiouáéíóúâêô])s(?=[aeiouáéíóúâêô])","ss",completa)
    if len(sy)==1:
        silabada=partes[0].upper()
    else:
        silabada="-".join(p.upper() if t else p for p,t in zip(partes,tonicas))
    return completa, silabada, len(sy)

if __name__=="__main__":
    for w,a in [("abandon","AH0 B AE1 N D AH0 N"),("think","TH IH1 NG K"),("run","R AH1 N"),
                ("understand","AH2 N D ER0 S T AE1 N D"),("happen","HH AE1 P AH0 N"),("give","G IH1 V"),
                ("believe","B IH0 L IY1 V"),("organize","AO1 R G AH0 N AY2 Z"),("the","DH AH0")]:
        print(w, adaptar(a))
