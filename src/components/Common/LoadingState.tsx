interface LoadingStateProps {
  label?: string
}

// Substitui as 4 cópias quase idênticas de um texto cinza "Carregando..." que existiam
// espalhadas antes do M5.5 (Dashboard, Portfolio, Distribution, OnboardingForm).
export default function LoadingState({ label = 'Carregando...' }: LoadingStateProps) {
  return <div className="p-4 text-sm text-gray-500">{label}</div>
}
