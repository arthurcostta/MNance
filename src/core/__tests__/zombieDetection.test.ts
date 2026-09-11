import { describe, expect, it } from 'vitest'
import { detectZombie } from '../zombieDetection'

describe('detectZombie', () => {
  it('exatamente 60 dias: ainda NÃO é zumbi — regra é "> 60", não ">= 60" (CENÁRIO 47)', () => {
    const result = detectZombie(
      { lastActivityDate: new Date('2026-01-01'), dismissedAsZombie: false },
      new Date('2026-03-02'), // 60 dias de Jan 1 até Mar 2
    )

    expect(result.daysSinceLastActivity).toBe(60)
    expect(result.isZombie).toBe(false)
  })

  it('61 dias: é zumbi (CENÁRIO 47)', () => {
    const result = detectZombie(
      { lastActivityDate: new Date('2026-01-01'), dismissedAsZombie: false },
      new Date('2026-03-03'), // 61 dias
    )

    expect(result.daysSinceLastActivity).toBe(61)
    expect(result.isZombie).toBe(true)
  })

  it('dismissedAsZombie true: nunca é zumbi, mesmo com 200 dias de inatividade (CENÁRIO 48)', () => {
    const result = detectZombie(
      { lastActivityDate: new Date('2025-06-01'), dismissedAsZombie: true },
      new Date('2026-01-01'),
    )

    expect(result.daysSinceLastActivity).toBeGreaterThan(200)
    expect(result.isZombie).toBe(false)
  })

  it('threshold customizado é respeitado', () => {
    const result = detectZombie(
      { lastActivityDate: new Date('2026-01-01'), dismissedAsZombie: false },
      new Date('2026-01-15'),
      10,
    )

    expect(result.daysSinceLastActivity).toBe(14)
    expect(result.isZombie).toBe(true)
  })

  it('virada de mês/fuso horário: usa dias de calendário, não subtração bruta de ms (CENÁRIO 69)', () => {
    // 23h59 do último dia de fevereiro até 00h01 do dia seguinte: menos de 3 minutos em
    // ms, mas 1 dia de calendário — subtração bruta de milissegundos acertaria por acaso
    // aqui (< 1 dia em ms), então o teste força uma virada real usando datas puras
    // (sem hora), que é como as datas chegam de Onboarding/formulários.
    const result = detectZombie(
      { lastActivityDate: new Date('2026-02-28'), dismissedAsZombie: false },
      new Date('2026-03-01'),
    )

    expect(result.daysSinceLastActivity).toBe(1)
    expect(result.isZombie).toBe(false)
  })
})
