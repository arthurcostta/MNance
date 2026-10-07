// Id local para itens que ainda não passaram pelo Firestore (ex.: objetivos de investimento
// criados na tela). Não usa crypto.randomUUID() de propósito: ele só existe em contexto seguro
// (HTTPS ou localhost) e lança erro em http://<IP-local>:5173 — justamente o fluxo documentado
// de teste no celular (npm run dev -- --host). Não é usado para segurança, só para chave de lista.
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
