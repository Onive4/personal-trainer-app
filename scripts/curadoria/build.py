# -*- coding: utf-8 -*-
"""Gera data/exercises.pt.json a partir da free-exercise-db + curadoria manual."""
import json, sys, collections
sys.path.insert(0, '/home/claude/cur')
from c1_peito_costas import CUR as C1
from c2_ombro_bracos import CUR as C2
from c3_pernas import CUR as C3
from c4_core_antebraco import CUR as C4

CUR = C1 + C2 + C3 + C4
BASE_IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

MUSCULO = {
 "abdominals":"abdomen","hamstrings":"posterior_de_coxa","adductors":"adutores",
 "quadriceps":"quadriceps","biceps":"biceps","shoulders":"ombros","chest":"peito",
 "middle back":"dorsal_medio","calves":"panturrilha","glutes":"gluteos",
 "lower back":"lombar","lats":"dorsais","triceps":"triceps","traps":"trapezio",
 "forearms":"antebraco","neck":"cervical","abductors":"abdutores",
}
NIVEL = {"beginner":"iniciante","intermediate":"intermediario","expert":"avancado"}
MECANICA = {"compound":"composto","isolation":"isolado",None:"isolado"}

PADROES = {"agachamento","dobradica_quadril","empurrar_horizontal","empurrar_vertical",
           "puxar_horizontal","puxar_vertical","unilateral_perna","anti_extensao",
           "anti_rotacao","flexao_tronco","isolamento"}

CONTRA = {
 "sem_carga_axial":"Sem carga comprimindo a coluna (barra nas costas, terra pesado)",
 "sem_desenvolvimento_acima_cabeca":"Sem empurrar ou alongar acima da cabeca",
 "evitar_amplitude_maxima_ombro":"Evitar amplitude extrema de ombro",
 "flexao_joelho_limitada":"Flexao profunda ou extensao carregada de joelho limitada",
 "sem_impacto":"Sem salto ou impacto",
 "sem_flexao_lombar_carregada":"Sem flexionar a lombar sob carga",
 "sem_hiperextensao_lombar":"Sem hiperextensao da lombar",
 "sem_extensao_punho":"Sem extensao forcada de punho (barra reta)",
 "sem_apoio_punho":"Sem apoiar o peso do corpo no punho",
 "cervical_sensivel":"Cuidado com carga ou tensao na regiao cervical",
}

src = {x["name"]: x for x in json.load(open('/home/claude/basedata/exercises.json'))}

erros, out, vistos = [], [], set()
for e in CUR:
    n = e["src"]
    if n in vistos: erros.append(f"DUPLICADO: {n}")
    vistos.add(n)
    if n not in src: erros.append(f"NAO EXISTE NA BASE: {n}"); continue
    if e["padrao"] not in PADROES: erros.append(f"PADRAO INVALIDO em {n}: {e['padrao']}")
    for c in e["contra"]:
        if c not in CONTRA: erros.append(f"CONTRAINDICACAO INVALIDA em {n}: {c}")
    if not (2 <= len(e["cues"]) <= 4): erros.append(f"CUES FORA DE 2-4 em {n}")
    s = src[n]
    out.append({
        "slug": s["id"],
        "nome_pt": e["pt"],
        "nome_en": s["name"],
        "padrao_movimento": e["padrao"],
        "musculo_primario": MUSCULO[s["primaryMuscles"][0]],
        "musculos_secundarios": [MUSCULO[m] for m in s["secondaryMuscles"]],
        "equipamento": e["equip"],
        "nivel": NIVEL[s["level"]],
        "mecanica": MECANICA.get(s.get("mechanic"), "isolado"),
        "unilateral": e["uni"],
        "instrucoes_pt": e["cues"],
        "imagens": [BASE_IMG + i for i in s["images"]],
        "contraindicacoes": e["contra"],
    })

if erros:
    print("FALHOU:"); [print(" -", x) for x in erros]; sys.exit(1)

out.sort(key=lambda x: (x["musculo_primario"], x["nome_pt"]))
json.dump(out, open('/home/claude/cur/exercises.pt.json','w'), ensure_ascii=False, indent=1)

# vocabulario de equipamentos para o checklist da academia
GRUPO = {
 "barra":["barra_livre","barra_w","barra_rack","barra_rack_caixote","barra_rack_banco","barra_banco","barra_baixa","trap_bar","anilha"],
 "halteres":["halteres","halteres_banco"],
 "bancos":["banco","banco_reto_barra","banco_reto_barra_w","banco_reto_halteres","banco_inclinado_barra","banco_inclinado_halteres","banco_declinado_barra","banco_declinado_halteres","banco_desenvolvimento_barra","banco_desenvolvimento_halteres","banco_halteres","banco_scott","banco_scott_w","banco_hiperextensao"],
 "polias":["polia_alta","polia_media","polia_baixa","crossover"],
 "maquinas":["maquina_supino","maquina_supino_inclinado","maquina_voador","maquina_desenvolvimento","maquina_remada","maquina_remada_alta","maquina_cavalinho","maquina_encolhimento","maquina_rosca","maquina_triceps","maquina_paralelas","maquina_abdominal","maquina_hack","maquina_panturrilha_pe","maquina_panturrilha_sentado","maquina_flexora_pe","leg_press","cadeira_extensora","cadeira_flexora","cadeira_adutora","cadeira_abdutora","mesa_flexora","ghr","smith","cavalinho"],
 "livre":["peso_corporal","barra_fixa","barra_fixa_elastico","barra_fixa_peso","paralelas","elastico","fitas_suspensao","ab_wheel"],
}
usados = collections.Counter(x["equipamento"] for x in out)
catalogados = {k for v in GRUPO.values() for k in v}
orfaos = set(usados) - catalogados
if orfaos: print("AVISO equipamento fora do vocabulario:", sorted(orfaos))

equip = {g: [{"chave": k, "exercicios": usados.get(k,0)} for k in sorted(ks) if usados.get(k,0)] for g, ks in GRUPO.items()}
json.dump(equip, open('/home/claude/cur/equipamentos.json','w'), ensure_ascii=False, indent=1)
json.dump({"contraindicacoes": CONTRA, "padroes_movimento": sorted(PADROES)},
          open('/home/claude/cur/vocabulario.json','w'), ensure_ascii=False, indent=1)

print(f"OK — {len(out)} exercicios gerados\n")
print("POR PADRAO DE MOVIMENTO")
for k,v in sorted(collections.Counter(x["padrao_movimento"] for x in out).items(), key=lambda a:-a[1]):
    print(f"  {k:22} {v}")
print("\nPOR MUSCULO PRIMARIO")
for k,v in sorted(collections.Counter(x["musculo_primario"] for x in out).items(), key=lambda a:-a[1]):
    print(f"  {k:22} {v}")
print("\nPOR CATEGORIA DE EQUIPAMENTO")
for g,ks in GRUPO.items():
    print(f"  {g:12} {sum(usados.get(k,0) for k in ks):3}  ({len([k for k in ks if usados.get(k,0)])} chaves em uso)")
print("\nNIVEL:", dict(collections.Counter(x["nivel"] for x in out)))
print("MECANICA:", dict(collections.Counter(x["mecanica"] for x in out)))
print("com contraindicacao:", sum(1 for x in out if x["contraindicacoes"]))
print("unilaterais:", sum(1 for x in out if x["unilateral"]))
print("sem imagem:", sum(1 for x in out if not x["imagens"]))
