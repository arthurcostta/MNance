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
2. Repetir para `/simulator`, `/expenses`, `/settings`, `/`.

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

## Registro de Execução

| Data | Milestone | Cenários executados | Falhas | Observações |
|------|-----------|---------------------|--------|-------------|
|      |           |                     |        |             |
