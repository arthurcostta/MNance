# CLAUDE.md — MNance (MVP v1.0)

## Visão Geral

MNance é um app PWA de gestão financeira pessoal. Diferencial sobre Mobills/Organizze:
responder "se eu manter isso, quantos anos até ficar rico?" através de simulações
automáticas, auditoria de despesas e priorização consciente.

## Decisões Arquiteturais

As decisões fundacionais (repositório fora do vault, TypeScript, client-side no MVP
com roadmap multi-usuário, ordem de build, modelo All Weather) estão documentadas em
detalhe no Segundo Cérebro do usuário:
`C02 - IA/Claude/Decissoes-e-Historico/2026-09-04_MNance-Arquitetura-v1.md`

Resumo rápido:
- Código vive em `C:\Dev\MNance`, fora do OneDrive (evita sync travando `node_modules`).
- TypeScript estrito em todo o projeto — `any` proibido, usar `unknown` + type guard.
- MVP roda 100% client-side (sem Cloud Functions); roadmap de migração para
  multi-usuário mapeado, mas não implementado ainda.
- Ordem de build: Fase 1 (Fundação, M0–M5) → Fase 2 (Diferencial, M6–M9) →
  Fase 3 (Complementares, M10–M15).
- Modelo "All Weather (Ray Dalio)" = 30% Ações / 40% Renda Fixa / 20% Alternativos /
  10% Caixa — ver `src/core/allocationModels.ts`.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Roteamento:** react-router-dom
- **Testing:** Vitest + @testing-library/react + jsdom
- **Backend:** Firebase (Firestore + Auth)
- **PWA:** vite-plugin-pwa
- **Gráficos:** Chart.js + react-chartjs-2
- **Ícones:** lucide-react
- **Datas:** date-fns

## Regras de Comportamento

1. **Proponha antes de executar:** mudanças multi-arquivo ou em comportamento
   existente exigem plano antes de código.
2. **`src/core/` é intocável:** nunca importa React, Firebase, ou qualquer tipo do
   Firestore (`Timestamp` etc). É TypeScript puro — testável isoladamente e portável
   para uma Cloud Function no dia em que o app precisar de processamento em lote
   multi-usuário, sem reescrita.
3. **Sem hardcoding de dados do usuário:** meta, renda, dias de pagamento — tudo vem
   de `users/{userId}` no Firestore via Onboarding. Nunca fixar valores do Arthur no
   código (isso quebraria o dia em que outro usuário se cadastrar).
4. **Taxas e modelos de alocação são dados, não constantes espalhadas:**
   centralizados em `src/core/allocationModels.ts` e `src/core/assetReturnRates.ts`.
5. **Comentários em português, explicando o porquê:** não descreva o que o código
   faz (nomes já fazem isso) — só comente quando houver uma decisão não-óbvia,
   uma restrição do PRD, ou um workaround.
6. **Sem dependências surpresa:** qualquer biblioteca nova deve ser consultada antes
   de adicionar via `npm install`.
7. **Precisão financeira:** qualquer mudança em `src/core/` deve manter
   `precision.golden.test.ts` passando (±2% de tolerância — métrica de sucesso do PRD).
8. **Justifique novos arquivos:** ao criar um arquivo fora da estrutura já prevista
   (`core/`, `types/`, `services/`, `hooks/`, `context/`, `pages/`, `components/`),
   explique o porquê antes.
9. **Respeite o PRD:** `B01 - Projetos/MNance/MNance_PRD_v1.0.md` (no vault) é a fonte
   de verdade das features. Se um pedido conflitar com ele, avise antes de implementar.

## Convenções de Código

**Nomenclatura:**
- Componentes React: PascalCase (`Dashboard.tsx`, `AssetCard.tsx`)
- Funções/variáveis: camelCase (`calculateReturn()`, `userPatrimony`)
- Constantes: UPPER_SNAKE_CASE (`DEFAULT_RETURN_RATE`)
- Tipos/Interfaces: PascalCase (`User`, `Asset`, `AllocationModel`)
- Firestore: coleções em `camelCase`, mesmo padrão dos campos dos documentos

**Estilo:**
- TypeScript strict mode ligado (`tsconfig.app.json`) — `any` proibido
- Indentação: 2 espaços
- Sem ponto-e-vírgula
- `const` sempre, nunca `var`
- Componentes funcionais + hooks
- Estilização via classes utilitárias Tailwind (sem CSS Modules/styled-components)

## Estrutura de Pastas

```
src/
├─ core/          # motor de cálculo — TS puro, zero React/Firebase
├─ types/         # espelham as coleções do Firestore
├─ services/      # única camada que fala com Firebase
├─ hooks/         # cola services + core para a UI
├─ context/       # AuthContext, ThemeContext
├─ pages/         # 1 arquivo por rota
├─ components/    # agrupados por feature
└─ utils/, config/
```

## Como Rodar

```bash
npm install

# Configurar Firebase — copiar .env.example para .env.local e preencher
cp .env.example .env.local

npm run dev              # http://localhost:5173
npm test                 # Vitest
npm run lint              # oxlint
npm run build
```

## Testes em Dispositivo Móvel

1. **Hot-reload (Wi-Fi local):** `npm run dev -- --host`
   Acessa `http://<IP-do-PC>:5173` no celular (mesma rede Wi-Fi). Toda alteração
   de código atualiza a tela em tempo real.

2. **PWA real (HTTPS):** `firebase hosting:channel:deploy <milestone>`
   Gera uma URL temporária testável em qualquer rede — necessário para validar
   "Adicionar à tela inicial", instalabilidade e comportamento offline.

## Verificação de Cada Milestone

- `npm test` passa, com atenção especial a `precision.golden.test.ts` em mudanças
  de `core/`.
- `npm run lint` sem erros.
- `npm run dev` — testar manualmente o fluxo no navegador (desktop + mobile).
- Conferir no console do Firebase que os dados gravam/recuperam na coleção certa.
- Sem console errors no navegador.

## Estado Atual

**M0 — Setup técnico: concluído.**
- Node 24.19.0, npm 11.17.0, firebase-tools 15.29.0 instalados.
- Projeto Vite + React 19 + TypeScript + Tailwind v4 criado e configurado.
- Firebase Auth (email/senha) com signup/login/logout funcionais + rotas protegidas.
- Firestore: rules (`firestore.rules`) e índices deployados em produção no projeto
  `mnance-v1` (banco Firestore criado, API habilitada).
- `.firebaserc` fixa o projeto padrão — `firebase deploy` funciona sem `--project`.
- `npm test` (4 testes Vitest), `npm run lint` (oxlint) e `npm run build` passam.

**M1 — Motor de cálculo (`core/`): concluído.**
- 10 módulos em `src/core/`, todos TS puro (zero import de React/Firebase, verificado):
  `compoundInterest`, `projection`, `goalTimeline`, `emergencyReserve`, `weightedReturn`,
  `assetReturnRates`, `zombieDetection`, `expenseClassification`, `movingAverage`, e o
  golden `precision.golden.test.ts`.
- `npm test`: 69 testes, 11 arquivos, todos verdes — inclui `precision.golden.test.ts`
  validando a métrica de sucesso do PRD (±2% vs. cálculo manual independente).
- `npm run lint` sem erros novos (só o warning pré-existente do M0 em `AuthContext.tsx`).
- Desvios conscientes do PRD registrados para resolver em milestones futuros:
  - `goalTimeline.ts`: quando a meta não é atingida no teto de 100 anos, retorna
    `patrimonyAtCap`/`shortfallAtCap` em vez de só `null` — a mensagem "convite à ação"
    (tom não-julgador, sugerindo ajustar aporte/prazo/meta) é responsabilidade da UI em
    **M4** (Dashboard/Radar).
  - `emergencyReserve.ts`: base de cálculo é `monthlyIncomeNet` (renda líquida), não
    `essentialMonthlyCost` como o PRD §4.1 descreve — raciocínio no comentário do arquivo.
    **M2** (Onboarding) precisa explicar esse raciocínio ao usuário na tela, não só
    mostrar o número.
  - `assetReturnRates.ts` é estático nesta versão. Buscar SELIC/CDI ao vivo (Banco Central,
    série SGS) com fallback estático é tarefa **separada, pós-M1**:
    `services/rateProviderService.ts` (fora de `core/`, que não pode ter I/O de rede).

**M2 — Onboarding (Feature #1): concluído.**
- Form multi-step (5 passos: meta, patrimônio, renda, pagamentos, revisão) em
  `components/Onboarding/`, validação manual em TypeScript (`hooks/useOnboarding.ts`,
  função pura `validateStep()`), sem libs de formulário adicionadas.
- `services/userService.ts` e `services/distributionService.ts` (novos) — únicas
  camadas que gravam/leem `users/{uid}` e `users/{uid}/distribution/current`.
- `AuthContext` estendido: expõe `currentUser: User | null` (documento Firestore) e
  `refreshCurrentUser()`, usado após o Onboarding salvar para o Dashboard já enxergar
  os dados novos sem reload.
- Reserva de emergência (`emergencyReserve.ts`, M1) exibida no Step 3 com tooltip
  explicando por que a base é a renda, não o custo essencial — resolve a pendência
  registrada no M1.
- Distribuição default: Nível 2 (`allocationModel`) mapeado do `riskProfile` escolhido
  (moderate → ALL_WEATHER); Nível 1 (essentials/freedom/investments) usa 50/30/20 como
  ponto de partida — **decisão não travada no plano original, revisar se o PRD define
  outro default**.
- Permite reedição: se `users/{uid}` já existe, o form pré-popula e o botão vira
  "Atualizar"; `onboardingCompletedAt` é regravado a cada salvamento (M4 decide como
  usar esse campo para diferenciar primeiro acesso).
- `npm test` (69 testes), `tsc --noEmit` e `npm run build` passam sem erros. `npm run
  lint` sem erros novos (2 warnings: 1 pré-existente do M0 em `AuthContext.tsx`, 1 novo
  do `setState` dentro de `useEffect` em `useOnboarding.ts` — necessário para
  pré-popular o form ao carregar o documento do Firestore).
- Verificação manual em navegador (signup → onboarding → Firestore → Dashboard) ainda
  pendente de execução pelo usuário.

**M3 — Portfólio (Feature #5): concluído.** *(registrado retroativamente — nunca havia
sido documentado aqui, embora já implementado e testado manualmente com sucesso antes
do M4 começar.)*
- `services/assetService.ts` (novo) — primeiro serviço do projeto a usar CRUD de
  coleção (`addDoc`/`getDocs`/`updateDoc`), padrão que `investments`/`installments`/
  `scenarios` vão reaproveitar. Sem índice composto: filtro/ordenação (`status`,
  `createdAt`) no cliente, poucos ativos por usuário.
- `hooks/usePortfolio.ts` (novo) — função pura `validateAssetForm()` + hook stateful
  expondo `assets`/`totalValue`/`weightedReturn` (via `core/weightedReturn.ts`).
  `portfolio.totalValue` passa a ser a fonte autoritativa de "patrimônio atual" em
  qualquer cálculo futuro — não `User.currentPatrimony` (que é só o snapshot estático
  do Onboarding). **M4 herda essa decisão.**
- Fluxo de "seed": ao abrir o Portfólio vazio com `currentPatrimony > 0`, oferece criar
  um ativo inicial com esse valor; aceitar ou dispensar marca
  `User.portfolioSeedDismissed = true` permanentemente (nunca reexibe).
- Soft-delete via `status: 'archived'` — sem tela de restauração nesta versão.
- `npm test`, `npm run lint`, `npm run build` sem erros. Verificação manual completa
  (seed, CRUD, arquivamento, totais) executada pelo usuário com sucesso.

**M4 — Radar de Patrimônio / Dashboard (Feature #2): concluído.**
- `components/Common/ProtectedRoute.tsx` — corrigido bug real: guardava só contra
  `!user` (Firebase Auth), nunca contra onboarding incompleto (`!currentUser`). Agora
  redireciona para `/onboarding` quando falta o documento Firestore, com `useLocation`
  para não criar loop quando já está lá.
- `hooks/useDashboard.ts` (novo) — função pura `calculateDashboardMetrics()` + hook
  stateful. **Desvio consciente do PRD §4.2** (mesmo padrão de `emergencyReserve.ts` em
  M1): "velocidade de crescimento" não usa média de aportes reais (não existe ledger de
  aportes até M15) — é um proxy derivado:
  `monthlyContribution = monthlyIncomeNet - essentialMonthlyCost`,
  `velocity = monthlyContribution + portfolio.totalValue * annualToMonthlyRate(weightedReturn)`.
- Reaproveita `core/goalTimeline.ts` (tempo até a meta, cenário base + boosted com
  aporte +20%) e `core/projection.ts` (série ano a ano do gráfico) sem qualquer
  alteração nesses módulos.
- Insight "+20% de aporte" é suprimido quando o aporte é zero/negativo, a meta já foi
  atingida, ou o resultado turbinado é numericamente idêntico ao base (evita sugestão
  vazia).
- `budgetAlert` (banner, não bloqueia o resto da tela) quando `essentialMonthlyCost >
  monthlyIncomeNet` — dispensável na sessão, sem persistência no Firestore (diferente do
  seed banner do M3, que é permanente).
- `components/Dashboard/ProjectionChart.tsx` — primeiro uso de Chart.js/react-chartjs-2
  no projeto (dependência já existia no `package.json` desde o M0, nunca usada).
- Mensagem "convite à ação" para meta inatingível dentro do teto de 100 anos reaproveita
  o texto já redigido na nota de produto do M1 (`core/goalTimeline.ts`) — não é frase
  nova.
- Fora de escopo (decisão explícita, não esquecimento): widget "Distribuição Ativa"
  (M5); comparação meta-original vs. tempo calculado (M6/Simulador); ledger real de
  aportes.
- `npm test` (95 testes, 13 arquivos, incluindo `hooks/__tests__/useDashboard.test.ts`
  com os casos de meta já atingida, aporte zero/negativo, patrimônio zero e boost
  numericamente idêntico ao base), `npm run lint` (sem warnings novos) e `npm run build`
  sem erros.
- Verificação manual em navegador (redirect de onboarding incompleto, stat blocks,
  banner de alerta, mensagens condicionais, gráfico) pendente de execução pelo usuário —
  dev server disponível em `http://localhost:5174` nesta sessão.

**M5 — Distribuição de Renda (Feature #13 + #7 embutida): concluído.**
- `types/distribution.ts` reescrito: Nível 1 vira 4 categorias (`essentialsPercent`/
  `educationPercent`/`leisurePercent`/`investmentsPercent`, default 55/10/10/25, fiel ao
  PRD §5 — substitui o schema simplificado de 3 categorias criado antecipadamente no M2).
  Nível 2 ganha `DistributionModelChoice = AllocationModelKey | 'CUSTOM'` +
  `customAllocation?: CustomAllocation`, preservado mesmo trocando de modelo (nunca é
  apagado ao voltar para um preset).
- `core/allocationModels.ts` — nova função pura `calculateModelExpectedReturn(model)`
  (Feature #7): deriva taxa média por classe do catálogo já existente
  (`assetReturnRates.ts`) e reaproveita `calculateWeightedReturn`, sem hardcodar taxa
  nova. Recomendação de Alocação **não virou página própria** — é o componente
  `AllocationModelPicker`, embutido na tela de Distribuição, conforme decisão
  arquitetural original.
- `services/distributionService.ts` — nova `updateDistribution()` (merge via
  `updateDoc`), usada porque Nível 1 e Nível 2 salvam em ações separadas; `setDistribution`
  (overwrite) continua exclusiva do Onboarding.
- `hooks/useDistribution.ts` (novo) — funções puras testáveis (`validateNivelUm`,
  `validateCustomAllocation`, `calculateDistributionAmounts`, `resolveAllocationModel`) +
  hook stateful. **Guard defensivo de runtime** (não é migração multiusuário): documento
  antigo do M2 sem `educationPercent`/`leisurePercent` é tratado como ausente e cai no
  default novo. Reserva de emergência sempre recalculada ao vivo via
  `calculateEmergencyReserve` — nunca lida de campo editável.
- `components/Distribution/`: `NivelUmForm.tsx`, `AllocationModelPicker.tsx` (cards de
  preset + "Personalizado", com `window.confirm` antes de trocar para longe de um modelo
  customizado — nunca apaga a customização salva) e `EmergencyReserveCard.tsx`
  (somente-leitura, sem nenhum input).
- `pages/Distribution.tsx` reescrito: compõe os três componentes + linha de status
  "retorno esperado X% a.a. — bate/não bate sua meta" via `core/goalTimeline.ts`.
- `hooks/useDashboard.ts` e `pages/Dashboard.tsx` — aditivo: compõe `useDistribution()` e
  exibe o card somente-leitura "💎 Distribuição Ativa" do mockup do PRD §4.2 (fora de
  escopo até o M5, conforme registrado no M4).
- `components/Onboarding/steps/Step5Review.tsx` atualizado para o novo schema de 4
  categorias (a cópia da "Regra 50/30/20 de Elizabeth Warren" foi removida — não
  correspondia mais aos percentuais reais 55/10/10/25 do PRD).
- `npm test` (110 testes, 14 arquivos, incluindo `hooks/__tests__/useDistribution.test.ts`
  e a extensão de `core/__tests__/allocationModels.test.ts` com
  `calculateModelExpectedReturn`), `npm run lint` (sem warnings novos) e `npm run build`
  sem erros.
- Verificação manual em navegador (documento legado, soma 100%/95%/105%/33,33×3, troca de
  modelo preservando customização, percentuais exatos dos 3 presets, card no Dashboard)
  pendente de execução pelo usuário — dev server disponível em `http://localhost:5173`
  nesta sessão.

**M5.5 — Fundação de UI/UX + Distribuição Avançada: concluído.**
- **Fase D (UI/UX):** primeiros componentes compartilhados do projeto, em
  `components/Common/`: `Button` (variant primary/secondary/danger, unifica os 3
  padrões de `disabled` que existiam espalhados), `Card`, `Alert` (variant
  info/success/warning/error, `role="alert"`), `FormField` (render-prop + `useId()`,
  conecta `aria-invalid`/`aria-describedby` — resolve labels sem `htmlFor` da auditoria),
  `EmptyState`, `LoadingState` (substitui 4 cópias de "Carregando..."). Token
  `--color-primary`/`--color-primary-hover` via `@theme` (Tailwind v4) em `index.css`.
- **Navegação — 1ª da história do app** (achado mais grave da auditoria: 10 de 12 rotas
  só eram alcançáveis digitando a URL): `components/Layout/navItems.ts` (PRIMARY_NAV +
  MORE_NAV, 1ª vez que `lucide-react` é usado — dependência ociosa desde o M0),
  `AppShell.tsx` (sidebar fixa no desktop listando as 9 rotas; barra inferior no mobile
  com 3 posições + "Mais"), `pages/More.tsx` (lista as 6 rotas ainda-stub). `App.tsx`
  envolve as rotas protegidas em `AppShell`, exceto `/onboarding` (sem nav — o usuário
  ainda não tem dados completos).
- **Migração mecânica** para os novos primitivos: `Login`/`Signup`, todo o fluxo de
  Onboarding, `Dashboard` + `BudgetAlertBanner`, `Portfolio` + `AssetForm` + `AssetList` +
  `SeedPatrimonyPrompt`. `BudgetAlertBanner` perdeu o prop `onDismiss` (nunca era passado
  por nenhum call site — dead code).
- **Modelo de dados — 2ª reescrita de `Distribution` em 2 milestones (M2→M5→M5.5),**
  motivada por 4 features priorizadas da planilha pessoal do usuário: Nível 1 vira um
  `PaydaySplit` de 5 categorias (nova: `companyCashPercent`, default **0%** para todo
  mundo — decisão corrigida em sessão para não piorar o default de quem não tem empresa)
  aplicado a 1 ou 2 dias de pagamento (`payday1Split`/`payday2Split` +
  `payday1IncomeSharePercent`); Nível 2 vira `investmentBuckets: InvestmentBucket[]`
  (objetivos nomeados, ex. "Casa + Carro 2031", cada um com seu `percentOfInvestments` e
  seu próprio `allocationModel`) em vez de um único modelo global.
- `services/distributionService.ts`: `getDefaultDistribution(riskProfile,
  hasSecondPayday)` ganhou o 2º parâmetro; `useOnboarding.ts` ajustado nos 2 pontos que
  chamam a função (Onboarding continua só coletando `payday1`/`payday2` — "quanto chega
  em cada dia" é configurado na tela de Distribuição, não reabre o M2).
- `hooks/useDistribution.ts` reescrito: `validateNivelUm` agora valida 5 campos;
  `calculateDistributionAmounts` muda de assinatura (lista de `{split,
  incomeShareFraction}[]`, agrega por pagamento); novas funções puras
  `validateInvestmentBuckets`, `calculateBlendedExpectedReturn` (reaproveita
  `calculateWeightedReturn`, lista vazia → 0, nunca NaN) e `calculateEssentialsComparison`.
  Guard de compatibilidade `resolveStoredDistribution` com 4 casos (formato novo; M5 flat
  sem 2º pagamento → converte em memória; M5 flat com 2º pagamento → impossível migrar
  parcialmente, cai no default novo; M2/corrompido/ausente → default novo) — nunca
  escreve a conversão de volta sozinho, só até o usuário salvar manualmente.
  `hasSecondPayday` deriva sempre de `currentUser.payday2`, nunca do documento salvo
  (protege contra `payday2Split` órfão se o usuário remover o 2º pagamento depois).
- `components/Distribution/`: `PaydaySplitFields.tsx` (novo, bloco reutilizável de 5
  inputs, usado 1 ou 2 vezes por `NivelUmForm.tsx` reescrito); `AllocationModelPicker.tsx`
  refatorado para componente 100% controlado (sem estado/botão próprio, `window.confirm`
  ao trocar de CUSTOM preservado); `InvestmentBucketsForm.tsx` (novo, piso de 1 objetivo,
  sem auto-rebalancear ao adicionar).
- **Nova subcoleção `users/{uid}/essentialExpenses/{itemId}`** (Feature da planilha:
  lista item a item comparada contra o orçado) — `types/essentialExpense.ts`,
  `services/essentialExpenseService.ts` (hard delete via `deleteDoc`, diferente do
  soft-delete de `assetService` — são linhas de orçamento recalculáveis, sem valor
  histórico), `hooks/useEssentialExpenses.ts`, e
  `components/Distribution/{EssentialExpenseForm,EssentialExpenseList,
  EssentialExpensesSection}.tsx`. Vive na tela de Distribuição, não em `/expenses`
  (reservada para a Feature #6/#9-11, M6.5+) — **atenção para não reaproveitar o nome da
  coleção `essentialExpenses` para outra finalidade quando M7 for implementado.**
  `firestore.rules` não mudou (regra genérica de subcoleção já cobre).
- `hooks/useDashboard.ts` + `pages/Dashboard.tsx`: `distributionSummary` passa a expor
  `amounts` (5 categorias em R$), `bucketCount` e `expectedReturn` (blended) — os
  percentuais deixaram de fazer sentido como resumo único desde que os 2 pagamentos podem
  ter splits diferentes. Card "💎 Distribuição Ativa" atualizado.
- `components/Onboarding/steps/Step5Review.tsx` reescrito: mostra 1 ou 2 blocos de
  pagamento + lista de `investmentBuckets` (sempre 1 no momento do onboarding).
- `npm test`: 128 testes, 14 arquivos (`useDistribution.test.ts` cresceu de 13 para 31
  casos: 5 `describe`s novos — `validateInvestmentBuckets`, `calculateBlendedExpectedReturn`
  (regressão vs. M5 confirmada), `resolveStoredDistribution` (os 4 casos de formato),
  `calculateEssentialsComparison` — e os existentes estendidos para o novo shape).
  `npm run lint` sem warnings novos além do padrão já existente (`set-state-in-effect` em
  hooks que pré-populam form a partir do Firestore). `npm run build` sem erros.
- Verificação manual em navegador (navegação mobile/desktop, formulários com `FormField`,
  onboarding com 1/2 pagamentos, edição de Nível 1/objetivos/despesas essenciais,
  documento legado M5, card do Dashboard) pendente de execução pelo usuário — dev server
  disponível em `http://localhost:5173` nesta sessão.

> **Lacuna de documentação:** o M5.6 (valor recebido por pagamento em R$ + Nível 2 explicado) está
> implementado e testado, mas **não tem entrada própria acima**; o M5.7 só chegou a um rascunho (ver abaixo).

**M5.8 · Fase 0 — Correções críticas do QA de 07/10/2026: concluída (sem commit até o usuário aprovar).**
Origem: pente fino de QA em navegador automatizado (persona "Rafael"), registrado em
`cenarios-de-teste.md` §17 (cenários 113–120) e no "Registro de Execução". O plano completo
(M5.8 → M5.10) está no plano de execução da sessão.
- **Bug "todo login cai no onboarding"** — `context/AuthContext.tsx`: o `loading` já era `false`
  desde a 1ª emissão do Firebase (`null`, sem sessão); no login, `user` chegava antes do
  documento `currentUser` e `ProtectedRoute` redirecionava para `/onboarding`. Agora cada emissão
  com usuário religa `loading` na mesma atualização e só desliga depois de `getUserDocument`
  (com guarda contra resposta atrasada de emissão antiga). `ProtectedRoute` mostra `LoadingState`
  em vez de `null`. `console.log` de depuração removidos.
- **Reeditar o onboarding não apaga mais a Distribuição** — `services/distributionService.ts`:
  nova `ensureDistribution` (só cria se não existe; se o 2º pagamento foi adicionado depois,
  acrescenta só o split dele). `useOnboarding.save` passa a usá-la no lugar de `setDistribution`.
- **Navegação enxuta** — só Radar, Distribuição, Portfólio e **Conta** (`/account`, nova
  `pages/Account.tsx`: nome, e-mail, "Editar onboarding" e **"Sair"**; no desktop "Conta" e "Sair"
  ficam no rodapé da sidebar). Removidos `MORE_NAV`/`ALL_NAV`, `pages/More.tsx` e as rotas de
  Simulador, Despesas, Parcelas, Agenda, Relatório e Configurações — **as páginas-stub continuam
  em `src/pages/`** para religar (rota em `App.tsx` + item em `navItems.ts`) quando cada feature
  for construída.
- **M5.7 parcial descartado:** apagados `types/fixedContribution.ts`,
  `services/fixedContributionService.ts`, `hooks/useFixedContributions.ts` e as funções
  `calculateMonthlyFlow`/`buildProjectionStreams` de `useDistribution.ts` (o aporte fixo agora vira
  atributo do **ativo**, M5.8 Fase 2). **Mantidos mas ainda não ligados a nenhuma tela:**
  `core/streamProjection.ts` (motor por fluxos, limpo: `simulateStreams`,
  `calculateGoalTimelineFromStreams`, `yearlySeries`), `core/inflation.ts` e `User.inflationRate?`.
  **O Radar ainda usa o aporte proxy `renda − custo essencial` e uma só taxa, sem inflação — a
  projeção segue otimista até a Fase 3.**
- Menores: `utils/formatPercent.ts` (vírgula decimal, "12,1%") em todos os pontos de exibição;
  `utils/generateId.ts` substitui `crypto.randomUUID` (que só existe em HTTPS/localhost e quebra o
  teste no celular via `http://<IP-local>`).
- `npm test`: **181 testes, 17 arquivos**; `tsc -b`, `oxlint` (só warnings antigos de
  `set-state-in-effect`) e `npm run build` sem erro. Verificado no navegador: cenários 113, 114, 115.

**M5.8 · Fase 1 — Distribuição enxuta + destino do saldo das essenciais: concluída (sem commit).**
- **Nível 2 saiu da tela** — em que investir é assunto do Portfólio e da futura tela Investimentos
  (M5.9). `Distribution` perdeu `investmentBuckets` (documentos antigos mantêm o campo, que é
  ignorado) e ganhou **`surplusInvestmentsPercent?: number`** (0–100; o resto vai para Lazer;
  **`undefined` = decisão pendente**, nada é roteado). Removidos `InvestmentBucket`, `validateInvestmentBuckets`,
  `calculateBlendedExpectedReturn`, `saveInvestmentBuckets`, `InvestmentBucketsForm.tsx` e o cartão
  "Retorno esperado / bate sua meta" (dependia dos objetivos; **volta na Fase 3**, calculado pelo
  mesmo motor do Radar). `getDefaultDistribution(hasSecondPayday)` e `ensureDistribution(uid,
  hasSecondPayday)` perderam o parâmetro `riskProfile`. `resolveStoredDistribution` ficou simples:
  tem `payday1Split` → usa; senão → default (**não converte mais o formato M5 "flat"**).
  Textos visíveis: "Nível 1 — Divisão da renda" → "Divisão da renda"; "Salvar Nível 1" → "Salvar
  divisão da renda".
- **Regra do saldo = política permanente, editável** — função pura `calculateMonthlyFlow({ amounts,
  essentialsReal, hasEssentialsList, surplusInvestmentsPercent })` em `hooks/useDistribution.ts` →
  `{ balance, surplus, deficit, surplusPending, surplusToInvestments, surplusToLeisure, investmentsPlan,
  leisureTotal }`. **`investmentsPlan` (fatia de Investimentos + saldo roteado) é o aporte mensal
  planejado — fonte única para o Radar (Fase 3), a tela Investimentos e o lembrete.** Sem lista de
  essenciais não há saldo (senão "real = 0" faria o orçamento inteiro virar saldo); saldo negativo não
  roteia nada; o saldo é arredondado a centavos (resíduo de ponto flutuante não vira "saldo").
- `useDistribution` agora **compõe `useEssentialExpenses`** (instância única, passada por props a
  `EssentialExpensesSection`; tipo `EssentialExpensesState`) e expõe `flow`, `essentialExpenses`,
  `hasEssentialsList`, `surplusInvestmentsPercent` e `saveSurplusRule`.
- Novos componentes: `SurplusDestinationCard` (modo escolha — "Investir tudo / Usar em lazer /
  Dividir" com atalhos 70/30·50/50·30/70, controle e prévia "antes → depois" — e modo resumo com
  **"Editar regra"** + Cancelar, sempre disponível depois de salva; estados: pendente, sem lista, sem
  saldo, saldo negativo) e `PlannedContributionCard`. Ordem da tela: divisão da renda → despesas
  essenciais → destino do saldo → reserva de emergência → aporte planejado.
- Radar: card "Distribuição Ativa" mostra Investimentos/Lazer **efetivos**, a nota do saldo roteado e,
  se pendente, o link "Decidir agora". **O tempo até a meta do Radar continua usando o aporte proxy
  `renda − custo essencial` — só muda na Fase 3.**
- `AllocationModelPicker`, `AllocationBar`, `AssetClassGlossary` e `validateCustomAllocation` /
  `resolveAllocationModel` **ficam sem uso** até a tela Investimentos (M5.9).
- `npm test`: **186 testes, 17 arquivos** (`useDistribution.test.ts` reescrito: sai bucket/blended, entram
  `calculateMonthlyFlow` e `validateSurplusPercent`); `tsc -b`, `oxlint` e build sem erro. Verificado no
  navegador: cenários 121–130 (`cenarios-de-teste.md` §18; a §14 do Nível 2 está marcada como superada).

**Próximo:** M5.8 Fases 2–3 (aporte programado por ativo + catálogo de retornos corrigido; motor de
projeção realista no Radar), depois M5.9 (tela Investimentos com check-in mensal) e M5.10 (push gratuito
via FCM + GitHub Actions). M6 — Simulador de Cenários (Feature #3) só depois.
