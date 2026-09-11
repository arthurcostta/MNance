import { describe, expect, it } from 'vitest'
import { calculateEmergencyReserve } from '../emergencyReserve'

describe('calculateEmergencyReserve', () => {
  it('calcula mínima (6x) e segura (12x) sobre a renda líquida mensal, não o custo essencial', () => {
    const result = calculateEmergencyReserve({ monthlyIncomeNet: 5000 })

    expect(result.minimumReserve).toBe(30000)
    expect(result.safeReserve).toBe(60000)
  })

  it('renda zero: reservas zeradas, sem erro', () => {
    const result = calculateEmergencyReserve({ monthlyIncomeNet: 0 })

    expect(result.minimumReserve).toBe(0)
    expect(result.safeReserve).toBe(0)
  })

  it('reserva segura é sempre o dobro da mínima', () => {
    const result = calculateEmergencyReserve({ monthlyIncomeNet: 3333.33 })

    expect(result.safeReserve).toBeCloseTo(result.minimumReserve * 2, 6)
  })
})
