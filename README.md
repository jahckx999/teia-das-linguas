# Teia das Línguas

Site gratuito para aprender idiomas com ciência, voz e prática. Começa pelo inglês: 11.592 verbos no infinitivo, em ordem alfabética, com significado em português, pronúncia adaptada, sílabas, áudio, conjugação e níveis CEFR (A1 a C2).

## Estrutura
| Pasta | O que tem |
|---|---|
| `index.html`, `dicionario.html`, `praticar.html`… | Páginas geradas (não editar à mão) |
| `en/verbos/` | Uma página por verbo (SEO) |
| `nivel/` | Trilhas A1–C2 com gramática e exercícios |
| `painel/` | Painel de controle unificado (só administrador) |
| `assets/` | CSS e JavaScript |
| `dados/en/` | Índice, detalhes, planilha CSV e status |
| `conteudo/` | Gramática, fonética e lições |
| `tools/` | Geradores e a rotina automática (`AUTOMACAO.md`) |

## Reconstruir tudo
```
python3 tools/build_base_en.py /root/data dados/en
python3 tools/build_site_data.py en
python3 tools/build_pages.py
```

## Domínio próprio
1. Crie o arquivo `CNAME` com o domínio (ex.: `www.teiadaslinguas.com.br`).
2. No provedor do domínio, aponte um registro CNAME de `www` para `jahckx999.github.io`.
3. Troque a URL em `tools/url_base.txt` e rode `build_pages.py`.

## Fontes de dados abertas
Open English WordNet (CC BY 4.0), CMU Pronouncing Dictionary (BSD), FrequencyWords/OpenSubtitles 2018 (CC BY-SA 4.0).
