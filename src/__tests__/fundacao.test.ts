import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { TreinoDB, enfileirarSync } from '../db/schema'
import { traduzirErroAuth } from '../features/auth/authErrors'
import { detectarPlataforma } from '../features/onboarding/platform'

describe('Dexie', () => {
  let banco: TreinoDB

  afterEach(async () => {
    await banco.delete()
  })

  it('guarda e lê o perfil local', async () => {
    banco = new TreinoDB('teste-perfil')
    await banco.profiles.put({
      id: 'u1',
      nome: 'Ana',
      sexo: null,
      data_nascimento: null,
      altura_cm: null,
      compartilhar_progresso: false,
      created_at: '2026-11-26T12:00:00.000Z',
    })
    expect((await banco.profiles.get('u1'))?.nome).toBe('Ana')
  })

  it('enfileira item pendente na sync_outbox', async () => {
    banco = new TreinoDB('teste-outbox')
    const id = await enfileirarSync('profiles', 'update', { id: 'u1', nome: 'Ana' }, banco)
    const item = await banco.sync_outbox.get(id!)
    expect(item).toMatchObject({ tabela: 'profiles', status: 'pendente', tentativas: 0 })
    expect(await banco.sync_outbox.where('status').equals('pendente').count()).toBe(1)
  })
})

describe('traduzirErroAuth', () => {
  it('reconhece e-mail fora da lista autorizada', () => {
    expect(traduzirErroAuth('Database error saving new user')).toMatch(/não está autorizado/)
  })

  it('reconhece credenciais inválidas', () => {
    expect(traduzirErroAuth('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
  })

  it('reconhece falta de rede', () => {
    expect(traduzirErroAuth('Failed to fetch')).toMatch(/Sem conexão/)
  })

  it('tem mensagem genérica para o resto', () => {
    expect(traduzirErroAuth(undefined)).toBe('Não foi possível concluir. Tente de novo.')
  })
})

describe('detectarPlataforma', () => {
  it('iPhone', () => {
    expect(
      detectarPlataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'),
    ).toBe('ios')
  })

  it('iPad que se apresenta como Mac', () => {
    expect(detectarPlataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
  })

  it('Mac de verdade', () => {
    expect(detectarPlataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('outra')
  })

  it('Android', () => {
    expect(detectarPlataforma('Mozilla/5.0 (Linux; Android 15; Pixel 8) Chrome/131.0')).toBe('android')
  })
})
