# MNance — Cenários de Teste Manuais

Roteiros de QA executáveis no navegador (desktop + mobile). Nenhum destes cenários
depende de teste automatizado — são scripts para você rodar à mão.

**Como ler a marcação de milestone:** cada cenário tem uma etiqueta indicando quando
ele se torna executável. `[M0 · executável hoje]` = dá para rodar agora. Os demais
ficam pendentes até o milestone correspondente entregar a feature. Use este arquivo
como checklist vivo: ao fechar cada milestone, rode os cenários que ele desbloqueou
**e** os cenários de regressão das áreas que ele tocou.

**Convenção de ambiente:** salvo indicação contrária, use `npm run dev` no Chrome
desktop com o DevTools aberto na aba Console. "Sem console errors" é critério
implícito de aprovação em **todos** os cenários.

**Cobertura:** as seções 1 a 11 (cenários 01–70) foram escritas no M0/M1 e cobrem o
roadmap M0–M15 conforme planejado na época. As seções 12 a 16 (cenários 71–112) foram
acrescentadas depois do M5.6 e cobrem o que M5.5/M5.6 efetivamente entregaram —
navegação, primitivos de UI, Nível 1 por dia de pagamento, valor recebido em R$,
objetivos de investimento e despesas essenciais detalhadas. Onde as duas partes se
sobrepõem, vale a mais recente (ver a nota na seção 6).

---

## 1. Autenticação e Sessão

### CENÁRIO 01: Cadastro de novo usuário — happy path `[M0 · executável hoje]`

**Categoria:** Caminho feliz
**Pré-condições:** Nenhum usuário logado. Email ainda não cadastrado no Firebase Auth.
**Passos:**
1. Acessar `/signup`.
2. Preencher email válido e senha com 8+ caracteres.
3. Submeter o formulário.
4. Abrir o Firebase Console → Authentication → Users.

**Resultado esperado:** Usuário criado e autenticado, redirecionado para dentro do app
(`/onboarding` ou `/`). O usuário aparece na lista do Firebase Console com o email
correto. Nenhum erro no console.

---

### CENÁRIO 02: Login com credenciais válidas `[M0 · executável hoje]`

**Categoria:** Caminho feliz
**Pré-condições:** Usuário já cadastrado (Cenário 01). Sessão deslogada.
**Passos:**
1. Acessar `/login`.
2. Preencher email e senha corretos.
3. Submeter.

**Resultado esperado:** Redirecionamento para a área autenticada. A barra de navegação
/ layout autenticado aparece. Recarregar a página mantém o usuário logado.

---

### CENÁRIO 03: Login com senha incorreta `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Usuário cadastrado. Deslogado.
**Passos:**
1. Acessar `/login`.
2. Digitar email correto e senha errada.
3. Submeter.

**Resultado esperado:** Mensagem de erro **em português e legível** (não o código cru
`auth/invalid-credential` nem um stack trace). O formulário permanece preenchido no
campo de email, o campo de senha é limpo ou mantido, e o botão volta ao estado
clicável. O usuário **não** é redirecionado.

---

### CENÁRIO 04: Cadastro com email já existente `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Email já cadastrado.
**Passos:**
1. Acessar `/signup`.
2. Usar o mesmo email de um usuário existente.
3. Submeter.

**Resultado esperado:** Erro tratado ("este email já está em uso"), não um erro genérico.
Nenhum usuário duplicado criado no Firebase. O app não trava em estado de loading.

---

### CENÁRIO 05: Senha abaixo do mínimo do Firebase `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Nenhuma.
**Passos:**
1. Acessar `/signup`.
2. Preencher email válido e senha com 5 caracteres (`12345`).
3. Submeter.

**Resultado esperado:** Idealmente a validação acontece **no client, antes** da chamada
de rede (Firebase exige 6+). Se só o Firebase barrar, a mensagem ainda precisa ser
legível em português. O importante é: não pode passar silenciosamente nem mostrar
`auth/weak-password`.

---

### CENÁRIO 06: Acesso a rota protegida sem sessão `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Deslogado (ou aba anônima).
**Passos:**
1. Colar `http://localhost:5173/portfolio` direto na barra de endereços.
2. Repetir para `/distribution`, `/account`, `/`. (Simulador, Despesas, Parcelas, Agenda, Relatório e
   Configurações não têm rota desde o M5.8 — voltam aqui quando forem construídos.)

**Resultado esperado:** Redirecionamento para `/login` em todas. Nenhum flash de
conteúdo protegido antes do redirect. Nenhuma chamada ao Firestore disparada.

---

### CENÁRIO 07: Deep link perde o destino após login `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Deslogado.
**Passos:**
1. Acessar `/portfolio` direto (é redirecionado para `/login`).
2. Fazer login com credenciais válidas.

**Resultado esperado:** *Comportamento desejável:* voltar para `/portfolio`, a rota
originalmente pedida. **Este cenário provavelmente falha hoje** — o `ProtectedRoute`
atual não guarda a rota de origem, então o login joga o usuário em `/`. Registre como
bug de UX de baixa prioridade se falhar; é o tipo de coisa que só incomoda quando você
compartilha um link do app com você mesmo entre celular e PC.

---

### CENÁRIO 08: Refresh com sessão ativa não pisca a tela de login `[M0 · executável hoje]`

**Categoria:** Persistência
**Pré-condições:** Logado, em qualquer rota protegida.
**Passos:**
1. Pressionar F5.
2. Observar atentamente os primeiros 500ms de renderização (gravar a tela ajuda).
3. Repetir com throttling de rede "Slow 3G" no DevTools.

**Resultado esperado:** Nenhum flash da tela de login nem redirect indevido enquanto o
`onAuthStateChanged` resolve. Uma tela de loading é aceitável; um pulo para `/login` e
volta, **não**. Com Slow 3G o loading pode demorar, mas não pode expulsar o usuário.

---

### CENÁRIO 09: Logout propaga entre abas `[M0 · executável hoje]`

**Categoria:** Interação
**Pré-condições:** Logado. Duas abas do app abertas em rotas protegidas diferentes.
**Passos:**
1. Na aba A, fazer logout.
2. Ir para a aba B (sem recarregar).
3. Tentar navegar para outra rota na aba B.

**Resultado esperado:** A aba B detecta a perda de sessão via `onAuthStateChanged` e
redireciona para `/login`. Não pode continuar exibindo dados financeiros de uma sessão
encerrada — este é um cenário de vazamento de dados, não só de UX.

---

### CENÁRIO 10: Botão "voltar" após logout `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Logado, com dados visíveis no Dashboard.
**Passos:**
1. Navegar por 3 ou 4 rotas protegidas.
2. Fazer logout.
3. Pressionar o botão "voltar" do navegador repetidamente.

**Resultado esperado:** Nenhuma tela com dados financeiros reaparece do cache do
histórico (bfcache). Todas as tentativas caem em `/login`.

---

### CENÁRIO 11: Sessão revogada no servidor `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Logado, com a aba aberta.
**Passos:**
1. No Firebase Console → Authentication → Users, deletar (ou desabilitar) o usuário logado.
2. Voltar à aba do app e forçar uma operação que fale com o Firestore (recarregar dados,
   salvar algo).

**Resultado esperado:** O app detecta a sessão inválida e redireciona para o login com
uma mensagem clara, em vez de exibir erro de permissão cru ou ficar em loading infinito.

---

### CENÁRIO 12: Rota inexistente `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Logado.
**Passos:**
1. Acessar `/rota-que-nao-existe`.
2. Repetir deslogado.

**Resultado esperado:** Logado → redireciona para `/`. Deslogado → cai na cadeia
`/` → `ProtectedRoute` → `/login`, sem loop de redirecionamento infinito. **Atenção:**
verifique especificamente o loop — o `catch-all` apontando para `/` combinado com o
guard é o padrão clássico que gera loop.

---

### CENÁRIO 13: Login sem conexão de rede `[M0 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** Deslogado.
**Passos:**
1. DevTools → Network → marcar "Offline".
2. Tentar fazer login com credenciais corretas.

**Resultado esperado:** Mensagem de erro de rede compreensível ("sem conexão", não
`auth/network-request-failed`). O botão de submit sai do estado de loading e permite
nova tentativa. Ao voltar a rede e tentar de novo, o login funciona.

---

### CENÁRIO 14: Normalização de email `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Usuário cadastrado com `teste@exemplo.com`.
**Passos:**
1. Tentar login com `TESTE@Exemplo.com`.
2. Tentar login com ` teste@exemplo.com ` (espaço antes e depois — simula colar do gerenciador de senhas).

**Resultado esperado:** Ambos funcionam. O Firebase normaliza maiúsculas, mas **não**
faz trim de espaços — o passo 2 é o que costuma quebrar. Se falhar, o fix é `.trim()`
no client.

---

### CENÁRIO 15: Duplo clique no botão de cadastro `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Deslogado, formulário de signup preenchido.
**Passos:**
1. Clicar em "Cadastrar" duas vezes muito rápido (ou apertar Enter repetidamente).

**Resultado esperado:** Apenas uma requisição sai. O botão é desabilitado no primeiro
clique. Nenhum erro de "email já em uso" causado pela própria segunda requisição — este
é o falso positivo mais irritante de debugar depois.

---

## 2. Isolamento Multiusuário e Segurança

### CENÁRIO 16: Dois usuários não veem os dados um do outro `[M2+]`

**Categoria:** Caminho feliz
**Pré-condições:** Dois usuários cadastrados (A e B), ambos com onboarding concluído e
valores de patrimônio **diferentes e reconhecíveis** (ex.: A com R$ 100.000, B com R$ 7).
**Passos:**
1. Logar como A, anotar o que o Dashboard mostra.
2. Fazer logout.
3. Logar como B na mesma aba (sem recarregar entre o logout e o login).
4. Comparar.

**Resultado esperado:** B vê exclusivamente os dados de B. Nenhum resíduo de A em cache
de estado do React, nem um "flash" dos números de A antes dos de B carregarem.

---

### CENÁRIO 17: Firestore rules bloqueiam acesso cruzado `[M2+]`

**Categoria:** Caminho de erro
**Pré-condições:** Usuários A e B existentes. Você tem o `uid` de A (Firebase Console).
Logado como B.
**Passos:**
1. Abrir o Console do DevTools.
2. Tentar ler o documento de A diretamente pelo SDK, algo como:
   `getDoc(doc(db, 'users', '<uid-do-A>'))`.
3. Tentar escrever em `users/<uid-do-A>/assets/qualquer`.

**Resultado esperado:** Ambas as operações falham com `permission-denied`. Este cenário
valida a função `isOwner()` do `firestore.rules` em produção, não só na teoria. Se
alguma passar, é bug crítico — pare tudo.

---

### CENÁRIO 18: Delete de conta está bloqueado por design `[M2+]`

**Categoria:** Edge case
**Pré-condições:** Logado.
**Passos:**
1. Pelo Console do DevTools, tentar `deleteDoc(doc(db, 'users', '<seu-uid>'))`.

**Resultado esperado:** Falha com `permission-denied` (a rule tem `allow delete: if false`).
Este é o comportamento **desejado**, mas o cenário existe para você lembrar que hoje não
há caminho de exclusão de conta — relevante se o app for público (LGPD).

---

## 3. Onboarding (Feature #1)

### CENÁRIO 19: Onboarding completo — happy path `[M2]`

**Categoria:** Caminho feliz
**Pré-condições:** Usuário recém-cadastrado, sem documento em `users/{uid}`.
**Passos:**
1. Percorrer todos os passos do formulário com valores realistas (renda líquida
   R$ 8.000, custo essencial R$ 4.000, meta R$ 1.000.000 em 15 anos, perfil moderado,
   patrimônio atual R$ 50.000, pagamento dia 5 e dia 20).
2. Concluir.
3. Conferir no Firebase Console a coleção `users/{uid}` e a subcoleção `distribution/current`.

**Resultado esperado:** Documento criado com **todos** os campos do tipo `User`
preenchidos e com os nomes em camelCase (`goalAmount`, `monthlyIncomeNet`, ...).
Reserva de emergência mínima e segura calculadas automaticamente (não digitadas pelo
usuário). Distribuição default gravada. Redireciona para o Dashboard.

---

### CENÁRIO 20: Refresh no meio do onboarding `[M2]`

**Categoria:** Persistência
**Pré-condições:** Usuário novo, no passo 3 de 5 do formulário, com dados preenchidos.
**Passos:**
1. Pressionar F5.

**Resultado esperado:** Defina explicitamente qual é o comportamento correto e verifique
se é o que acontece. Duas opções aceitáveis: (a) volta ao passo 1 com formulário limpo,
ou (b) retoma de onde parou. O que **não** é aceitável: retomar em um passo intermediário
com metade dos dados perdidos, permitindo concluir e gravar um documento incompleto no
Firestore.

---

### CENÁRIO 21: Onboarding abandonado `[M2]`

**Categoria:** Edge case
**Pré-condições:** Usuário cadastrado no Auth mas **sem** documento em `users/{uid}`
(fecha a aba no meio do onboarding).
**Passos:**
1. Fazer login novamente.
2. Tentar acessar `/` (Dashboard) direto pela URL.
3. Tentar acessar `/portfolio` direto.

**Resultado esperado:** O app detecta a ausência do documento e força o retorno a
`/onboarding`. Nenhuma tela mostra `undefined`, `NaN` ou "R$ NaN" por tentar ler campos
de um documento inexistente. Este é o buraco mais comum entre "tem Auth" e "tem perfil".

---

### CENÁRIO 22: Usuário já onboarded reacessa /onboarding `[M2]`

**Categoria:** Edge case
**Pré-condições:** Onboarding concluído.
**Passos:**
1. Acessar `/onboarding` pela URL.
2. Se o formulário abrir, preencher com valores **diferentes** e concluir.

**Resultado esperado:** Ou redireciona para `/` (bloqueando a rota), ou abre em modo
edição pré-preenchido com os valores atuais. O que não pode: abrir vazio e **sobrescrever**
o perfil com um documento novo, apagando `createdAt` e a configuração existente.

---

### CENÁRIO 23: Valores inválidos no onboarding `[M2]`

**Categoria:** Caminho de erro
**Pré-condições:** No formulário de onboarding.
**Passos:**
1. Renda líquida: `-5000`. Tentar avançar.
2. Renda líquida: `0`. Tentar avançar.
3. Meta em anos: `0`. Tentar avançar.
4. Meta em anos: `0.5`. Tentar avançar.
5. Patrimônio atual: deixar em branco.
6. Digitar letras em um campo numérico (`abc`).

**Resultado esperado:** Cada caso bloqueado com mensagem específica no campo, não um
alerta genérico no topo. `0` em anos precisa ser barrado explicitamente — é divisor em
`goalTimeline` e passa direto por uma validação ingênua de "campo obrigatório".

---

### CENÁRIO 24: Custo essencial maior que a renda `[M2]`

**Categoria:** Edge case
**Pré-condições:** No onboarding.
**Passos:**
1. Renda líquida: `3000`.
2. Custo essencial mensal: `4500`.
3. Avançar e concluir.

**Resultado esperado:** O app **não** pode travar nem gravar um aporte negativo silencioso.
Comportamento correto: permitir concluir (a situação é real e é justamente o público-alvo
do app), mas o Dashboard deve mostrar um alerta honesto — "seu custo essencial excede sua
renda" — em vez de projetar patrimônio negativo ou exibir "0 anos até a meta".

---

### CENÁRIO 25: Dias de pagamento nas bordas do calendário `[M2, valida também M12]`

**Categoria:** Edge case
**Pré-condições:** No onboarding.
**Passos:**
1. Definir `payday1` = 31 e `payday2` = 15. Concluir.
2. Ir para a Agenda Financeira (quando M12 existir) e navegar até **fevereiro**.
3. Repetir o teste com `payday1` = 31 em um mês de 30 dias (abril).
4. Testar `payday1` = 5 e `payday2` = 5 (dias iguais).
5. Testar `payday1` = 0 e `payday1` = 32.

**Resultado esperado:** Dia 31 em fevereiro precisa cair no último dia útil/corrido do mês
(28 ou 29), não gerar "31 de fevereiro" nem pular o mês. Dias iguais devem ser barrados ou
tratados como pagamento único. Valores fora de 1–31 bloqueados na validação.

---

## 4. Portfólio de Ativos (Feature #5)

### CENÁRIO 26: CRUD completo de ativo `[M3]`

**Categoria:** Caminho feliz
**Pré-condições:** Onboarding concluído, portfólio vazio.
**Passos:**
1. Criar ativo: nome "Tesouro IPCA+", classe `bonds`, valor R$ 25.000, retorno esperado 6%.
2. Conferir no Firebase Console a subcoleção `users/{uid}/assets`.
3. Editar o valor para R$ 30.000.
4. Arquivar o ativo.
5. Recarregar a página em cada etapa.

**Resultado esperado:** Cada operação reflete na tela imediatamente **e** persiste no
Firestore com os nomes de campo corretos. O ativo arquivado sai da listagem ativa mas o
documento continua existindo com `status: 'archived'` (soft delete, não `deleteDoc`).

---

### CENÁRIO 27: Portfólio vazio `[M3, valida também M4]`

**Categoria:** Edge case
**Pré-condições:** Onboarding concluído, **zero** ativos cadastrados.
**Passos:**
1. Abrir `/portfolio`.
2. Abrir `/` (Dashboard).
3. Abrir `/distribution`.

**Resultado esperado:** Empty state útil em cada tela (com um CTA para cadastrar o
primeiro ativo), nunca `NaN%`, `Infinity`, `R$ NaN`, gráfico quebrado ou tela em branco.
O retorno ponderado com zero ativos é a divisão por zero mais provável do app inteiro.

---

### CENÁRIO 28: Formato numérico brasileiro `[M3]`

**Categoria:** Edge case
**Pré-condições:** Formulário de ativo aberto.
**Passos:**
1. Digitar o valor como `1.234,56` (formato pt-BR).
2. Digitar como `1234.56`.
3. Digitar como `1234,56`.
4. Colar `R$ 1.234,56` direto do clipboard.
5. Salvar cada caso e conferir o número gravado no Firestore.

**Resultado esperado:** Todos convergem para o número `1234.56` no Firestore, ou os
formatos não suportados são rejeitados com mensagem clara. **O que não pode acontecer:**
`1.234,56` virar `1.234` (mil vezes menor) e o usuário só descobrir meses depois olhando
uma projeção estranha. Este é o bug financeiro silencioso mais caro da categoria.

---

### CENÁRIO 29: Valores extremos em ativos `[M3]`

**Categoria:** Edge case
**Pré-condições:** Formulário de ativo aberto.
**Passos:**
1. Valor `0,01`.
2. Valor `999999999999` (quase um trilhão).
3. Valor `0`.
4. Valor negativo `-1000`.
5. Retorno esperado `0%`, depois `-5%` (renda fixa perdendo para a inflação), depois `999%`.

**Resultado esperado:** Zero e negativo em valor devem ser barrados (ou aceitos com
intenção explícita, se você decidir que dívida é um "ativo negativo" — decida e documente).
Valores gigantes não podem estourar o layout nem virar notação científica na tela.
Retorno negativo deve ser **permitido** — é realista e a projeção precisa lidar com ele.

---

### CENÁRIO 30: Injeção de conteúdo no nome do ativo `[M3]`

**Categoria:** Edge case
**Pré-condições:** Formulário de ativo aberto.
**Passos:**
1. Nome: `<script>alert('xss')</script>`. Salvar e visualizar a listagem.
2. Nome: `<img src=x onerror=alert(1)>`.
3. Nome: uma string de 500 caracteres.
4. Nome: `📈💰 Ação` (emojis) e `Ação Ç ã õ` (acentos).
5. Nome: apenas espaços em branco.

**Resultado esperado:** O React escapa HTML por padrão, então 1 e 2 devem aparecer como
texto literal — confirme que nenhum `dangerouslySetInnerHTML` foi usado. Nome longo deve
ser truncado no layout com reticências, não quebrar o card. Emojis e acentos salvam e
recuperam corretos (validação de encoding UTF-8 ponta a ponta). Só-espaços deve ser
rejeitado como campo vazio.

---

## 5. Radar / Dashboard (Feature #2)

### CENÁRIO 31: Radar com dados completos `[M4]`

**Categoria:** Caminho feliz
**Pré-condições:** Onboarding concluído + pelo menos 3 ativos de classes diferentes.
**Passos:**
1. Abrir `/`.
2. Anotar: patrimônio atual, velocidade de crescimento, anos até a meta e o insight
   de "+20% de aporte".
3. Refazer o cálculo de anos até a meta **à mão** (ou em planilha) com juros compostos.

**Resultado esperado:** Os números batem com o cálculo manual dentro de **±2%** — esta é
a métrica de sucesso declarada no PRD. Divergência maior que isso é bug em `core/`, não
arredondamento.

---

### CENÁRIO 32: Meta já atingida `[M4]`

**Categoria:** Edge case
**Pré-condições:** Editar o perfil para `goalAmount` = R$ 10.000 e cadastrar ativos
somando R$ 50.000.
**Passos:**
1. Abrir o Dashboard.

**Resultado esperado:** Mensagem de meta atingida/superada. **Nunca** "-3 anos até a meta",
"0 anos" ambíguo ou uma barra de progresso em 500% estourando o container. Vale conferir
o gráfico também.

---

### CENÁRIO 33: Aporte mensal zero ou negativo `[M4]`

**Categoria:** Edge case
**Pré-condições:** Perfil com renda R$ 4.000 e custo essencial R$ 4.000 (sobra exatamente zero).
**Passos:**
1. Abrir o Dashboard.
2. Repetir com custo essencial R$ 4.500 (sobra negativa).

**Resultado esperado:** Com aporte zero e patrimônio abaixo da meta, o tempo até a meta é
matematicamente infinito **se** o retorno também for zero — o app precisa dizer isso em
português ("com o aporte atual você não atinge a meta") em vez de mostrar `Infinity`,
`NaN` ou um número absurdo como 9.999 anos. Com aporte negativo, a mensagem deve ser ainda
mais direta.

---

### CENÁRIO 34: Insight de "+20% de aporte" com aporte zero `[M4]`

**Categoria:** Edge case
**Pré-condições:** Cenário 33 configurado (aporte zero).
**Passos:**
1. Ler o card de insight no Dashboard.

**Resultado esperado:** 20% de zero é zero — o insight não pode dizer "aportando R$ 0 a
mais você antecipa 0 anos". Deve ser suprimido ou substituído por uma recomendação
relevante (ex.: "reduza despesas para gerar aporte").

---

### CENÁRIO 35: Patrimônio inicial zero `[M4]`

**Categoria:** Edge case
**Pré-condições:** Perfil com patrimônio R$ 0, nenhum ativo, mas com aporte mensal positivo.
**Passos:**
1. Abrir o Dashboard.
2. Conferir o gráfico de projeção.

**Resultado esperado:** Projeção parte de zero e cresce normalmente. O gráfico renderiza
com eixo Y começando em 0. Nenhuma divisão por patrimônio atual (cálculo de percentual de
crescimento) gera `Infinity`.

---

## 6. Distribuição de Renda (Feature #13) e Alocação (Feature #7)

> **Atualizado em M5.5/M5.6:** os cenários 36–41 foram escritos contra a tela do M5 (um
> único split de 4 categorias + um único modelo de alocação global). Essa tela não existe
> mais: o Nível 1 virou um split de **5 categorias por dia de pagamento** e o Nível 2 virou
> uma **lista de objetivos**, cada um com seu próprio modelo. As regras de negócio que 36–41
> testam (soma = 100%, tolerância de ponto flutuante, não perder a customização, percentuais
> dos modelos, reserva somente leitura) continuam valendo — mas os roteiros atualizados estão
> nas **seções 12 a 16**. Rode 36–41 apenas como referência histórica da regra; rode as
> seções 13–15 para validar a tela real.

### CENÁRIO 36: Distribuição soma exatamente 100% `[M5]`

**Categoria:** Caminho feliz
**Pré-condições:** Onboarding concluído.
**Passos:**
1. Abrir `/distribution`.
2. Ajustar as categorias até somar 100%.
3. Salvar. Recarregar a página.

**Resultado esperado:** Salva em `users/{uid}/distribution/current` e recarrega idêntico.

---

### CENÁRIO 37: Distribuição com soma diferente de 100% `[M5]`

**Categoria:** Caminho de erro
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Ajustar para somar 95%. Tentar salvar.
2. Ajustar para somar 105%. Tentar salvar.

**Resultado esperado:** Salvamento bloqueado, com o total exibido em destaque e a diferença
explícita ("faltam 5%"). Não pode salvar e "corrigir depois".

---

### CENÁRIO 38: Soma de 99,99% por arredondamento `[M5]`

**Categoria:** Edge case
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Dividir em três categorias iguais: 33,33% + 33,33% + 33,34%.
2. Tentar salvar.
3. Tentar 33,33 × 3 = 99,99%.

**Resultado esperado:** A validação precisa de tolerância de ponto flutuante. Uma
comparação `soma === 100` falha por causa de `0.1 + 0.2 !== 0.3` em JavaScript — o teste
correto é `Math.abs(soma - 100) < 0.01`. Se o passo 1 for rejeitado, é exatamente este bug.

---

### CENÁRIO 39: Trocar de modelo de alocação sobrescreve customização `[M5, M11]`

**Categoria:** Interação
**Pré-condições:** Distribuição personalizada manualmente e salva (valores diferentes de
qualquer modelo pronto).
**Passos:**
1. Abrir o seletor de modelos e escolher "All Weather (Ray Dalio)".
2. Observar o que acontece com os valores customizados.
3. Voltar ao modelo anterior / desfazer.

**Resultado esperado:** O app avisa antes de descartar a customização, ou oferece desfazer.
Perder uma configuração trabalhada sem aviso, em um clique, é o tipo de coisa que faz o
usuário desconfiar do app inteiro.

---

### CENÁRIO 40: Percentuais dos três modelos batem com `allocationModels.ts` `[M5, M11]`

**Categoria:** Caminho feliz
**Pré-condições:** Nenhuma.
**Passos:**
1. Selecionar "All Weather (Ray Dalio)" e anotar os quatro percentuais exibidos.
2. Repetir para "Conservador" e "Agressivo".
3. Comparar com `src/core/allocationModels.ts`.

**Resultado esperado:** All Weather = 30/40/20/10, Conservador = 50/30/15/5, Agressivo =
70/20/10/0. Este cenário existe porque o PRD original tinha *drift* entre as seções — os
números do "Conservador" estavam rotulados como "All Weather". Se a tela mostrar 50/30/15/5
sob o rótulo All Weather, o drift voltou.

---

### CENÁRIO 41: Reserva de emergência é somente leitura `[M5]`

**Categoria:** Caminho de erro
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Tentar editar o campo de reserva de emergência diretamente (clicar, digitar).
2. Inspecionar o elemento e remover o atributo `disabled` / `readonly` pelo DevTools.
3. Digitar um valor e tentar salvar.

**Resultado esperado:** O passo 1 é bloqueado na UI. O passo 3 (burlando o DevTools) não
pode gravar um valor arbitrário no Firestore — a reserva é **derivada** do custo essencial,
então o valor precisa ser recalculado no momento de salvar, não confiado a partir do input.

---

## 7. Simulador de Cenários (Feature #3)

### CENÁRIO 42: Salvar e recuperar um cenário `[M6]`

**Categoria:** Caminho feliz
**Pré-condições:** Dashboard funcional com dados reais.
**Passos:**
1. Abrir `/simulator`.
2. Ajustar os sliders (aporte, retorno, prazo) para valores distintos do atual.
3. Salvar como "Cenário agressivo".
4. Recarregar a página e reabrir o cenário salvo.

**Resultado esperado:** Todos os parâmetros voltam exatamente como salvos, e a projeção
recalculada bate com a exibida antes de salvar.

---

### CENÁRIO 43: Limite de 5 cenários salvos `[M6]`

**Categoria:** Caminho de erro
**Pré-condições:** 5 cenários já salvos.
**Passos:**
1. Criar e tentar salvar um 6º cenário.
2. Deletar um cenário e tentar salvar de novo.

**Resultado esperado:** O 6º é bloqueado com mensagem clara sobre o limite e um caminho de
saída ("exclua um cenário para salvar outro"). Após deletar, o salvamento libera. O
contador precisa contar corretamente — cuidado com cenários deletados ainda ocupando vaga.

---

### CENÁRIO 44: Comparação de cenários com seleção inválida `[M6]`

**Categoria:** Caminho de erro
**Pré-condições:** 3 cenários salvos.
**Passos:**
1. Selecionar 1 cenário e clicar em "Comparar".
2. Selecionar 3 cenários e clicar em "Comparar".
3. Selecionar 0 e clicar em "Comparar".

**Resultado esperado:** A comparação exige exatamente 2. O botão fica desabilitado fora
dessa condição, com a regra visível ("selecione 2 cenários"), em vez de mostrar erro só
depois do clique.

---

### CENÁRIO 45: Sliders nos valores extremos `[M6]`

**Categoria:** Edge case
**Pré-condições:** Em `/simulator`.
**Passos:**
1. Arrastar cada slider até o mínimo absoluto e observar a projeção.
2. Arrastar até o máximo absoluto.
3. Aporte no mínimo (0) + retorno no mínimo (0) simultaneamente.
4. Prazo no máximo (ex.: 50 anos) + retorno no máximo.

**Resultado esperado:** Nenhuma combinação gera `NaN`, `Infinity`, gráfico vazio ou
travamento da UI. O passo 3 é o caso "nada acontece nunca" e o passo 4 é o caso de
estouro numérico — juros compostos com taxa alta em 50 anos produz números enormes que
precisam formatar corretamente (R$ 1,2 bi, não `1.2e9`).

---

### CENÁRIO 46: Cenário salvo fica obsoleto `[M6]`

**Categoria:** Interação
**Pré-condições:** Um cenário salvo há algum tempo, baseado em patrimônio de R$ 50.000.
**Passos:**
1. Ir ao Portfólio e mudar o patrimônio real para R$ 120.000.
2. Voltar ao Simulador e abrir o cenário salvo.

**Resultado esperado:** Decida e verifique: ou o cenário recalcula sobre o patrimônio
**atual** (e avisa que os números mudaram), ou ele é um snapshot congelado e mostra a data
de criação. O que não pode: exibir uma projeção que mistura patrimônio antigo com aporte
novo sem sinalizar nada.

---

## 8. Parcelas, Despesas Zumbi, Cortes e Priorização (Features #6, #9, #10, #11)

### CENÁRIO 47: Fronteira exata dos 60 dias de inatividade `[M7]`

**Categoria:** Edge case
**Pré-condições:** Três parcelas cadastradas. Editar `lastActivityDate` de cada uma
diretamente no Firebase Console para exatamente 59, 60 e 61 dias atrás.
**Passos:**
1. Abrir a aba de Despesas Zumbi.
2. Verificar quais das três aparecem.
3. Alterar o fuso horário do sistema operacional (ex.: para UTC+14) e recarregar.

**Resultado esperado:** O critério precisa ser inequívoco: ou `>= 60` (60 e 61 aparecem)
ou `> 60` (só 61 aparece). Documente qual é. O passo 3 é o teste crítico: a classificação
não pode mudar por causa de fuso horário — se o item de 60 dias entra e sai da lista
conforme o timezone, o cálculo está usando horário local em vez de diferença absoluta de dias.

---

### CENÁRIO 48: Zumbi dispensado não reaparece `[M7]`

**Categoria:** Persistência
**Pré-condições:** Pelo menos uma despesa classificada como zumbi.
**Passos:**
1. Dispensar a despesa ("não é zumbi" / "manter").
2. Recarregar a página.
3. Fazer logout e login novamente.
4. Abrir em outro navegador com o mesmo usuário.

**Resultado esperado:** A despesa não reaparece em nenhum dos casos — o campo
`dismissedAsZombie` está no Firestore, não em `localStorage`. Se reaparecer no passo 4,
a dispensa foi salva só no dispositivo.

---

### CENÁRIO 49: Parcela quitada `[M6.5, M7]`

**Categoria:** Edge case
**Pré-condições:** Parcela com `paidInstallments` = `totalInstallments` (ex.: 12 de 12).
**Passos:**
1. Ver a listagem de parcelas.
2. Ver o Dashboard e o comprometimento mensal futuro.
3. Ver a aba de Despesas Zumbi.
4. Testar também `paidInstallments` > `totalInstallments` (13 de 12 — dado corrompido).

**Resultado esperado:** A parcela quitada não conta no comprometimento futuro nem aparece
como zumbi (não faz sentido "cortar" o que já acabou). O caso 13 de 12 não pode gerar
valor negativo a pagar — deve ser tratado com `Math.max(0, ...)` ou barrado na entrada.

---

### CENÁRIO 50: Simulação de corte confirmada `[M8]`

**Categoria:** Interação
**Pré-condições:** Dashboard com "anos até a meta" anotado. Pelo menos 3 despesas cortáveis.
**Passos:**
1. Abrir o Simulador de Cortes.
2. Marcar duas despesas para corte e observar o "antes e depois".
3. Confirmar o corte.
4. Voltar ao Dashboard.
5. Recarregar a página.

**Resultado esperado:** O "depois" da simulação bate **exatamente** com o novo número do
Dashboard. O estado persiste após reload. Este é o cenário que valida a promessa central
do produto — se o número do simulador não bater com o do radar, a confiança no app acaba.

---

### CENÁRIO 51: Simulação de corte cancelada `[M8]`

**Categoria:** Caminho de erro
**Pré-condições:** Mesmas do Cenário 50, com os números anotados.
**Passos:**
1. Marcar despesas para corte.
2. **Cancelar** / sair da tela sem confirmar (inclusive pelo botão "voltar" do navegador).
3. Voltar ao Dashboard e ao Portfólio.
4. Conferir o Firestore no console.

**Resultado esperado:** Absolutamente nada mudou — nem na tela, nem no banco. Simulação é
efêmera até a confirmação explícita.

---

### CENÁRIO 52: Cortar todas as despesas `[M8]`

**Categoria:** Edge case
**Pré-condições:** Várias despesas cadastradas.
**Passos:**
1. Marcar 100% das despesas para corte.
2. Observar a projeção resultante.
3. Repetir marcando **zero** despesas e clicando em confirmar.

**Resultado esperado:** Cortar tudo produz um aporte igual à renda menos o custo essencial
— não a renda inteira (o custo essencial não é cortável). Confirmar zero cortes não deve
gravar nada nem mostrar "sua meta antecipou 0 anos" como se fosse uma conquista.

---

### CENÁRIO 53: Override manual de priorização vence a classificação automática `[M9]`

**Categoria:** Persistência
**Pré-condições:** Uma despesa classificada automaticamente como "supérflua".
**Passos:**
1. Alterar manualmente a classificação para "essencial".
2. Recarregar a página.
3. Editar o valor da despesa (o que dispara a reclassificação automática).
4. Recarregar de novo.

**Resultado esperado:** O override sobrevive ao reload **e** à edição da despesa. Se a
reclassificação automática apagar a decisão manual do usuário no passo 3, o app está
sobrescrevendo a intenção humana — bug de confiança, não só de dados.

---

## 9. Dark Mode e Tema (Feature #14)

### CENÁRIO 54: Dark mode persiste entre sessões e dispositivos `[M15]`

**Categoria:** Persistência
**Pré-condições:** Logado, tema claro ativo.
**Passos:**
1. Ativar o dark mode.
2. Recarregar a página.
3. Fazer logout e login novamente.
4. Abrir o app em outro navegador (ou aba anônima) com o mesmo usuário.
5. Conferir `users/{uid}.darkMode` no Firebase Console.

**Resultado esperado:** O tema acompanha o usuário em todos os passos, porque está no
Firestore (campo `darkMode`), não só em `localStorage`. O passo 4 é o que distingue os dois.

---

### CENÁRIO 55: Flash de tema claro no carregamento (FOUC) `[M15]`

**Categoria:** Interação
**Pré-condições:** Dark mode ativo e salvo.
**Passos:**
1. Recarregar a página com throttling "Slow 3G" no DevTools.
2. Observar os primeiros instantes (gravar a tela ajuda a confirmar).
3. Repetir com o cache desabilitado.

**Resultado esperado:** Nenhum flash branco antes do tema escuro aplicar. Como o tema vem
do Firestore, existe uma janela entre o carregamento do app e a leitura do documento —
mitigue com um espelho em `localStorage` aplicado sinronamente no boot, usando o Firestore
como fonte de verdade que corrige depois. É a interação clássica "tema + persistência
assíncrona".

---

### CENÁRIO 56: Preferência do sistema operacional vs. preferência salva `[M15]`

**Categoria:** Interação
**Pré-condições:** SO configurado em tema escuro. Usuário com `darkMode: false` salvo.
**Passos:**
1. Abrir o app.
2. Alternar o tema do SO enquanto o app está aberto.
3. Testar também um usuário **novo**, sem preferência salva, com o SO em escuro.

**Resultado esperado:** A escolha explícita do usuário ganha do `prefers-color-scheme`.
O usuário novo herda a preferência do SO como default. Mudar o tema do SO com o app aberto
não deve sobrescrever a escolha explícita.

---

### CENÁRIO 57: Contraste e legibilidade no dark mode `[M15]`

**Categoria:** Interação
**Pré-condições:** Dark mode ativo.
**Passos:**
1. Percorrer **todas** as telas do app.
2. Prestar atenção especial em: gráficos do Chart.js, campos de formulário desabilitados,
   mensagens de erro em vermelho, ícones do lucide-react e a tela de loading.

**Resultado esperado:** Nada ilegível. Gráficos são o ponto fraco típico — o Chart.js não
herda o tema automaticamente, então eixos e labels podem ficar pretos sobre fundo escuro.
Estados desabilitados e mensagens de erro são o segundo ponto fraco.

---

## 10. PWA, Offline e Persistência

### CENÁRIO 58: Instalação do PWA no celular `[M0 · executável hoje via hosting]`

**Categoria:** Caminho feliz
**Pré-condições:** `npm run build` + `firebase hosting:channel:deploy teste-pwa`.
Celular com a URL HTTPS gerada.
**Passos:**
1. Abrir a URL no Chrome Android (ou Safari iOS).
2. Usar "Adicionar à tela inicial".
3. Abrir pelo ícone criado.

**Resultado esperado:** Ícone correto na home screen, app abre em modo standalone (sem
barra de endereços), splash screen com as cores do manifest. Não pode abrir como uma aba
comum de navegador.

---

### CENÁRIO 59: Abrir o app instalado sem conexão `[M0 · executável hoje via hosting]`

**Categoria:** Persistência
**Pré-condições:** PWA instalado e aberto pelo menos uma vez com rede.
**Passos:**
1. Ativar o modo avião no celular.
2. Abrir o app pelo ícone.

**Resultado esperado:** O shell do app carrega do service worker (não a tela de dinossauro
do Chrome). Se os dados não puderem ser lidos, uma mensagem clara de "sem conexão" aparece
— nunca uma tela em branco ou um loading eterno.

---

### CENÁRIO 60: Escrita offline sincroniza ao voltar a rede `[M3+]`

**Categoria:** Persistência
**Pré-condições:** Logado, com o app aberto e dados carregados.
**Passos:**
1. DevTools → Network → "Offline".
2. Cadastrar um ativo novo.
3. Observar se a UI confirma o salvamento.
4. Voltar para "Online".
5. Aguardar e conferir o Firebase Console.

**Resultado esperado:** Ou o Firestore enfileira a escrita e sincroniza sozinho ao voltar
(comportamento padrão do SDK com persistência offline habilitada), ou o app avisa
honestamente que não conseguiu salvar. O pior caso é a UI dizer "salvo com sucesso" e o
dado nunca chegar ao servidor — verifique explicitamente que isso **não** acontece.

---

### CENÁRIO 61: Duas abas editando o mesmo dado `[M3+]`

**Categoria:** Interação
**Pré-condições:** Mesmo usuário, duas abas, ambas com o Portfólio aberto e o mesmo ativo visível.
**Passos:**
1. Na aba A, mudar o valor do ativo para R$ 10.000 e salvar.
2. Sem recarregar a aba B, mudar o mesmo ativo lá para R$ 20.000 e salvar.
3. Recarregar as duas abas.

**Resultado esperado:** Se houver listener em tempo real (`onSnapshot`), a aba B já deve
mostrar R$ 10.000 antes do passo 2. Sem listener, o último a salvar vence — aceitável para
uso pessoal, mas confirme que o resultado final é **consistente** entre as duas abas após o
reload, sem uma delas exibindo um valor fantasma indefinidamente.

---

### CENÁRIO 62: Service worker com versão antiga após deploy `[M0 · executável hoje via hosting]`

**Categoria:** Persistência
**Pré-condições:** PWA aberto no celular, rodando uma versão anterior.
**Passos:**
1. Fazer um `npm run build` com uma mudança visível (ex.: texto de um botão) e deployar.
2. No celular, abrir o app já instalado, **sem** limpar o cache.
3. Fechar e reabrir o app.
4. Repetir uma terceira vez.

**Resultado esperado:** A nova versão aparece em no máximo duas aberturas (o padrão do
Workbox instala em background e ativa na próxima). Se depois de três aberturas ainda
mostrar o texto antigo, o cache está preso — o `vite-plugin-pwa` precisa de
`skipWaiting`/`clientsClaim` ou de um prompt de atualização visível.

---

### CENÁRIO 63: Armazenamento local bloqueado ou cheio `[M0 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Nenhuma.
**Passos:**
1. Abrir o app em uma janela anônima e fazer login.
2. Em Chrome → Configurações → Privacidade, bloquear cookies e dados de sites; recarregar.
3. Nas DevTools (Application → Storage), simular quota estourada, ou encher o
   `localStorage` com um loop `localStorage.setItem('lixo'+i, 'x'.repeat(100000))` até dar erro.
4. Recarregar o app e navegar.

**Resultado esperado:** O app degrada com elegância. A persistência offline do Firestore
(IndexedDB) pode falhar em modo anônimo — isso não pode derrubar a aplicação inteira com
um erro não tratado. O tema e a sessão podem se perder; a tela **não** pode ficar em branco.

---

### CENÁRIO 64: Limpar todos os dados do site `[M0 · executável hoje]`

**Categoria:** Persistência
**Pré-condições:** Logado, com dados carregados.
**Passos:**
1. DevTools → Application → Storage → "Clear site data".
2. Recarregar a página.
3. Fazer login novamente.

**Resultado esperado:** Volta para `/login` limpo, sem erro no console. Após o login, todos
os dados financeiros voltam do Firestore intactos — nada crítico vivia só no navegador.
Este cenário é a prova final de que a fonte de verdade é o servidor.

---

## 11. Interface, Responsividade e Robustez Geral

### CENÁRIO 65: Responsividade nas larguras-alvo `[M2+]`

**Categoria:** Interação
**Pré-condições:** App com dados populados.
**Passos:**
1. DevTools → modo dispositivo → 375px (iPhone SE) e percorrer todas as telas.
2. Repetir em 1280px.
3. Repetir em 320px (o menor caso realista).
4. Girar para landscape no modo dispositivo.

**Resultado esperado:** Nenhum scroll horizontal em nenhuma largura. Tabelas e gráficos
com muitas colunas devem rolar **dentro do próprio container**, não empurrar a página.
Botões continuam alcançáveis com o polegar em 375px. Nenhum texto sobreposto.

---

### CENÁRIO 66: Submissão duplicada de formulário `[M2+]`

**Categoria:** Edge case
**Pré-condições:** Qualquer formulário de criação (ativo, parcela, cenário).
**Passos:**
1. Preencher e clicar em "Salvar" três vezes em sequência rápida.
2. Conferir a listagem e o Firebase Console.
3. Repetir com throttling "Slow 3G", onde a janela para clicar de novo é bem maior.

**Resultado esperado:** Exatamente **um** documento criado. O botão desabilita no primeiro
clique e mostra estado de carregamento. O passo 3 é o que realmente expõe o bug —
em rede rápida a janela é curta demais para reproduzir.

---

### CENÁRIO 67: Navegação por teclado e Enter nos formulários `[M2+]`

**Categoria:** Interação
**Pré-condições:** Qualquer formulário aberto.
**Passos:**
1. Navegar entre os campos apenas com Tab, na ordem visual.
2. Pressionar Enter com o foco em um campo de texto.
3. Pressionar Esc com um modal aberto.

**Resultado esperado:** A ordem do Tab segue a ordem visual, com foco sempre visível.
Enter submete o formulário (ou não faz nada), mas **nunca** dispara uma ação destrutiva
como excluir. Esc fecha o modal sem salvar.

---

### CENÁRIO 68: Zoom de navegador em 200% `[M2+]`

**Categoria:** Edge case
**Pré-condições:** App com dados.
**Passos:**
1. Ctrl + "+" até 200%.
2. Percorrer as telas principais.

**Resultado esperado:** O layout continua utilizável e nada fica cortado ou inacessível.
Vale principalmente para modais e formulários, que podem estourar a altura da viewport e
deixar o botão de confirmar fora de alcance sem scroll.

---

### CENÁRIO 69: Virada de mês e fuso horário `[M12, valida também M7]`

**Categoria:** Edge case
**Pré-condições:** Agenda Financeira com eventos calculados.
**Passos:**
1. Mudar o relógio do sistema para 31/12 às 23:58.
2. Abrir a Agenda e aguardar a virada para 01/01.
3. Mudar o fuso do SO para UTC-11 e depois UTC+13, recarregando entre cada um.
4. Testar um ano bissexto (29/02).

**Resultado esperado:** Nenhum evento duplicado, some ou salta de mês na virada. Datas
gravadas como `Timestamp` são exibidas no dia correto independentemente do fuso — o clássico
"o evento do dia 1º aparece como dia 31 do mês anterior" indica que uma data está sendo
serializada em UTC e lida em local, ou vice-versa.

---

### CENÁRIO 70: Jornada completa ponta a ponta `[M9]`

**Categoria:** Caminho feliz
**Pré-condições:** Usuário totalmente novo, nada cadastrado.
**Passos:**
1. Cadastrar → onboarding completo.
2. Cadastrar 4 ativos de classes diferentes.
3. Ver o Dashboard e anotar "anos até a meta".
4. Cadastrar 5 parcelas, sendo 2 com `lastActivityDate` antiga.
5. Ir a Despesas Zumbi → identificar as 2 → simular corte → confirmar.
6. Ir à Priorização e reclassificar uma despesa manualmente.
7. Voltar ao Dashboard.
8. Fazer logout, login e refazer todo o percurso conferindo os dados.

**Resultado esperado:** O número de "anos até a meta" do passo 7 é menor que o do passo 3,
e a diferença corresponde ao que o simulador de cortes prometeu. Todos os dados sobrevivem
ao ciclo de logout/login. Zero erros no console durante a jornada inteira. **Este é o
cenário de aceitação do MVP** — se ele passa ponta a ponta, o produto entrega a promessa
central: "se eu mantiver isso, quantos anos até ficar rico?".

---

## 12. Navegação e Fundação de UI (M5.5)

### CENÁRIO 71: Barra de navegação inferior no mobile `[M5.5 · executável hoje]`

**Categoria:** Caminho feliz
**Pré-condições:** Onboarding concluído. DevTools em 375px de largura.
**Passos:**
1. Abrir o app logado. Conferir a barra fixa no rodapé.
2. Tocar em cada uma das 4 posições: Radar, Distribuição, Portfólio, Conta.
3. Em `/account`, conferir nome, e-mail, o botão "Editar onboarding" e o botão "Sair".
4. Digitar na URL `/more`, `/simulator`, `/expenses`, `/installments`, `/calendar`, `/report`, `/settings`.

**Resultado esperado:** A barra inferior tem exatamente 4 posições (`PRIMARY_NAV` + "Conta").
A posição da rota atual fica em preto/negrito e as demais em cinza. **Não existe** "Mais": desde o
M5.8 só aparece o que já foi construído, e as rotas do passo 4 redirecionam para `/` (as páginas-stub
continuam no disco, sem rota). "Sair" na tela Conta encerra a sessão e leva a `/login`.
Se a barra mudar de itens, a regressão é em `src/components/Layout/navItems.ts`.

---

### CENÁRIO 72: Sidebar no desktop lista as telas construídas, com Conta e Sair `[M5.5 · atualizado no M5.8]`

**Categoria:** Caminho feliz
**Pré-condições:** Janela em 1280px.
**Passos:**
1. Conferir a sidebar fixa à esquerda.
2. Navegar para `/distribution` e observar o destaque da rota ativa.
3. Navegar para `/portfolio` e voltar para `/` pelo item "Radar".

**Resultado esperado:** A sidebar lista Radar, Distribuição e Portfólio (`PRIMARY_NAV`) e, no
rodapé separado por uma linha, "Conta" e o botão "Sair" (que leva a `/login`). Só o item da rota atual fica destacado. Em `/`
apenas "Radar" fica ativo: o item usa `end` para casar exatamente a raiz, então estar em
`/distribution` **não** pode acender também o "Radar" (o bug clássico de `NavLink` sem `end`).

---

### CENÁRIO 73: Onboarding não mostra navegação `[M5.5 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Conta nova, sem onboarding concluído.
**Passos:**
1. Cadastrar e chegar em `/onboarding`.
2. Conferir se existe barra inferior (mobile) ou sidebar (desktop).
3. Concluir o onboarding e conferir a navegação no Dashboard.

**Resultado esperado:** Nenhuma navegação durante o onboarding — `AppShell` envolve as rotas
protegidas **exceto** `/onboarding`, de propósito: sem os dados coletados, as outras telas não
teriam o que mostrar. Assim que o onboarding conclui e cai no Dashboard, a navegação aparece.

---

### CENÁRIO 74: Clicar no label foca o input `[M5.5 · executável hoje]`

**Categoria:** Interação
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Clicar no **texto** "Despesas Essenciais (%)" (não no campo).
2. Repetir em "Nome do objetivo" e no campo de salário líquido.
3. Navegar o formulário só com Tab e conferir se o leitor de tela anunciaria o erro (checar
   `aria-invalid` e `aria-describedby` no DevTools num campo com erro).

**Resultado esperado:** Clicar no label foca o input correspondente. Esta era uma lacuna real
de acessibilidade antes do M5.5 (labels sem `htmlFor`) — `FormField` agora gera o `id` via
`useId()` e conecta `aria-describedby` ao texto de erro/hint. Um campo com erro precisa ter
`aria-invalid="true"`.

---

### CENÁRIO 75: IDs únicos com vários formulários iguais na mesma tela `[M5.6 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** Em `/distribution`, com 3 objetivos de investimento cadastrados, todos em
"Personalizado".
**Passos:**
1. Clicar no label "Ações (%)" **do segundo** objetivo.
2. Conferir qual input recebeu o foco.
3. Repetir com o terceiro objetivo.

**Resultado esperado:** O foco vai para o input do objetivo clicado, nunca para o do primeiro.
Cada `AllocationModelPicker` renderiza 4 `FormField` e, com 3 objetivos, são 12 inputs de
mesma label na mesma página — se `useId()` não estivesse isolando por instância, todos os
labels apontariam para o mesmo `id` e o foco sempre cairia no primeiro. Vale também para os
2 blocos de pagamento do Nível 1, que repetem as mesmas 5 labels.

---

### CENÁRIO 76: Barra inferior fixa não cobre o conteúdo `[M5.5 · executável hoje]`

**Categoria:** Edge case
**Pré-condições:** 375px, em `/distribution` (a tela mais longa do app).
**Passos:**
1. Rolar até o fim da página.
2. Tentar clicar no último botão da tela ("Salvar objetivos de investimento" / "+ Adicionar despesa").
3. Repetir com zoom do navegador em 200%.

**Resultado esperado:** O último elemento clicável fica inteiramente acima da barra fixa e
continua clicável. O container reserva espaço (`pb-16`) justamente para isso — se o botão
ficar por baixo da barra, o padding não acompanha a altura real da nav em zoom/fonte grande.

---

### CENÁRIO 77: Estados de carregamento e erro são visíveis `[M5.5 · executável hoje]`

**Categoria:** Caminho de erro
**Pré-condições:** DevTools → Network → throttling "Slow 3G".
**Passos:**
1. Abrir `/distribution` e observar o que aparece antes dos dados.
2. Colocar a rede em "Offline" e tentar salvar o Nível 1.
3. Voltar para "Online".

**Resultado esperado:** Enquanto carrega, aparece o `LoadingState` com rótulo próprio
("Carregando distribuição...", "Carregando despesas essenciais..."), não uma tela branca. A
falha do passo 2 precisa virar um `Alert` **na tela** — antes do M5.5 vários erros de ação
morriam só em `console.error`. Um erro que só existe no console é, para o usuário, um botão
que não faz nada.

---

## 13. Distribuição — Nível 1 por pagamento e valor em R$ (M5.5/M5.6)

### CENÁRIO 78: Alterar o salário líquido pela tela de Distribuição `[M5.6]`

**Categoria:** Caminho feliz
**Pré-condições:** Usuário com **um** dia de pagamento (`payday2` nulo) e renda de R$ 4.900.
**Passos:**
1. Abrir `/distribution`. Conferir o campo "Salário líquido mensal (R$)" preenchido com 4.900.
2. Trocar para 5.200 e observar o aviso que aparece.
3. Conferir os valores em R$ ao lado de cada uma das 5 categorias.
4. Salvar o Nível 1. Recarregar a página.
5. Conferir `users/{uid}.monthlyIncomeNet` no console do Firebase.

**Resultado esperado:** Um `Alert` informativo avisa que "sua renda mensal líquida passará de
R$ 4.900,00 para R$ 5.200,00" **antes** de salvar — a renda alimenta Dashboard, reserva de
emergência e alerta de orçamento, então mudá-la em silêncio seria uma surpresa. Os R$ por
categoria recalculam ao vivo. Após salvar, o Firestore tem 5200 e a tela recarrega idêntica.
**Defeito conhecido a conferir neste passo:** o texto do aviso renderiza "R$ R$ 4.900,00" —
o "R$" aparece duplicado porque o componente prefixa um "R$" literal a um número já formatado
com `style: 'currency'` (`NivelUmForm.tsx`, bloco do `incomeChanged`).

---

### CENÁRIO 79: Dois pagamentos — ida e volta exata dos valores em R$ `[M5.6]`

**Categoria:** Persistência
**Pré-condições:** Usuário com `payday1` e `payday2` preenchidos no onboarding.
**Passos:**
1. Em `/distribution`, digitar R$ 3.000,00 no 1º pagamento e R$ 1.900,00 no 2º.
2. Conferir o campo "% da renda que chega no 1º pagamento".
3. Salvar. Recarregar a página (F5).
4. Conferir os dois campos em R$.

**Resultado esperado:** O % do 1º vira ≈ 61,2 e os dois valores voltam **exatos** após o
reload: R$ 3.000,00 e R$ 1.900,00. O schema não guarda os R$ — guarda só
`payday1IncomeSharePercent` como double completo (sem arredondar) e a renda total; os R$
exibidos são reconstruídos por `total × share` arredondado a centavos. Se voltar
R$ 2.999,99 / R$ 1.900,01, o percentual está sendo arredondado antes de persistir e a
reconstrução perde o centavo.

---

### CENÁRIO 80: Editar o % redistribui os valores mantendo o total `[M5.6]`

**Categoria:** Interação
**Pré-condições:** Cenário 79 concluído (R$ 3.000 / R$ 1.900, total R$ 4.900).
**Passos:**
1. Trocar o campo de % de 61,2 para 50.
2. Conferir os dois campos em R$.
3. Voltar o 1º pagamento para R$ 4.000 digitando direto no campo em R$.
4. Conferir o % de novo.

**Resultado esperado:** Sincronização nos dois sentidos, sempre preservando o total: no passo
2, R$ 2.450,00 e R$ 2.450,00 (total intacto em R$ 4.900); no passo 4, o % recalcula sozinho
(R$ 4.000 sobre R$ 5.900 ≈ 67,8%) e o aviso de mudança de renda aparece, porque agora o total
mudou. O que **não** pode acontecer é o total derivar sozinho a cada digitação (dinheiro
aparecendo ou sumindo sem o usuário ter mexido no total).

---

### CENÁRIO 81: Valores zerados bloqueiam o salvamento `[M5.6]`

**Categoria:** Caminho de erro
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Com um pagamento só: zerar o salário líquido e tentar salvar.
2. Com dois pagamentos: zerar os dois e tentar salvar.
3. Digitar um valor negativo (ou colar "-1000") e tentar salvar.

**Resultado esperado:** Salvamento bloqueado nos três casos, com mensagem explícita ("o valor
do pagamento precisa ser maior que 0" / "a soma dos pagamentos precisa ser maior que 0").
Nenhum `NaN` ou `Infinity` aparece na tela, e nada é gravado no Firestore — nem a distribuição,
nem `monthlyIncomeNet`. Uma renda zerada gravada aqui quebraria a reserva de emergência e a
projeção do Dashboard.

---

### CENÁRIO 82: Primeiro pagamento zerado com o segundo preenchido `[M5.6]`

**Categoria:** Edge case
**Pré-condições:** Usuário com dois pagamentos.
**Passos:**
1. Zerar o 1º pagamento e deixar R$ 4.900 no 2º.
2. Conferir o % e os R$ por categoria do bloco "1º pagamento".
3. Salvar e recarregar.

**Resultado esperado:** É um estado **válido** (a regra é soma > 0, o segundo pode ser 0 e
vice-versa) — representa quem recebeu adiantamento zero naquele mês. O % vai para 0, todas as
categorias do 1º bloco mostram R$ 0,00 e o 2º bloco carrega 100% da renda. Após recarregar,
o estado se mantém. O que não pode: divisão por zero, `NaN` no percentual ou o formulário
travar sem explicar.

---

### CENÁRIO 83: Caixa da Empresa — a 5ª categoria `[M5.5]`

**Categoria:** Caminho feliz
**Pré-condições:** Conta nova, onboarding recém-concluído.
**Passos:**
1. Em `/distribution`, conferir o valor inicial de "Caixa da Empresa (%)".
2. Mudar a divisão para 50/10/10/25/5 e salvar.
3. Ir ao Dashboard e conferir o card "💎 Distribuição Ativa".
4. Voltar, zerar a Caixa da Empresa (devolvendo os 5% para Essenciais) e salvar.
5. Conferir o Dashboard de novo.

**Resultado esperado:** O default é **0%** para todo mundo — quem não tem empresa não deve ser
empurrado para uma categoria que não usa; o default segue 55/10/10/25/0. No passo 3 o card do
Dashboard ganha a linha "Caixa da Empresa"; no passo 5 essa linha **some** (a linha só é
renderizada quando o valor é maior que zero), sem deixar um "R$ 0,00" órfão no resumo.

---

### CENÁRIO 84: Cada pagamento valida a própria soma `[M5.5]`

**Categoria:** Caminho de erro
**Pré-condições:** Usuário com dois pagamentos.
**Passos:**
1. Deixar o 1º pagamento somando 100% e o 2º somando 95%.
2. Tentar salvar.
3. Inverter (1º em 105%, 2º em 100%) e tentar de novo.

**Resultado esperado:** Bloqueado nos dois casos, com o erro no bloco certo e a diferença
exata ("Faltam 5,0% para completar 100%." / "A soma excedeu 100% em 5,0%."). O indicador de
soma do bloco com erro fica vermelho e o do bloco correto permanece neutro — o usuário precisa
saber **qual** pagamento está quebrado, não só que "algo" está.

---

### CENÁRIO 85: Cinco categorias com decimais `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Preencher 33,3 / 33,3 / 33,4 / 0 / 0 e tentar salvar.
2. Preencher 20 / 20 / 20 / 20 / 20 e salvar.
3. Preencher 33,33 / 33,33 / 33,33 / 0,01 / 0 e tentar salvar.

**Resultado esperado:** Os três casos são aceitos. A validação usa
`Math.abs(soma - 100) < 0.01`, não `soma === 100` — em JavaScript `33.3 + 33.3 + 33.4` dá
`100.00000000000001`. Se o passo 1 for rejeitado, é exatamente o bug que o CENÁRIO 38 já
descrevia, agora com 5 parcelas em vez de 4 (mais chances de acumular erro de ponto flutuante).

---

### CENÁRIO 86: Mudar a renda propaga para reserva, Dashboard e objetivos `[M5.6]`

**Categoria:** Interação
**Pré-condições:** Renda de R$ 4.900, investimentos em 25%, objetivos já cadastrados.
**Passos:**
1. Anotar a reserva de emergência exibida na própria tela de Distribuição.
2. Anotar o "≈ R$ X por mês" da introdução do Nível 2 e o "≈ R$ X/mês" de cada objetivo.
3. Mudar o salário para R$ 7.000 e salvar o Nível 1 (**sem** recarregar a página).
4. Conferir os mesmos números do passo 1 e 2.
5. Ir ao Dashboard.

**Resultado esperado:** Sem reload: a reserva passa de R$ 29.400/R$ 58.800 para
R$ 42.000/R$ 84.000 (6 e 12 meses de renda), o aporte do Nível 2 sobe de R$ 1.225 para
R$ 1.750 e cada objetivo recalcula proporcionalmente. É o `refreshCurrentUser()` do
`saveNivelUm` fazendo efeito — se algum desses números só mudar depois do F5, o refresh do
contexto não está acontecendo ou a tela está lendo um valor congelado. No Dashboard, a
velocidade de crescimento e o card de Distribuição Ativa refletem a renda nova.

---

### CENÁRIO 87: Renda alterada pelo Onboarding desloca os valores por pagamento `[M5.6]`

**Categoria:** Interação
**Pré-condições:** Dois pagamentos configurados como R$ 3.000 / R$ 1.900 (share ≈ 61,2%).
**Passos:**
1. Voltar a `/onboarding` e mudar a renda mensal líquida para R$ 5.880 (20% a mais). Salvar.
2. Abrir `/distribution` e conferir os dois campos em R$.

**Resultado esperado:** O **percentual** é o que persiste, não os R$: os campos passam a
mostrar ≈ R$ 3.600,00 e ≈ R$ 2.280,00 (mesma proporção, 20% a mais em cada). Isso é o desenho,
não um bug — mas é a consequência menos óbvia de "o schema guarda o %". Se o usuário quiser
outros valores absolutos, redigita nos campos em R$. O que seria bug: a soma não bater com a
renda salva no onboarding.

---

### CENÁRIO 88: Falha de rede no meio do salvamento do Nível 1 `[M5.6]`

**Categoria:** Caminho de erro
**Pré-condições:** Em `/distribution`, com uma mudança de renda pendente.
**Passos:**
1. Preparar a mudança de salário (ex.: de R$ 4.900 para R$ 5.200).
2. Colocar a rede em "Offline" no DevTools e clicar em Salvar.
3. Voltar para "Online" e clicar em Salvar de novo.
4. Recarregar e conferir Firestore: `distribution/current` **e** `users/{uid}.monthlyIncomeNet`.

**Resultado esperado:** O salvamento faz duas escritas separadas (distribuição primeiro,
renda depois) sem transação — uma falha no meio pode deixar a distribuição nova com a renda
antiga. É um risco aceito no desenho: as escritas são idempotentes e o retry do passo 3 deve
fechar a inconsistência. O critério de aprovação é: (a) o erro aparece na tela, (b) o retry
resolve completamente, (c) o app não fica travado em "Salvando...".

---

### CENÁRIO 89: Remover o segundo pagamento deixa dados órfãos `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** Distribuição salva com `payday2Split` e `payday1IncomeSharePercent`.
**Passos:**
1. Voltar a `/onboarding` e apagar o 2º dia de pagamento. Salvar.
2. Abrir `/distribution`.
3. Conferir `distribution/current` no console do Firebase.

**Resultado esperado:** A tela mostra **um único** bloco de divisão e o campo de % some —
"tem 2 pagamentos?" é derivado de `users/{uid}.payday2`, nunca do documento de distribuição.
O `payday2Split` continua gravado no Firestore, órfão e inofensivo (é intencional: se o
usuário recolocar o 2º pagamento, a configuração volta). O que não pode: a tela somar os dois
splits e inflar os R$ por categoria.

---

### CENÁRIO 90: Documento no formato antigo abre convertido, sem gravar sozinho `[M5.5]`

**Categoria:** Persistência
**Pré-condições:** Uma conta cujo `distribution/current` ainda esteja no formato flat do M5
(`essentialsPercent` na raiz + `allocationModel` único). Se não houver, dá para forjar editando
o documento direto no console do Firebase.
**Passos:**
1. Abrir `/distribution` e conferir se os percentuais salvos aparecem.
2. **Sem salvar nada**, conferir o documento no Firestore.
3. Conferir o Nível 2.
4. Agora salvar o Nível 1 e conferir o documento de novo.

**Resultado esperado:** A tela converte em memória: os 4 percentuais antigos viram o
`payday1Split` (com Caixa da Empresa em 0%) e o modelo único vira **um** objetivo chamado
"Meus Investimentos" com 100%. No passo 2 o documento continua **intacto** — a conversão nunca
é gravada de ofício; só o salvamento explícito do usuário (passo 4) reescreve o documento no
formato novo. Um doc no formato M5 **com** 2 pagamentos configurados cai no default novo (o
documento antigo nunca soube de dois pagamentos, não há o que migrar), e isso também não pode
quebrar a tela.

---

## 14. Distribuição — Nível 2 por objetivos de investimento (M5.5/M5.6)

### CENÁRIO 91: Vários objetivos somando 100% `[M5.5]`

**Categoria:** Caminho feliz
**Pré-condições:** Em `/distribution`, com investimentos em 25% de uma renda de R$ 4.900
(aporte ≈ R$ 1.225).
**Passos:**
1. Renomear o objetivo padrão para "Casa + Carro 2031" e colocar 60%.
2. Adicionar um segundo objetivo, "Aposentadoria", com 40% e modelo Agressivo.
3. Conferir o "≈ R$ X/mês" de cada um e o resumo no topo.
4. Salvar, recarregar e conferir tudo.

**Resultado esperado:** R$ 735/mês e R$ 490/mês respectivamente; o resumo do topo mostra
"100,0%" com "✓ Fechado em 100%" e a barra de progresso cheia. Após o reload, nomes,
percentuais e modelos voltam idênticos, e o Dashboard passa a dizer "2 objetivos de
investimento" com o retorno esperado combinado.
**Defeito conhecido a conferir neste passo:** o hint do campo e a introdução mostram
"= R$ R$ 735 por mês" — mesmo "R$" duplicado do CENÁRIO 78, aqui em `InvestmentBucketsForm.tsx`
(introdução e hint de cada objetivo).

---

### CENÁRIO 92: Soma dos objetivos diferente de 100% `[M5.5]`

**Categoria:** Caminho de erro
**Pré-condições:** Dois objetivos cadastrados.
**Passos:**
1. Colocar 60% e 30% (soma 90%). Observar o resumo no topo.
2. Tentar salvar.
3. Mudar para 60% e 50% (soma 110%) e tentar de novo.

**Resultado esperado:** O resumo do topo muda de cor e diz "Faltam 10,0%" / "Excedeu 10,0%"
**enquanto o usuário digita** — ele fica no topo justamente para não obrigar a rolar até o fim
para descobrir que a conta não fecha. O salvamento é bloqueado e a mensagem de erro aparece
perto do botão Salvar. Nada é gravado no Firestore.

---

### CENÁRIO 93: Atalho "Ajustar para fechar 100%" `[M5.6]`

**Categoria:** Caminho feliz
**Pré-condições:** Três objetivos com 50% / 20% / 10% (soma 80%).
**Passos:**
1. Clicar em "↔ Ajustar para fechar 100%" **no terceiro** objetivo.
2. Conferir os três percentuais e o resumo.
3. Agora deixar a soma em 120% e usar o atalho no segundo objetivo.
4. Preencher 33,3 / 33,3 / 33,4 e observar o botão de atalho.

**Resultado esperado:** No passo 1, só o terceiro muda (vira 30%) e os outros ficam intactos —
o atalho coloca **neste** objetivo o que falta para os demais fecharem 100%, sem
auto-rebalancear ninguém. No passo 3, o objetivo clicado absorve o excesso (o resultado é
limitado a [0, 100], nunca negativo). No passo 4, o resumo do topo diz "✓ Fechado em 100%"
mas o botão de atalho **continua aparecendo**: a condição de exibição usa comparação exata
(`total !== 100`) enquanto o resumo usa a tolerância de ponto flutuante — a mesma inconsistência
que o CENÁRIO 38 documenta, agora entre dois pontos da mesma tela.

---

### CENÁRIO 94: Objetivo sem nome bloqueia o salvamento `[M5.5]`

**Categoria:** Caminho de erro
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Adicionar um objetivo, deixar o nome em branco e colocar um percentual que feche 100%.
2. Tentar salvar.
3. Preencher o nome só com espaços ("   ") e tentar de novo.

**Resultado esperado:** Bloqueado nos dois casos, com o erro no campo de nome do objetivo certo
("Informe um nome para o objetivo."). O passo 3 é o que separa validação de verdade de
validação de fachada — o nome é normalizado com `trim()` antes de ser considerado preenchido.

---

### CENÁRIO 95: Remover objetivo pede confirmação e respeita o piso de 1 `[M5.6]`

**Categoria:** Edge case
**Pré-condições:** Três objetivos, um deles com nome e percentual preenchidos e outro
totalmente vazio (recém-adicionado, 0%).
**Passos:**
1. Clicar em "Remover" no objetivo preenchido e **cancelar** o diálogo.
2. Clicar de novo e confirmar.
3. Remover o objetivo vazio.
4. Tentar remover o último objetivo restante.

**Resultado esperado:** O passo 1 não remove nada. O passo 2 remove. O passo 3 remove **sem**
pedir confirmação — objetivo vazio não tem trabalho a perder, e confirmar tudo treina o usuário
a clicar "OK" sem ler. No passo 4 o botão está desabilitado: o piso de 1 objetivo é estrutural,
nunca se chega a uma lista vazia (que deixaria o retorno esperado sem base de cálculo).

---

### CENÁRIO 96: Objetivo novo começa em 0% `[M5.6]`

**Categoria:** Edge case
**Pré-condições:** Um objetivo com 100%.
**Passos:**
1. Clicar em "+ Adicionar objetivo".
2. Conferir o percentual do objetivo novo e o resumo do topo.

**Resultado esperado:** O objetivo novo entra com 0% e o objetivo existente **não** é
rebalanceado — é a filosofia do app inteiro: nada se ajusta sozinho, o indicador de soma acusa
até o usuário decidir. Com 100% + 0% a soma segue fechada, então dá para salvar sem mexer em
nada; assim que o usuário digitar qualquer percentual no novo, o resumo acusa o excesso.
**Divergência a registrar:** o plano do M5.6 previa que o objetivo novo já entrasse com o
restante (`max(0, 100 - soma)`); a implementação entrega 0%. Como o restante é 0 quando a lista
está fechada em 100%, os dois desenhos só divergem ao adicionar objetivo numa lista que ainda
não fecha — decidir qual vale antes de marcar este cenário como aprovado.

---

### CENÁRIO 97: Atalho "Partir de:" no modelo Personalizado `[M5.6]`

**Categoria:** Caminho de erro
**Pré-condições:** Um objetivo, com o modelo "Personalizado" selecionado e valores manuais
quaisquer (ex.: 10/10/10/70).
**Passos:**
1. Clicar em "Partir de: All Weather (Ray Dalio)".
2. Conferir os **quatro** campos: Ações, Renda Fixa, Alternativos, Caixa.
3. Conferir a pré-visualização (barra + oscilação + retorno) logo abaixo.

**Resultado esperado esperado pelo desenho:** os 4 campos passam a 30/40/20/10 e a
pré-visualização acompanha.
**O que acontece hoje:** só o **último** campo (Caixa) é aplicado — o resultado fica
10/10/10/10. O handler chama a função de atualização quatro vezes seguidas no mesmo ciclo de
render, e cada chamada parte do valor **antigo** vindo por prop (que só atualiza no próximo
render), então as três primeiras são descartadas pela quarta. Em
`AllocationModelPicker.tsx`, no bloco dos botões "Partir de:". A correção é montar o objeto
completo e emitir **uma** atualização só. Cenário reprovado até lá.

---

### CENÁRIO 98: Trocar de Personalizado para um preset preserva a customização `[M5.5]`

**Categoria:** Interação
**Pré-condições:** Um objetivo em "Personalizado" com valores próprios salvos.
**Passos:**
1. Clicar no card "Conservador" e **cancelar** o aviso.
2. Clicar de novo e confirmar.
3. Salvar, recarregar a página.
4. Voltar o objetivo para "Personalizado".

**Resultado esperado:** O passo 1 não troca nada. O passo 2 troca para Conservador, mas a
customização **não** é apagada — o aviso diz exatamente isso. No passo 4 os valores customizados
continuam lá, inclusive depois do reload: o campo `customAllocation` permanece no documento
mesmo com outro modelo ativo. Este é o CENÁRIO 39 revalidado na tela nova, agora **por
objetivo**: com 2 objetivos, trocar o modelo de um não pode mexer no outro.

---

### CENÁRIO 99: Cards dos modelos — barra, oscilação e retorno `[M5.6]`

**Categoria:** Caminho feliz
**Pré-condições:** Em `/distribution`, Nível 2.
**Passos:**
1. Conferir os percentuais de cada um dos 3 cards contra `src/core/allocationModels.ts`.
2. Conferir o chip de oscilação de cada um.
3. Selecionar um modelo e conferir a indicação de selecionado.
4. Inspecionar a barra no DevTools e conferir `role="img"` e o `aria-label`.

**Resultado esperado:** All Weather = 30/40/20/10, Conservador = 50/30/15/5, Agressivo =
70/20/10/0 (o CENÁRIO 40 continua valendo — era o *drift* do PRD). Oscilação classificada pelo
peso em ações: All Weather "baixa" (30%), Conservador "média" (50%), Agressivo "alta" (70%).
O card selecionado mostra "✓ Selecionado" **em texto**, além da borda, e tem `aria-pressed="true"`.
A legenda da barra repete os percentuais em texto — a informação nunca depende só de cor.
**Observação de produto, não bug:** "Conservador" (50% em ações) oscila mais que
"All Weather" (30%). O chip torna isso visível e a estranheza é legítima; os nomes vêm do PRD
autoral e só mudam por decisão sua.

---

### CENÁRIO 100: Pré-visualização do Personalizado ao vivo `[M5.6]`

**Categoria:** Interação
**Pré-condições:** Um objetivo em "Personalizado".
**Passos:**
1. Digitar 100 em Ações e 0 nas outras três.
2. Conferir barra, chip de oscilação e retorno esperado.
3. Mudar para 0/0/0/100 (tudo em Caixa).
4. Deixar a soma em 90% e conferir o indicador.
5. Preencher 33,3 / 33,3 / 33,4 / 0 e olhar a barra.

**Resultado esperado:** A pré-visualização acompanha cada tecla. Em 100% ações: oscilação
"alta" e retorno ≈ 9,3% a.a.; em 100% caixa: oscilação "baixa" e retorno 0,0% a.a. (caixa não
rende no catálogo). Com soma 90%, o indicador de soma acusa e o salvamento é bloqueado. No
passo 5 a barra arredonda para 33/33/33 e fica visivelmente com uma fresta — é cosmético e
esperado (`Math.round` por segmento), mas os números da legenda precisam continuar corretos.

---

### CENÁRIO 101: Glossário de classes de ativos `[M5.6]`

**Categoria:** Caminho feliz
**Pré-condições:** Em `/distribution`, Nível 2.
**Passos:**
1. Expandir "O que é cada classe de ativos?".
2. Conferir a lista de "Exemplos no app" de cada classe contra `src/core/assetReturnRates.ts`.
3. Conferir se o glossário aparece também dentro de cada objetivo.

**Resultado esperado:** Quatro classes explicadas (Ações, Renda Fixa, Alternativos, Caixa) e os
exemplos vêm **do catálogo**, não de uma lista escrita à mão — Tesouro Selic e CDB/LCI/LCA em
Renda Fixa, Bitcoin e FIIs em Alternativos, e assim por diante. Se alguém adicionar um
instrumento ao catálogo e ele não aparecer aqui, a lista foi duplicada em algum lugar e vai
divergir com o tempo. Use `<details>` nativo: precisa abrir/fechar sem JavaScript e funcionar
com teclado (Enter/Espaço).

---

### CENÁRIO 102: Retorno esperado combinado de vários objetivos `[M5.5]`

**Categoria:** Caminho feliz
**Pré-condições:** Dois objetivos: 60% em All Weather e 40% em Agressivo.
**Passos:**
1. Anotar o retorno esperado exibido em cada card selecionado.
2. Conferir a linha "Retorno esperado: X% a.a." no rodapé da tela de Distribuição.
3. Calcular à mão: `0,6 × retornoAllWeather + 0,4 × retornoAgressivo`.
4. Mudar o segundo objetivo para 0% e conferir de novo.

**Resultado esperado:** A linha do rodapé bate com a média ponderada do passo 3 (±0,1pp de
arredondamento de exibição). No passo 4, com um objetivo a 0%, o retorno passa a ser o do
objetivo de 60% puro — e a soma quebrada impede salvar, mas a exibição não pode virar `NaN`
enquanto o usuário edita. A mesma linha diz se o resultado "bate sua meta" usando o aporte
mensal atual e o patrimônio real do Portfólio.

---

### CENÁRIO 103: Salvar um nível não apaga o outro `[M5.5]`

**Categoria:** Interação
**Pré-condições:** Distribuição completa e salva (Nível 1 + objetivos).
**Passos:**
1. Mudar só o Nível 1 e clicar em "Salvar Nível 1".
2. Recarregar e conferir se os objetivos continuam iguais.
3. Mudar só os objetivos e clicar em "Salvar objetivos de investimento".
4. Recarregar e conferir se o Nível 1 continua igual.
5. Conferir o documento no Firestore depois de cada salvamento.

**Resultado esperado:** Os dois níveis coexistem — cada botão faz uma escrita de merge, que
atualiza só os campos daquele nível. Se salvar o Nível 1 zerar os objetivos (ou vice-versa),
alguém trocou a escrita de merge por sobrescrita do documento inteiro, e o usuário perde metade
da configuração a cada salvamento.

---

## 15. Despesas essenciais detalhadas (M5.5)

### CENÁRIO 104: CRUD de despesa essencial e comparação com o orçado `[M5.5]`

**Categoria:** Caminho feliz
**Pré-condições:** Em `/distribution`, com essenciais orçados em R$ 2.695 (55% de R$ 4.900).
**Passos:**
1. Adicionar "Aluguel" R$ 1.500 e "Celular" R$ 80.
2. Conferir a linha "Orçado · Real · Saldo".
3. Editar o Celular para R$ 120 e conferir o saldo de novo.
4. Recarregar a página.
5. Conferir `users/{uid}/essentialExpenses` no console do Firebase.

**Resultado esperado:** Real = R$ 1.580 e Saldo = R$ 1.115 (positivo = sobrou orçamento, mesmo
sinal do "Saldo Despesa" da planilha pessoal). Após a edição, Real = R$ 1.620. Tudo sobrevive
ao reload e cada item é um documento na subcoleção.

---

### CENÁRIO 105: Estouro do orçamento de essenciais `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** Cenário 104 concluído.
**Passos:**
1. Adicionar uma despesa de R$ 2.000 (levando o real acima do orçado).
2. Conferir cor e texto do resumo.
3. Reduzir o percentual de Essenciais no Nível 1 e salvar, sem tocar nas despesas.

**Resultado esperado:** O resumo vira alerta de atenção (não de sucesso) e o saldo aparece
negativo, sem esconder o sinal. No passo 3, mexer no Nível 1 muda o **orçado** e o resumo
reage na hora — os dois lados da comparação são vivos, não um número salvo.

---

### CENÁRIO 106: Excluir despesa é permanente `[M5.5]`

**Categoria:** Persistência
**Pré-condições:** Pelo menos duas despesas cadastradas.
**Passos:**
1. Clicar em "Excluir" numa despesa e cancelar o diálogo.
2. Clicar de novo e confirmar.
3. Conferir a subcoleção no Firestore.
4. Recarregar a página.

**Resultado esperado:** O passo 1 não remove nada. Depois do passo 2 o documento **desaparece**
da subcoleção — diferente de ativo do Portfólio, que é arquivado com `status`. É deliberado:
linha de orçamento é recalculável, posição de investimento tem valor histórico. Confirmar que
não sobrou documento com flag de "excluído".

---

### CENÁRIO 107: Lista de despesas vazia `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** Conta sem nenhuma despesa essencial cadastrada.
**Passos:**
1. Abrir `/distribution` e rolar até a seção de despesas essenciais.
2. Conferir o resumo Orçado/Real/Saldo.

**Resultado esperado:** Um estado vazio explicativo (não uma área em branco), Real = R$ 0,00 e
Saldo = igual ao orçado, com o resumo em cor positiva. Nenhum `NaN` e nenhuma divisão por zero
com a lista vazia.

---

### CENÁRIO 108: Custo essencial do Onboarding vs. lista detalhada `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** `essentialMonthlyCost` = R$ 2.000 no onboarding e despesas detalhadas
somando R$ 3.500.
**Passos:**
1. Conferir o saldo na tela de Distribuição.
2. Ir ao Dashboard e conferir a velocidade de crescimento e o alerta de orçamento.
3. Voltar ao onboarding e conferir se o custo essencial mudou sozinho.

**Resultado esperado:** São **dois números independentes, sem reconciliação automática** — o
Dashboard continua usando `essentialMonthlyCost` para a velocidade, e a lista detalhada só
alimenta a comparação da tela de Distribuição. É decisão de desenho, não lacuna; o cenário
existe para flagrar o dia em que alguém "consertar" isso e criar duas fontes de verdade
brigando. Se a divergência incomodar na prática, a decisão a tomar é qual dos dois manda.

---

### CENÁRIO 109: Valores extremos e nomes longos em despesas `[M5.5]`

**Categoria:** Edge case
**Pré-condições:** Em `/distribution`.
**Passos:**
1. Tentar salvar uma despesa com valor 0 e com valor negativo.
2. Salvar uma com R$ 999.999.999,99.
3. Salvar uma com nome de 200 caracteres.
4. Cadastrar 30 despesas e conferir a rolagem e o desempenho em 375px.

**Resultado esperado:** Valor 0 e negativo são rejeitados com mensagem no campo. O valor gigante
formata sem quebrar o layout (sem estourar o card na horizontal). O nome longo trunca ou quebra
linha, sem empurrar os botões "Editar"/"Excluir" para fora da tela. Com 30 itens a tela continua
utilizável e o total bate com a soma manual.

---

## 16. Jornada e regressão da Distribuição (M5.5/M5.6)

### CENÁRIO 110: Jornada completa da Distribuição ponta a ponta `[M5.6]`

**Categoria:** Caminho feliz
**Pré-condições:** Conta nova, onboarding com **dois** dias de pagamento.
**Passos:**
1. Concluir o onboarding e ir direto para `/distribution` pela navegação (sem digitar URL).
2. Informar os valores recebidos em cada pagamento (R$ 3.000 e R$ 1.900).
3. Ajustar as 5 categorias de cada pagamento com divisões **diferentes** entre eles.
4. Salvar o Nível 1.
5. Criar 2 objetivos de investimento com modelos diferentes, fechando 100%. Salvar.
6. Cadastrar 4 despesas essenciais.
7. Ir ao Dashboard e conferir o card "Distribuição Ativa".
8. Fazer logout, login e refazer o percurso conferindo cada número.

**Resultado esperado:** Tudo sobrevive ao ciclo de logout/login. Os R$ por categoria no
Dashboard são a soma ponderada dos dois pagamentos (não a média simples dos percentuais) e
batem com a conta manual: para cada categoria,
`3000 × pct1/100 + 1900 × pct2/100`. A contagem de objetivos e o retorno esperado conferem.
Zero erros no console na jornada inteira. **Este é o cenário de aceitação do M5.5/M5.6** — se
ele passa, a tela de Distribuição entrega o que a planilha pessoal fazia.

---

### CENÁRIO 111: Duas abas editando a mesma distribuição `[M5.5]`

**Categoria:** Interação
**Pré-condições:** `/distribution` aberta em duas abas do mesmo usuário.
**Passos:**
1. Na aba A, mudar o Nível 1 e salvar.
2. Na aba B (carregada **antes** disso), mudar só os objetivos e salvar.
3. Recarregar as duas abas.
4. Repetir, mas com as duas abas editando o **mesmo** nível.

**Resultado esperado:** No passo 3, as duas mudanças coexistem — as escritas são por campo, e
níveis diferentes não se sobrescrevem. No passo 4 vale "quem salvou por último ganha", sem erro
na tela; o aceitável é o usuário perder a edição mais antiga, o inaceitável é o documento ficar
num estado misto e incoerente (ex.: `payday1Split` de uma aba e `payday2Split` da outra).

---

### CENÁRIO 112: Distribuição offline e sincronização `[M5.5]`

**Categoria:** Persistência
**Pré-condições:** App aberto em `/distribution`, dados já carregados.
**Passos:**
1. Ativar "Offline" no DevTools.
2. Editar os objetivos de investimento e salvar.
3. Observar a tela: o salvamento parece ter funcionado?
4. Voltar para "Online" e aguardar.
5. Conferir o Firestore e recarregar a página.

**Resultado esperado:** O comportamento depende de a persistência offline do Firestore estar
ligada. Com ela ligada, a escrita fica na fila, a UI reflete o valor novo na hora e sincroniza
ao voltar a rede; sem ela, o salvamento precisa **falhar de forma visível** (alerta na tela),
não ficar em silêncio dando a impressão de sucesso. O pior resultado possível é o usuário
acreditar que salvou, fechar o app e perder a configuração.

---

## 17. Regressões do pente fino de 07/10/2026 (sessão, Radar e realismo da projeção)

Cenários escritos a partir de defeitos **encontrados executando o app** (navegador automatizado,
persona "Rafael": renda R$ 5.781 em 2 pagamentos, patrimônio R$ 41.291, meta R$ 5 mi em 25 anos).
Todos falharam na execução de 07/10 — ficam aqui como regressão obrigatória depois da correção.

### CENÁRIO 113: Login em sessão nova leva ao Radar, não ao onboarding `[regressão]`

**Categoria:** Caminho de erro
**Pré-condições:** Usuário com onboarding concluído. Navegador sem sessão (aba anônima ou outro aparelho).
**Passos:**
1. Acessar `/login`, informar email e senha, clicar "Entrar".
2. Aguardar a navegação terminar, sem recarregar.

**Resultado esperado:** O usuário cai no Radar (`/`). Nunca em "Editar seu onboarding". A tela
pode mostrar o carregamento enquanto o documento do usuário é lido, mas não pode decidir a rota
antes dessa leitura terminar.

---

### CENÁRIO 114: Reeditar o onboarding não apaga a Distribuição personalizada `[regressão]`

**Categoria:** Interação
**Pré-condições:** Distribuição personalizada salva (ex.: 2 objetivos "Aposentadoria" 40% e
"Casa + Carro 2031" 60%, salário por pagamento, % diferentes do padrão).
**Passos:**
1. Abrir `/onboarding`, avançar até o passo 5 sem mudar nada e clicar "Atualizar".
2. Abrir `/distribution` e conferir os campos (valores dos inputs, não só o texto da página).

**Resultado esperado:** Objetivos, percentuais por pagamento e demais escolhas continuam iguais.
O onboarding só cria a distribuição padrão quando ela ainda não existe.

---

### CENÁRIO 115: Sair da conta `[regressão]`

**Categoria:** Caminho feliz
**Pré-condições:** Usuário logado, mobile e desktop.
**Passos:**
1. Procurar a opção de sair (menu lateral, "Mais" ou Configurações).
2. Sair e tentar abrir `/` pela URL.

**Resultado esperado:** Existe uma ação "Sair" visível; depois dela, `/` redireciona para `/login`.

---

### CENÁRIO 116: Radar coerente com a Distribuição `[regressão]`

**Categoria:** Interação
**Pré-condições:** Distribuição com Investimentos = 25% de R$ 5.781 (R$ 1.445,25).
**Passos:**
1. Abrir o Radar e ler "Velocidade de Crescimento", o insight "+20%" e o card "Distribuição Ativa".
2. Mudar Investimentos para 30% na Distribuição, salvar e voltar ao Radar.

**Resultado esperado:** O aporte usado pelo Radar é o mesmo valor de Investimentos efetivos do
card "Distribuição Ativa" (nunca "renda − custo essencial" = R$ 4.035 enquanto o card diz R$ 1.445),
e o tempo até a meta muda quando Investimentos muda.

---

### CENÁRIO 117: Primeiro Radar logo após o onboarding, sem ativos cadastrados `[regressão]`

**Categoria:** Edge case
**Pré-condições:** Conta nova; onboarding concluído com patrimônio R$ 41.291; nenhum ativo no Portfólio.
**Passos:**
1. Concluir o onboarding e observar o primeiro Radar.

**Resultado esperado:** O Radar não pode concluir "mais de 100 anos" por ter assumido retorno
de 0% e patrimônio zero. Ou usa uma premissa explícita (retorno do modelo da Distribuição,
patrimônio informado no onboarding), ou pede o cadastro dos ativos antes de mostrar o tempo até a meta.

---

### CENÁRIO 118: Retorno esperado dos modelos respeita a relação risco × retorno `[regressão]`

**Categoria:** Edge case
**Pré-condições:** Tela de Distribuição, Nível 2.
**Passos:**
1. Ler o "Retorno esperado" dos cards All Weather, Conservador e Agressivo.

**Resultado esperado:** Agressivo ≥ Conservador/All Weather (mais risco, mais retorno esperado).
Em 07/10: All Weather 12,1% > Conservador 11,6% > Agressivo 11,2%, porque "Alternativos" é a
média simples de FII (10,5%) e Bitcoin (45%) = 27,75% a.a.

---

### CENÁRIO 119: Projeção mostrada em valores de hoje `[regressão]`

**Categoria:** Edge case
**Pré-condições:** Radar com meta de longo prazo (≥ 20 anos).
**Passos:**
1. Ler o tempo até a meta e o gráfico.

**Resultado esperado:** A tela deixa claro se os valores são nominais ou em valores de hoje, e
considera inflação (premissa editável). Em 07/10: projeção nominal sem inflação — R$ 5 mi em 22 anos
equivalem a ≈ R$ 2,2 mi em poder de compra de hoje.

---

### CENÁRIO 120: Build de produção passa antes de qualquer deploy `[regressão]`

**Categoria:** Caminho de erro
**Pré-condições:** Working tree que vai para o Firebase Hosting.
**Passos:**
1. Rodar `npm run build` e `npm test`.

**Resultado esperado:** Ambos sem erro. Em 07/10: 29 erros de TypeScript (código parcial do M5.7)
e 3 testes de `inflation.test.ts` com valores esperados incorretos — o deploy publicaria um `dist/` antigo.

---

## Registro de Execução

| Data | Milestone | Cenários executados | Falhas | Observações |
|------|-----------|---------------------|--------|-------------|
| 07/10/2026 | M5.6 + M5.7 parcial (não commitado) | Jornada completa no navegador automatizado (mobile 390px + desktop 1280px): cadastro (senha fraca), onboarding (validações de nome, meta, custo > renda, dias iguais), seed + 3 ativos, Distribuição (salário por pagamento, 11 despesas, 2 objetivos, soma ≠ 100%, persistência), Radar, re-login. Inclui 31, 37, 104 (inclusão), 110 (parcial) e 113–120 | 113–120 | Passaram: validações do onboarding e do cadastro, retorno ponderado do Portfólio (11,17%), sincronização R$ ↔ % (50%), saldo de essenciais (R$ 1.433,55), persistência após reload, bloqueio de soma ≠ 100%, Radar bate o cálculo manual da fórmula atual (22a 8m). Conta de teste criada: `qa.rafael.*@mnance-teste.dev`. |
| 07/10/2026 | M5.8 Fase 0 (correções, ainda não commitada) | 113, 114, 115, 120 + 06/71/72 atualizados + navegação enxuta + vírgula decimal, no navegador automatizado (mobile 390px e desktop 1280px) com a conta `qa.rafael` | 0 | **113:** login → `/` (rotas vistas: `/login`, `/`), sem passar por `/onboarding`. **114:** "Aposentadoria 40%" e "Casa + Carro 2031 60%" intactos após "Atualizar" no onboarding. **115:** "Sair" na tela Conta (mobile) e na sidebar (desktop) leva a `/login`; abrir `/` sem sessão volta a `/login`. **120:** `tsc` 0 erros, 181 testes verdes (17 arquivos), `oxlint` exit 0 (só warnings antigos), `npm run build` exit 0. Rotas removidas (`/simulator`, `/expenses`, `/installments`, `/calendar`, `/report`, `/settings`, `/more`) redirecionam para `/`. Percentuais em pt-BR ("12,1% a.a."). **Ainda abertos (de propósito, Fases 1–3):** 116, 117, 118, 119 — o Radar continua em 22 anos e 8 meses porque a projeção realista ainda não foi construída. |
