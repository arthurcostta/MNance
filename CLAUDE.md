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

**Próximo:** M3 — Feature #5 Portfólio (CRUD de ativos, soft-delete via `status`).
