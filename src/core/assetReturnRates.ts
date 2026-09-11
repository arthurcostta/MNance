// Catálogo default de taxas de retorno por instrumento — PRD §4.2. Mesmo padrão de dado
// puro que allocationModels.ts: o usuário pode sobrescrever a taxa por ativo na Feature #5
// (Portfólio, M3); isto aqui é só o valor default sugerido no cadastro.
//
// AssetClass é um tipo LOCAL duplicado de types/asset.ts (não importado de lá): aquele
// arquivo importa `Timestamp` do Firestore, e core/ nunca pode depender de Firebase
// (regra CLAUDE.md #2 — precisa ficar portável para Cloud Function no futuro).
//
// Decisão sobre taxas dinâmicas: só SELIC/CDI têm API pública gratuita e confiável (série
// SGS do Banco Central) — os demais indicadores são premissas de retorno de longo prazo,
// não um número consultável ao vivo. Buscar SELIC/CDI em tempo real é tarefa separada, pós-M1,
// em services/rateProviderService.ts (fora de core/, que não pode ter I/O de rede), com
// fallback para os valores estáticos deste catálogo caso a busca falhe (essencial num PWA
// offline-first).

export type AssetClass = 'stocks' | 'bonds' | 'alternatives' | 'cash'

export interface AssetReturnRate {
  label: string
  assetClass: AssetClass
  annualRate: number
}

export type AssetInstrumentKey =
  | 'TESOURO_SELIC'
  | 'CDB_LCI_LCA'
  | 'ACOES_IBOVESPA'
  | 'ETF_INTERNACIONAL'
  | 'FII'
  | 'BITCOIN'
  | 'PREVIDENCIA'
  | 'CAIXA'

export const ASSET_RETURN_RATES: Record<AssetInstrumentKey, AssetReturnRate> = {
  TESOURO_SELIC: { label: 'Tesouro Selic', assetClass: 'bonds', annualRate: 0.115 },
  CDB_LCI_LCA: { label: 'CDB / LCI / LCA', assetClass: 'bonds', annualRate: 0.11 },
  ACOES_IBOVESPA: { label: 'Ações (Ibovespa)', assetClass: 'stocks', annualRate: 0.08 },
  ETF_INTERNACIONAL: {
    label: 'ETFs Internacionais',
    assetClass: 'stocks',
    annualRate: 0.105,
  },
  FII: { label: 'FIIs', assetClass: 'alternatives', annualRate: 0.105 },
  BITCOIN: { label: 'Bitcoin', assetClass: 'alternatives', annualRate: 0.45 },
  PREVIDENCIA: { label: 'Previdência Privada', assetClass: 'bonds', annualRate: 0.06 },
  CAIXA: { label: 'Caixa', assetClass: 'cash', annualRate: 0 },
}
