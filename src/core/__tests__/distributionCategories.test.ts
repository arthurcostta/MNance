import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CATEGORY_LABELS,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_CATEGORIES,
  newCategoryId,
  validateCategories,
  validateCategoryName,
} from '../distributionCategories'

describe('validateCategoryName', () => {
  it('accepts a new name', () => {
    expect(validateCategoryName('Viagens', [])).toBeUndefined()
  })

  it('rejects an empty or blank name', () => {
    expect(validateCategoryName('', [])).toBeDefined()
    expect(validateCategoryName('   ', [])).toBeDefined()
  })

  it('rejects names longer than the limit', () => {
    expect(validateCategoryName('x'.repeat(MAX_CATEGORY_NAME_LENGTH + 1), [])).toBeDefined()
    expect(validateCategoryName('x'.repeat(MAX_CATEGORY_NAME_LENGTH), [])).toBeUndefined()
  })

  it('rejects the names of the default categories, ignoring case and spaces', () => {
    expect(validateCategoryName('lazer', [])).toBeDefined()
    expect(validateCategoryName('  Educação Pessoal ', [])).toBeDefined()
    expect(validateCategoryName(DEFAULT_CATEGORY_LABELS.investments, [])).toBeDefined()
  })

  it('rejects a name already used by another custom category, ignoring case', () => {
    expect(validateCategoryName('viagens', ['Viagens'])).toBeDefined()
    expect(validateCategoryName('Carro', ['Viagens'])).toBeUndefined()
  })
})

describe('validateCategories', () => {
  it('returns no errors when every name is unique', () => {
    expect(validateCategories([{ id: 'a', name: 'Viagens' }, { id: 'b', name: 'Carro' }])).toEqual({})
  })

  it('flags the repeated one, not the first', () => {
    const errors = validateCategories([
      { id: 'a', name: 'Viagens' },
      { id: 'b', name: 'viagens' },
    ])
    expect(errors.a).toBeUndefined()
    expect(errors.b).toBeDefined()
  })

  it('flags an empty name by id', () => {
    expect(validateCategories([{ id: 'a', name: '' }]).a).toBeDefined()
  })
})

describe('newCategoryId', () => {
  it('generates an id that is not already taken', () => {
    const existing = ['cat-1', 'cat-2']
    const id = newCategoryId(existing)
    expect(id.startsWith('cat-')).toBe(true)
    expect(existing).not.toContain(id)
  })
})

describe('limits', () => {
  it('allows up to five custom categories', () => {
    expect(MAX_CUSTOM_CATEGORIES).toBe(5)
  })
})
