# Rotina automática diária — Teia das Línguas

Executada todo dia por uma tarefa agendada do Claude. Também roda quando o painel cria o comando "Rodar automação agora".

## Recursos
- Repositório: `jahckx999/teia-das-linguas` (GitHub Pages, branch `main`)
- Banco: Supabase, projeto `dhdssxjhgdiwwvymzabe` (tabelas `config`, `comandos`, `correcoes`, `sugestoes`, `perfis`, `progresso`)
- Dados brutos (reconstruir se faltar): `git clone --depth 1` de `cmusphinx/cmudict`, `hermitdave/FrequencyWords` (sparse `content/2018/en`), `globalwordnet/english-wordnet` (sparse `src/yaml`) em `/root/data`

## Passos (nesta ordem)
1. **Ler a configuração** (`select chave, valor from config`). Se `automacao.ativa` for falso e não houver comando `rodar_agora` pendente, só registrar e parar.
2. **Comandos do painel**: `select * from comandos where status='pendente' order by id`. Para cada um: marcar `executando`, cumprir o pedido no repositório, marcar `feito` com um resumo curto em `resultado` (ou `erro` com o motivo). Pedidos que mexem com dinheiro, apagam conteúdo em massa ou mudam a segurança ficam em `erro` com a mensagem "precisa de confirmação do Jackson".
3. **Sugestões dos alunos**: `select * from sugestoes where status='nova'`. Erros procedentes viram linha em `tools/traducoes/` ou em `dados/en/correcoes.json`; marcar `aplicada` ou `ignorada`.
4. **Correções do painel**: copiar a tabela `correcoes` para `dados/en/correcoes.json` (formato `{verbo: {campo: valor}}`) para que entrem nos arquivos estáticos.
5. **Traduzir o próximo lote**: pegar os primeiros `automacao.verbos_por_dia` verbos de `dados/en/status.json → fila_traducao` e escrever um novo arquivo `tools/traducoes/pt_NNNN.tsv` (`verbo<TAB>significado1; significado2`). Phrasal verbs com sentido idiomático, não literal.
6. **Pronúncia faltante**: para até 50 verbos sem `pr`, escrever a transcrição ARPAbet em `tools/arpabet_extra.tsv` e reconstruir.
7. **Lição do dia** (`automacao.licoes_por_dia`): acrescentar em `conteudo/licoes_en.json` um objeto `{id, nivel, titulo, resumo, data, blocos:[{titulo, paragrafos:[...], exemplos:[[en, pt]]}]}`. Alternar os níveis A1→C2; não repetir temas já publicados. **Redenção**: se o dia anterior ficou sem lição, publicar uma extra.
8. **Reconstruir**: `python3 tools/build_base_en.py /root/data dados/en` (só se a base mudou), `python3 tools/build_site_data.py en`, `python3 tools/build_pages.py`.
9. **Publicar**: `git add -A && git commit -m "Atualização automática AAAA-MM-DD" && git push`.
10. **Registrar** em `config.automacao`: `ultima_execucao` (ISO UTC) e `ultimo_relatorio` (1 frase: quantos verbos traduzidos, lições, comandos e sugestões).

## Regras
- Nunca apagar páginas de verbo existentes (preserva SEO).
- Nunca colocar chaves secretas no repositório. A chave publishable em `assets/config.js` é pública por natureza.
- Conteúdo original; nada de copiar textos de outros sites.

## Registro da automação (desde 29/10/2026)

O conector do Supabase pede aprovação manual para comandos que alteram o banco, e nas execuções agendadas ninguém aprova. Por isso o editor noturno **só lê** o banco e grava o resultado de cada execução em `tools/registro.json` (última execução, relatório, comandos cumpridos e sugestões tratadas — só ids, status e resumos curtos, nunca dados de alunos).

O painel (`/painel/`) lê esse arquivo sempre que abre e passa tudo para o banco sozinho, usando a sessão do administrador. O plantão das Teias também consulta o arquivo para não reexecutar comandos já cumpridos.
