// Bloco 5 da curadoria: aeróbicos + exercícios para cobrir lacunas do catálogo.
// Fonte: yuhonas/free-exercise-db (Unlicense). Nomes e instruções: redação própria.
// Uso: node scripts/curadoria/c5_ampliacao.mjs  (idempotente: substitui pelo slug)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..')
const img = (slug) => [0, 1].map((i) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/${i}.jpg`)

// [slug, nome_pt, nome_en, padrao, musculo, secundarios, equipamento, nivel, mecanica, unilateral, instrucoes, contraindicacoes]
const NOVOS = [
  // ---------------- Aeróbicos ----------------
  ['Walking_Treadmill', 'Caminhada na esteira', 'Walking, Treadmill', 'aerobico', 'cardio', [], 'esteira', 'iniciante', null, false,
    ['Comece devagar por 2 a 3 minutos para aquecer.', 'Ande em ritmo firme, em que ainda dá para conversar.', 'Inclinar um pouco a esteira aumenta o esforço sem precisar correr.'], []],
  ['Jogging_Treadmill', 'Trote na esteira', 'Jogging, Treadmill', 'aerobico', 'cardio', [], 'esteira', 'iniciante', null, false,
    ['Aqueça caminhando por 3 minutos.', 'Trote leve, passos curtos, pisando embaixo do corpo.', 'Se perder o fôlego para falar, volte a caminhar um pouco.'], ['sem_impacto']],
  ['Running_Treadmill', 'Corrida na esteira', 'Running, Treadmill', 'aerobico', 'cardio', [], 'esteira', 'intermediario', null, false,
    ['Aqueça caminhando e depois trotando.', 'Corra em ritmo que consiga manter pelo tempo combinado.', 'Termine com 2 a 3 minutos caminhando.'], ['sem_impacto']],
  ['Bicycling_Stationary', 'Bicicleta ergométrica', 'Bicycling, Stationary', 'aerobico', 'cardio', [], 'bicicleta_ergometrica', 'iniciante', null, false,
    ['Ajuste o banco: com o pedal embaixo, o joelho fica quase esticado.', 'Pedale em ritmo constante, com carga que dê para conversar.', 'Mantenha as costas retas e os ombros soltos.'], []],
  ['Recumbent_Bike', 'Bicicleta horizontal', 'Recumbent Bike', 'aerobico', 'cardio', [], 'bicicleta_horizontal', 'iniciante', null, false,
    ['Encoste bem as costas no banco.', 'Ajuste a distância para o joelho quase esticar no fim da pedalada.', 'Boa opção para quem sente a lombar ou os joelhos.'], []],
  ['Elliptical_Trainer', 'Elíptico (transport)', 'Elliptical Trainer', 'aerobico', 'cardio', [], 'eliptico', 'iniciante', null, false,
    ['Pés apoiados por inteiro nos pedais o tempo todo.', 'Use os braços junto com as pernas.', 'Movimento sem impacto: bom para joelhos e tornozelos.'], []],
  ['Stairmaster', 'Escada ergométrica', 'Stairmaster', 'aerobico', 'cardio', [], 'escada_ergometrica', 'intermediario', null, false,
    ['Suba apoiando o pé inteiro no degrau.', 'Segure de leve no apoio, sem jogar o peso do corpo nos braços.', 'Comece devagar: cansa mais rápido do que parece.'], ['flexao_joelho_limitada']],
  ['Rowing_Stationary', 'Remo ergométrico', 'Rowing, Stationary', 'aerobico', 'cardio', [], 'remo_ergometrico', 'intermediario', null, false,
    ['Empurre primeiro com as pernas, depois puxe com os braços.', 'Coluna reta o tempo todo, sem arredondar as costas.', 'Volte na ordem contrária: braços, tronco, pernas.'], ['sem_flexao_lombar_carregada']],
  ['Rope_Jumping', 'Pular corda', 'Rope Jumping', 'aerobico', 'cardio', [], 'corda_pular', 'intermediario', null, false,
    ['Saltos baixos, na ponta dos pés.', 'Gire a corda com os punhos, não com os braços inteiros.', 'Faça blocos curtos com pausas, se precisar.'], ['sem_impacto']],
  ['Trail_Running_Walking', 'Caminhada ao ar livre', 'Trail Running/Walking', 'aerobico', 'cardio', [], 'peso_corporal', 'iniciante', null, false,
    ['Caminhe em ritmo firme, em que ainda dá para conversar.', 'Tênis confortável e terreno plano no começo.', 'Vale em qualquer lugar: rua, parque ou a pista da academia.'], []],

  // ---------------- Peito ----------------
  ['Leverage_Chest_Press', 'Supino articulado na máquina', 'Leverage Chest Press', 'empurrar_horizontal', 'peito', ['ombros', 'triceps'], 'maquina_supino', 'iniciante', 'composto', false,
    ['Ajuste o banco para as pegadas ficarem na altura do meio do peito.', 'Empurre até quase esticar os braços, sem travar os cotovelos.', 'Volte devagar até sentir o peito alongar.'], []],
  ['Smith_Machine_Incline_Bench_Press', 'Supino inclinado no Smith', 'Smith Machine Incline Bench Press', 'empurrar_horizontal', 'peito', ['ombros', 'triceps'], 'smith', 'iniciante', 'composto', false,
    ['Banco inclinado entre 30 e 45 graus, barra alinhada com a parte de cima do peito.', 'Desça a barra até perto do peito, cotovelos um pouco abaixo da linha dos ombros.', 'Empurre para cima sem tirar as costas do banco.'], ['evitar_amplitude_maxima_ombro']],
  ['Standing_Cable_Chest_Press', 'Supino em pé no cabo', 'Standing Cable Chest Press', 'empurrar_horizontal', 'peito', ['ombros', 'triceps'], 'crossover', 'iniciante', 'composto', false,
    ['Fique de costas para o aparelho, um pé à frente do outro.', 'Empurre as pegadas para a frente, na altura do peito.', 'Volte controlando, sem deixar os cotovelos passarem muito do tronco.'], []],
  ['Incline_Cable_Flye', 'Crucifixo inclinado no cabo', 'Incline Cable Flye', 'isolamento', 'peito', ['ombros'], 'crossover', 'intermediario', 'isolado', false,
    ['Banco inclinado entre as duas polias baixas.', 'Braços levemente dobrados, abra até sentir o peito alongar.', 'Feche os braços em arco, como se abraçasse uma árvore.'], ['evitar_amplitude_maxima_ombro']],

  // ---------------- Costas ----------------
  ['Kneeling_High_Pulley_Row', 'Puxada ajoelhada na polia alta', 'Kneeling High Pulley Row', 'puxar_vertical', 'dorsais', ['biceps', 'dorsal_medio'], 'polia_alta', 'iniciante', 'composto', false,
    ['Ajoelhe de frente para a polia alta, tronco reto.', 'Puxe a barra em direção ao peito, levando os cotovelos para baixo.', 'Volte devagar até os braços esticarem.'], []],
  ['Full_Range-Of-Motion_Lat_Pulldown', 'Puxada unilateral com amplitude completa', 'Full Range-Of-Motion Lat Pulldown', 'puxar_vertical', 'dorsais', ['biceps', 'dorsal_medio', 'ombros'], 'polia_alta', 'intermediario', 'composto', true,
    ['Sentado, segure a pegada com uma mão só.', 'Puxe levando o cotovelo para baixo e para trás, junto ao corpo.', 'Deixe o braço subir todo na volta, sentindo as costas alongarem.'], []],
  ['Bent_Over_Two-Dumbbell_Row_With_Palms_In', 'Remada curvada com halteres pegada neutra', 'Bent Over Two-Dumbbell Row With Palms In', 'puxar_horizontal', 'dorsal_medio', ['biceps', 'dorsais'], 'halteres', 'iniciante', 'composto', false,
    ['Incline o tronco à frente com a coluna reta e os joelhos destravados.', 'Palmas viradas uma para a outra, puxe os halteres até a cintura.', 'Desça devagar sem arredondar as costas.'], ['sem_flexao_lombar_carregada']],
  ['Incline_Bench_Pull', 'Remada deitado no banco inclinado', 'Incline Bench Pull', 'puxar_horizontal', 'dorsal_medio', ['dorsais', 'ombros'], 'banco_inclinado_halteres', 'iniciante', 'composto', false,
    ['Deite de bruços no banco inclinado, peito apoiado.', 'Puxe os pesos subindo os cotovelos e apertando as escápulas.', 'Com o peito apoiado, a lombar fica protegida.'], []],

  // ---------------- Ombros ----------------
  ['Seated_Cable_Shoulder_Press', 'Desenvolvimento sentado no cabo', 'Seated Cable Shoulder Press', 'empurrar_vertical', 'ombros', ['triceps'], 'polia_baixa', 'iniciante', 'composto', false,
    ['Sente no banco entre as polias baixas, costas apoiadas.', 'Empurre as pegadas para cima até quase esticar os braços.', 'Desça até as mãos ficarem na altura das orelhas.'], ['sem_desenvolvimento_acima_cabeca']],
  ['Smith_Machine_Overhead_Shoulder_Press', 'Desenvolvimento no Smith', 'Smith Machine Overhead Shoulder Press', 'empurrar_vertical', 'ombros', ['triceps'], 'smith', 'iniciante', 'composto', false,
    ['Sente no banco com encosto, barra à frente do rosto.', 'Empurre para cima sem arquear a lombar.', 'Desça até a altura do queixo.'], ['sem_desenvolvimento_acima_cabeca']],
  ['Front_Two-Dumbbell_Raise', 'Elevação frontal com dois halteres', 'Front Two-Dumbbell Raise', 'isolamento', 'ombros', [], 'halteres', 'iniciante', 'isolado', false,
    ['Em pé, halteres na frente das coxas.', 'Suba os braços à frente até a altura dos ombros.', 'Desça devagar, sem balançar o corpo.'], ['evitar_amplitude_maxima_ombro']],
  ['Cable_Rope_Rear-Delt_Rows', 'Remada alta na corda para posterior de ombro', 'Cable Rope Rear-Delt Rows', 'isolamento', 'ombros', ['biceps', 'dorsal_medio'], 'polia_alta', 'iniciante', 'isolado', false,
    ['Corda na polia na altura do rosto.', 'Puxe abrindo as mãos para os lados do rosto, cotovelos altos.', 'Ajuda a postura e equilibra o tanto de supino.'], []],
  ['External_Rotation_with_Cable', 'Rotação externa no cabo', 'External Rotation with Cable', 'isolamento', 'ombros', [], 'polia_media', 'iniciante', 'isolado', true,
    ['Polia na altura do cotovelo, cotovelo colado ao corpo e dobrado a 90 graus.', 'Gire o antebraço para fora, sem afastar o cotovelo.', 'Carga leve: o objetivo é fortalecer e proteger o ombro.'], []],

  // ---------------- Pernas ----------------
  ['Plie_Dumbbell_Squat', 'Agachamento sumô com halter', 'Plie Dumbbell Squat', 'agachamento', 'quadriceps', ['adutores', 'gluteos', 'posterior_de_coxa'], 'halteres', 'iniciante', 'composto', false,
    ['Pés bem afastados e virados para fora, halter segurado entre as pernas.', 'Desça mantendo os joelhos na direção dos pés e o tronco alto.', 'Suba empurrando o chão. Trabalha também a parte interna da coxa.'], []],
  ['Narrow_Stance_Hack_Squats', 'Hack com pés juntos', 'Narrow Stance Hack Squats', 'agachamento', 'quadriceps', ['gluteos', 'posterior_de_coxa'], 'maquina_hack', 'intermediario', 'composto', false,
    ['Costas bem apoiadas, pés mais próximos na plataforma.', 'Desça controlando até onde conseguir sem tirar a lombar do encosto.', 'Suba sem travar os joelhos.'], ['flexao_joelho_limitada']],
  ['Dumbbell_Squat_To_A_Bench', 'Agachamento com halteres até o banco', 'Dumbbell Squat To A Bench', 'agachamento', 'quadriceps', ['gluteos', 'posterior_de_coxa'], 'halteres_banco', 'iniciante', 'composto', false,
    ['Banco atrás de você, halteres ao lado do corpo.', 'Sente para trás até encostar de leve no banco.', 'Suba sem jogar o corpo à frente. O banco ensina a profundidade certa.'], []],
  ['Barbell_Lunge', 'Afundo com barra', 'Barbell Lunge', 'unilateral_perna', 'quadriceps', ['gluteos', 'posterior_de_coxa'], 'barra_rack', 'intermediario', 'composto', true,
    ['Barra apoiada nas costas, dê um passo à frente.', 'Desça até os dois joelhos ficarem perto de 90 graus.', 'Empurre com a perna da frente para voltar.'], ['sem_carga_axial', 'flexao_joelho_limitada']],
  ['Smith_Machine_Stiff-Legged_Deadlift', 'Stiff no Smith', 'Smith Machine Stiff-Legged Deadlift', 'dobradica_quadril', 'posterior_de_coxa', ['gluteos', 'lombar'], 'smith', 'iniciante', 'composto', false,
    ['Joelhos levemente dobrados, barra junto às coxas.', 'Leve o quadril para trás e desça a barra rente às pernas, coluna reta.', 'Suba apertando os glúteos.'], ['sem_flexao_lombar_carregada']],
  ['Band_Hip_Adductions', 'Adução de quadril com elástico', 'Band Hip Adductions', 'isolamento', 'adutores', [], 'elastico', 'iniciante', 'isolado', true,
    ['Prenda o elástico de lado e passe-o no tornozelo de dentro.', 'Puxe a perna para dentro, cruzando à frente da outra.', 'Volte devagar.'], []],
  ['Dumbbell_Seated_One-Leg_Calf_Raise', 'Panturrilha sentado com halter', 'Dumbbell Seated One-Leg Calf Raise', 'isolamento', 'panturrilha', [], 'halteres_banco', 'iniciante', 'isolado', true,
    ['Sentado, ponta do pé num degrau e o halter sobre o joelho.', 'Suba o calcanhar o mais alto que conseguir.', 'Desça até alongar bem a panturrilha.'], []],
  ['Barbell_Seated_Calf_Raise', 'Panturrilha sentado com barra', 'Barbell Seated Calf Raise', 'isolamento', 'panturrilha', [], 'barra_banco', 'iniciante', 'isolado', false,
    ['Sentado, barra apoiada sobre os joelhos com uma toalha.', 'Pontas dos pés num apoio, suba os calcanhares.', 'Desça devagar até alongar.'], []],

  // ---------------- Braços e antebraço ----------------
  ['Machine_Preacher_Curls', 'Rosca Scott na máquina', 'Machine Preacher Curls', 'isolamento', 'biceps', [], 'maquina_rosca', 'iniciante', 'isolado', false,
    ['Axilas encostadas no apoio, braços esticados.', 'Dobre os cotovelos subindo a pegada até perto dos ombros.', 'Desça devagar sem deixar o peso cair.'], []],
  ['Seated_Dumbbell_Curl', 'Rosca sentado com halteres', 'Seated Dumbbell Curl', 'isolamento', 'biceps', [], 'banco_halteres', 'iniciante', 'isolado', false,
    ['Sentado, costas retas, halteres ao lado do corpo.', 'Suba os halteres girando as palmas para cima.', 'Sentado fica mais difícil roubar com o tronco.'], []],
  ['Alternate_Hammer_Curl', 'Rosca martelo alternada', 'Alternate Hammer Curl', 'isolamento', 'biceps', ['antebraco'], 'halteres', 'iniciante', 'isolado', true,
    ['Palmas viradas para o corpo, como quem segura um martelo.', 'Suba um braço de cada vez, cotovelo parado ao lado do corpo.', 'Desça controlando antes de trocar de braço.'], []],
  ['Two-Arm_Dumbbell_Preacher_Curl', 'Rosca Scott com halteres', 'Two-Arm Dumbbell Preacher Curl', 'isolamento', 'biceps', [], 'banco_scott', 'iniciante', 'isolado', false,
    ['Braços apoiados no banco Scott, um halter em cada mão.', 'Suba os halteres sem tirar os braços do apoio.', 'Desça até quase esticar, sem travar o cotovelo.'], []],
  ['Triceps_Overhead_Extension_with_Rope', 'Tríceps francês na corda (em pé)', 'Triceps Overhead Extension with Rope', 'isolamento', 'triceps', [], 'polia_baixa', 'iniciante', 'isolado', false,
    ['De costas para a polia, corda atrás da cabeça.', 'Estique os braços para a frente e para cima, cotovelos apontando à frente.', 'Volte devagar até sentir o tríceps alongar.'], ['evitar_amplitude_maxima_ombro']],
  ['Cable_One_Arm_Tricep_Extension', 'Tríceps unilateral na polia', 'Cable One Arm Tricep Extension', 'isolamento', 'triceps', [], 'polia_alta', 'iniciante', 'isolado', true,
    ['Segure a pegada com uma mão, cotovelo colado ao corpo.', 'Empurre para baixo até esticar o braço.', 'Suba só até o antebraço passar da horizontal.'], []],
  ['Standing_Dumbbell_Triceps_Extension', 'Tríceps francês com halter', 'Standing Dumbbell Triceps Extension', 'isolamento', 'triceps', [], 'halteres', 'iniciante', 'isolado', false,
    ['Segure um halter com as duas mãos acima da cabeça.', 'Dobre os cotovelos descendo o halter atrás da cabeça.', 'Estique de volta mantendo os cotovelos apontados para cima.'], ['sem_desenvolvimento_acima_cabeca', 'evitar_amplitude_maxima_ombro']],
  ['Smith_Machine_Close-Grip_Bench_Press', 'Supino fechado no Smith', 'Smith Machine Close-Grip Bench Press', 'empurrar_horizontal', 'triceps', ['peito', 'ombros'], 'smith', 'iniciante', 'composto', false,
    ['Mãos na largura dos ombros, cotovelos perto do corpo.', 'Desça a barra até a parte de baixo do peito.', 'Empurre esticando os braços.'], ['sem_extensao_punho']],
  ['Seated_Dumbbell_Palms-Up_Wrist_Curl', 'Flexão de punho com halteres', 'Seated Dumbbell Palms-Up Wrist Curl', 'isolamento', 'antebraco', [], 'halteres_banco', 'iniciante', 'isolado', false,
    ['Antebraços apoiados nas coxas, palmas para cima.', 'Dobre só o punho, subindo o halter.', 'Desça devagar. Movimento curto.'], ['sem_extensao_punho']],
  ['Seated_Dumbbell_Palms-Down_Wrist_Curl', 'Extensão de punho com halteres', 'Seated Dumbbell Palms-Down Wrist Curl', 'isolamento', 'antebraco', [], 'halteres_banco', 'iniciante', 'isolado', false,
    ['Antebraços apoiados nas coxas, palmas para baixo.', 'Suba as costas da mão dobrando só o punho.', 'Carga leve, movimento controlado.'], ['sem_extensao_punho']],
  ['Cable_Wrist_Curl', 'Flexão de punho na polia', 'Cable Wrist Curl', 'isolamento', 'antebraco', [], 'polia_baixa', 'iniciante', 'isolado', false,
    ['Ajoelhado ou sentado, antebraços apoiados, palmas para cima.', 'Puxe a barra dobrando o punho.', 'Volte devagar.'], ['sem_extensao_punho']],

  // ---------------- Abdômen ----------------
  ['Rope_Crunch', 'Abdominal na corda (ajoelhado)', 'Rope Crunch', 'flexao_tronco', 'abdomen', [], 'polia_alta', 'iniciante', 'isolado', false,
    ['Ajoelhado de frente para a polia, corda junto à cabeça.', 'Enrole o tronco para baixo, levando os cotovelos aos joelhos.', 'O quadril fica parado; quem mexe é o abdômen.'], ['sem_flexao_lombar_carregada']],
  ['Cross-Body_Crunch', 'Abdominal cruzado', 'Cross-Body Crunch', 'flexao_tronco', 'abdomen', [], 'peso_corporal', 'iniciante', 'isolado', false,
    ['Deitado, joelhos dobrados, mãos atrás da cabeça sem puxar o pescoço.', 'Leve o cotovelo em direção ao joelho oposto.', 'Alterne os lados com calma.'], ['cervical_sensivel']],
  ['Dumbbell_Side_Bend', 'Flexão lateral com halter', 'Dumbbell Side Bend', 'anti_rotacao', 'abdomen', [], 'halteres', 'iniciante', 'isolado', true,
    ['Em pé, halter numa mão, a outra na cintura.', 'Incline o tronco para o lado do halter, sem girar.', 'Volte usando a lateral do abdômen do outro lado.'], []],
  ['Standing_Cable_Lift', 'Levantamento diagonal no cabo', 'Standing Cable Lift', 'anti_rotacao', 'abdomen', ['ombros'], 'polia_baixa', 'iniciante', 'composto', false,
    ['De lado para a polia baixa, segure a pegada com as duas mãos.', 'Leve as mãos em diagonal de baixo para cima, girando junto com os pés.', 'Controle a volta: o abdômen freia o movimento.'], []],
  ['Bent-Knee_Hip_Raise', 'Elevação de quadril deitado', 'Bent-Knee Hip Raise', 'flexao_tronco', 'abdomen', [], 'peso_corporal', 'iniciante', 'isolado', false,
    ['Deitado, joelhos dobrados e pés fora do chão.', 'Traga os joelhos em direção ao peito tirando o quadril do chão.', 'Desça devagar, sem balançar.'], []],
]

const exercicios = JSON.parse(readFileSync(join(raiz, 'data/exercises.pt.json'), 'utf8'))
const porSlug = new Map(exercicios.map((e) => [e.slug, e]))
for (const [slug, nome_pt, nome_en, padrao_movimento, musculo_primario, musculos_secundarios, equipamento, nivel, mecanica, unilateral, instrucoes_pt, contraindicacoes] of NOVOS) {
  porSlug.set(slug, {
    slug, nome_pt, nome_en, padrao_movimento, musculo_primario, musculos_secundarios, equipamento, nivel, mecanica, unilateral,
    instrucoes_pt, imagens: img(slug), contraindicacoes,
  })
}
const lista = [...porSlug.values()]
writeFileSync(join(raiz, 'data/exercises.pt.json'), JSON.stringify(lista, null, 1) + '\n')

// Checklist de equipamentos: categoria nova "aerobico" e contagens atualizadas.
const equip = JSON.parse(readFileSync(join(raiz, 'data/equipamentos.json'), 'utf8'))
equip.aerobico = ['esteira', 'bicicleta_ergometrica', 'bicicleta_horizontal', 'eliptico', 'escada_ergometrica', 'remo_ergometrico', 'corda_pular'].map((chave) => ({ chave, exercicios: 0 }))
for (const itens of Object.values(equip)) for (const item of itens) item.exercicios = lista.filter((e) => e.equipamento === item.chave).length
writeFileSync(join(raiz, 'data/equipamentos.json'), JSON.stringify(equip, null, 1) + '\n')

const voc = JSON.parse(readFileSync(join(raiz, 'data/vocabulario.json'), 'utf8'))
if (!voc.padroes_movimento.includes('aerobico')) voc.padroes_movimento = [...voc.padroes_movimento, 'aerobico'].sort()
writeFileSync(join(raiz, 'data/vocabulario.json'), JSON.stringify(voc, null, 1) + '\n')

const semChave = lista.filter((e) => !Object.values(equip).flat().some((i) => i.chave === e.equipamento))
if (semChave.length) throw new Error('Equipamento fora do checklist: ' + semChave.map((e) => e.slug).join(', '))
console.log(`${NOVOS.length} entradas aplicadas; catálogo com ${lista.length} exercícios.`)
