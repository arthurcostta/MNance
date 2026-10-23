import { useState } from 'react'
import {
  MAX_CUSTOM_CATEGORIES,
  validateCategoryName,
  type CustomCategory,
} from '../../core/distributionCategories'
import Button from '../Common/Button'
import FormField from '../Common/FormField'

interface CustomCategoriesEditorProps {
  categories: CustomCategory[]
  // Erro por id (vindo da validação ao salvar).
  errors: Record<string, string>
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}

// Categorias personalizadas da divisão da renda: renomear, remover (com confirmação) e criar.
// A validação dos nomes existentes acontece ao salvar a divisão; a criação valida na hora.
export default function CustomCategoriesEditor({
  categories,
  errors,
  onAdd,
  onRename,
  onRemove,
}: CustomCategoriesEditorProps) {
  const [newName, setNewName] = useState('')
  const [newError, setNewError] = useState<string | undefined>(undefined)
  const atLimit = categories.length >= MAX_CUSTOM_CATEGORIES

  const handleAdd = () => {
    const error = validateCategoryName(newName, categories.map((c) => c.name))
    if (error) {
      setNewError(error)
      return
    }
    onAdd(newName.trim())
    setNewName('')
    setNewError(undefined)
  }

  const handleRemove = (category: CustomCategory) => {
    if (!window.confirm(`Remover a categoria "${category.name}"? O percentual dela nos pagamentos será descartado.`)) return
    onRemove(category.id)
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-800">Suas categorias</h3>
        <p className="mt-1 text-sm text-gray-600">
          Além das 4 padrão, você pode criar até {MAX_CUSTOM_CATEGORIES} categorias (ex.: Viagens, Presentes).
          Cada uma recebe uma porcentagem em cada pagamento.
        </p>
      </div>

      {categories.length === 0 && <p className="text-sm text-gray-500">Nenhuma categoria personalizada ainda.</p>}

      {categories.map((category) => (
        <div key={category.id} className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="Nome da categoria" error={errors[category.id]}>
              {(fieldProps) => (
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => onRename(category.id, e.target.value)}
                  maxLength={60}
                  className="input-field"
                  {...fieldProps}
                />
              )}
            </FormField>
          </div>
          <Button variant="danger" size="sm" type="button" onClick={() => handleRemove(category)}>
            Remover
          </Button>
        </div>
      ))}

      {atLimit ? (
        <p className="text-sm text-gray-600">Você chegou ao limite de {MAX_CUSTOM_CATEGORIES} categorias.</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="Nova categoria" error={newError}>
              {(fieldProps) => (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setNewError(undefined)
                  }}
                  placeholder="Ex.: Viagens"
                  maxLength={60}
                  className="input-field"
                  {...fieldProps}
                />
              )}
            </FormField>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={handleAdd}>
            Adicionar
          </Button>
        </div>
      )}
    </section>
  )
}
