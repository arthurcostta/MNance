// Categorias da divisão da renda (TS puro). As 4 padrão existem para todos os usuários; as
// personalizadas são criadas por cada um (ex.: "Caixa da Empresa", "Viagens").

// Fonte única dos rótulos das categorias padrão. As chaves internas (essentialsPercent etc.) não mudam.
export const DEFAULT_CATEGORY_LABELS = {
  essentials: 'Despesas',
  education: 'Educação Pessoal',
  leisure: 'Lazer',
  investments: 'Investimentos',
} as const

export const MAX_CUSTOM_CATEGORIES = 5
export const MAX_CATEGORY_NAME_LENGTH = 30

// Id fixo da categoria que preserva o antigo "Caixa da Empresa" de quem já tinha esse valor.
export const LEGACY_COMPANY_CASH_ID = 'caixa-da-empresa'
export const LEGACY_COMPANY_CASH_NAME = 'Caixa da Empresa'

export interface CustomCategory {
  id: string
  name: string
}

const normalize = (text: string) => text.trim().toLocaleLowerCase('pt-BR')

// Nome válido: 1 a 30 caracteres, sem repetir uma categoria padrão ou outra personalizada (sem diferenciar maiúsculas).
export function validateCategoryName(name: string, takenNames: string[]): string | undefined {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Dê um nome à categoria.'
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return `O nome pode ter até ${MAX_CATEGORY_NAME_LENGTH} caracteres.`
  }
  const key = normalize(trimmed)
  if (Object.values(DEFAULT_CATEGORY_LABELS).some((label) => normalize(label) === key)) {
    return 'Esse nome já é uma categoria padrão.'
  }
  if (takenNames.some((taken) => normalize(taken) === key)) {
    return 'Já existe uma categoria com esse nome.'
  }
  return undefined
}

// Valida os nomes de todas as personalizadas de uma vez. Retorna erro por id (vazio = tudo certo).
// Em nomes repetidos, o erro vai para a segunda ocorrência: a primeira continua válida.
export function validateCategories(categories: CustomCategory[]): Record<string, string> {
  const errors: Record<string, string> = {}
  categories.forEach((category, index) => {
    const earlier = categories.slice(0, index).map((other) => other.name)
    const error = validateCategoryName(category.name, earlier)
    if (error) errors[category.id] = error
  })
  return errors
}

export function newCategoryId(existingIds: string[]): string {
  let id: string
  do {
    id = `cat-${Math.random().toString(36).slice(2, 10)}`
  } while (existingIds.includes(id))
  return id
}
