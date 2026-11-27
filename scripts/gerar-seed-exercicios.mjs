// Gera a carga do catálogo (SQL idempotente) a partir de data/exercises.pt.json.
// Uso: node scripts/gerar-seed-exercicios.mjs [arquivo-de-saida.sql] [slug,slug,...]
// Sem argumentos grava supabase/migrations/0006_carga_exercicios.sql com o catálogo inteiro.
// O arquivo é idempotente (insert ... on conflict do update): rode de novo e
// crie uma migração nova sempre que o catálogo mudar.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = process.argv[2] ?? join(raiz, 'supabase/migrations/0006_carga_exercicios.sql')
const filtro = process.argv[3] ? new Set(process.argv[3].split(',')) : null
const exercicios = JSON.parse(readFileSync(join(raiz, 'data/exercises.pt.json'), 'utf8')).filter((e) => !filtro || filtro.has(e.slug))

const txt = (s) => (s == null ? 'null' : `'${String(s).replaceAll("'", "''")}'`)
const arr = (a) => (a.length ? `array[${a.map(txt).join(', ')}]::text[]` : `'{}'::text[]`)

const linhas = exercicios.map(
  (e) =>
    `(${[
      txt(e.slug),
      txt(e.nome_pt),
      txt(e.nome_en),
      txt(e.padrao_movimento),
      txt(e.musculo_primario),
      arr(e.musculos_secundarios),
      txt(e.equipamento),
      txt(e.nivel),
      txt(e.mecanica),
      e.unilateral ? 'true' : 'false',
      arr(e.instrucoes_pt),
      arr(e.imagens),
      arr(e.contraindicacoes),
    ].join(', ')})`,
)

const sql = `-- Gerado por scripts/gerar-seed-exercicios.mjs a partir de data/exercises.pt.json.
-- Não edite à mão. ${exercicios.length} exercícios.
insert into public.exercises (id, nome_pt, nome_en, padrao_movimento, musculo_primario,
  musculos_secundarios, equipamento, nivel, mecanica, unilateral, instrucoes_pt, imagens, contraindicacoes)
values
${linhas.join(',\n')}
on conflict (id) do update set
  nome_pt = excluded.nome_pt, nome_en = excluded.nome_en,
  padrao_movimento = excluded.padrao_movimento, musculo_primario = excluded.musculo_primario,
  musculos_secundarios = excluded.musculos_secundarios, equipamento = excluded.equipamento,
  nivel = excluded.nivel, mecanica = excluded.mecanica, unilateral = excluded.unilateral,
  instrucoes_pt = excluded.instrucoes_pt, imagens = excluded.imagens,
  contraindicacoes = excluded.contraindicacoes;
`

writeFileSync(saida, sql)
console.log(`${exercicios.length} exercícios → ${saida} (${sql.length} bytes)`)
