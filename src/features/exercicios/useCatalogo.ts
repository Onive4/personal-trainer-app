import { useEffect, useState } from 'react'
import type { Exercicio } from '../../engine/catalogo'

// Carregado sob demanda (fica num arquivo separado do app) e guardado na memória.
// O service worker deixa o arquivo em cache: funciona offline.
let cache: Exercicio[] | null = null
let pedido: Promise<Exercicio[]> | null = null

function carregar(): Promise<Exercicio[]> {
  pedido ??= import('../../../data/exercises.pt.json').then((m) => {
    cache = m.default as Exercicio[]
    return cache
  })
  return pedido
}

export function useCatalogo(): Exercicio[] | null {
  const [catalogo, setCatalogo] = useState(cache)
  useEffect(() => {
    if (!cache) void carregar().then(setCatalogo)
  }, [])
  return catalogo
}
