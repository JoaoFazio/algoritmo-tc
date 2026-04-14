# AutomataLab

Ferramenta visual interativa para estudo de **Teoria da Computação**. Construa, simule e teste autômatos, gramáticas, máquinas de Turing e expressões regulares diretamente no navegador — sem instalar nada.

> **Acesse online:** [algoritmo-tc.vercel.app](https://algoritmo-tc.vercel.app) *(desktop e celular)*

---

## Índice

1. [DFA / NFA — Autômatos Finitos](#1-dfa--nfa--autômatos-finitos)
2. [Gramáticas — GR e GLC](#2-gramáticas--gr-e-glc)
3. [Pilha (AP) — Autômato com Pilha](#3-pilha-ap--autômato-com-pilha)
4. [Turing (MT) — Máquina de Turing](#4-turing-mt--máquina-de-turing)
5. [Regex — Expressões Regulares](#5-regex--expressões-regulares)
6. [Referência rápida de notação](#6-referência-rápida-de-notação)

---

## 1. DFA / NFA — Autômatos Finitos

**Conceito:** Um autômato finito lê uma string símbolo por símbolo e decide se ela pertence à linguagem. No **DFA** cada estado tem exatamente uma transição por símbolo; no **NFA** pode haver zero, uma ou várias transições para o mesmo símbolo (incluindo transições ε).

### Como usar

#### Construindo o autômato

| Ação | Como fazer |
|---|---|
| Adicionar estado | Selecione a ferramenta **Estado** (⊙) e clique em qualquer área do canvas |
| Mover estado | Selecione a ferramenta **Selecionar** (↖) e arraste o estado |
| Deletar estado | Clique com o botão direito sobre o estado |
| Marcar como inicial | Clique com o botão direito → **Set Start** |
| Marcar como aceitação | Clique com o botão direito → **Toggle Accept** (estado ganha anel duplo) |
| Adicionar transição | Selecione a ferramenta **Transição** (→), clique no estado de origem e depois no destino |
| Renomear estado | Duplo-clique sobre o estado |
| Deletar transição | Clique com o botão direito sobre a seta |

#### Painel lateral

- **Alfabeto:** define quais símbolos são válidos (ex: `a, b`). Separe por vírgula.
- **Tipo:** alterne entre DFA e NFA. No modo NFA, transições ε são permitidas.
- **NFA → DFA:** converte o NFA atual para DFA equivalente via construção de subconjuntos.
- **Minimizar DFA:** reduz o DFA ao número mínimo de estados (algoritmo de Hopcroft).
- **Validar ER:** compara o autômato com uma expressão regular — útil para checar se o autômato que você desenhou é equivalente à ER do exercício.

#### Simulando uma string

1. Digite a string no campo **Simular** na parte inferior do painel.
2. Clique **▶ Executar** para ver o resultado imediatamente.
3. Use **⏮ ⏴ ⏵ ⏭** para navegar passo a passo — o estado ativo e a transição percorrida são destacados no canvas.

#### Exemplos de exercícios

- *"Construa um DFA que aceite todas as strings sobre {a,b} que terminam em `ab`"*
  → Crie 3 estados: `q0` (inicial), `q1` (leu `a`), `q2` (leu `ab`, aceitação). Transições: `q0 -a→ q1`, `q1 -b→ q2`, `q2 -a→ q1`, etc.
- *"Converta o NFA para DFA"*
  → Desenhe o NFA, clique em **NFA → DFA** e veja a construção de subconjuntos aplicada automaticamente.

---

## 2. Gramáticas — GR e GLC

**Conceito:** Gramáticas formais descrevem linguagens através de regras de produção. Uma **Gramática Regular (GR)** gera exatamente as linguagens regulares (Tipo 3 de Chomsky). Uma **Gramática Livre de Contexto (GLC)** é mais poderosa e gera linguagens como `aⁿbⁿ` (Tipo 2).

### Notação no editor

```
S -> a S b | eps      ← GLC: linguagem { aⁿbⁿ | n ≥ 0 }
A -> a A | a          ← GR: linguagem a⁺
```

| Símbolo | Significado |
|---|---|
| `MAIÚSCULO` | Não-terminal (NT) |
| `minúsculo` | Terminal |
| `\|` | Alternativa (ou) |
| `eps` / `ε` | String vazia (ε) |
| Primeiro NT | Símbolo inicial da gramática |

### Como usar

1. **Digite as regras** no editor de texto. O tipo da gramática (Regular ou GLC) é detectado automaticamente e exibido no badge ao lado do título.
2. **Gramática Parseada** mostra as regras estruturadas com cores: azul = não-terminal, laranja = terminal, roxo = ε.
3. **Derivar:** digite uma string no campo e clique **▶ Derivar**. O sistema tenta derivar a string usando a estratégia *leftmost derivation* (mais à esquerda).
4. O resultado mostra cada passo da derivação: `S ⇒ aSb ⇒ aaSbb ⇒ aabb`.

### Gerador automático ER → Gramática Regular

Tem uma expressão regular e quer obter a GR equivalente?

1. Digite a ER no campo **ER → Gramática Regular** (ex: `(a+b)*aa(a+b)*`).
2. Clique **⚙ Gerar GR**.
3. As regras são geradas automaticamente e carregadas no editor, prontas para teste.

**Notação da ER neste campo** (diferente do JavaScript):

| Símbolo | Significado |
|---|---|
| `+` | União / OU (ex: `a + b`) |
| `*` | Kleene star — zero ou mais repetições |
| `( )` | Agrupamento |
| `eps` / `ε` | String vazia |
| Concatenação | Implícita — escreva `ab` para "a seguido de b" |

> **Pipeline interno:** ER → AST → ε-NFA (Thompson) → DFA (subconjuntos) → GR (linear à direita)

#### Exemplos práticos

| ER | GR gerada representa |
|---|---|
| `(a+b)*` | Todas as strings sobre {a,b} |
| `b a*` | `b` seguido de zero ou mais `a` |
| `(a+b)*aa(a+b)*` | Strings que contêm `aa` |
| `a(bb)*` | `a` seguido de número par de `b` |

### Exemplos prontos (sidebar)

Clique em qualquer exemplo na barra lateral para carregar a gramática e uma string de teste. Bom ponto de partida antes de montar a sua própria.

---

## 3. Pilha (AP) — Autômato com Pilha

**Conceito:** O Autômato com Pilha (Pushdown Automaton) é um NFA estendido com uma pilha infinita. Reconhece as linguagens livres de contexto — mais poderoso que autômatos finitos, mas menos que Máquinas de Turing.

### Como usar

A interface de canvas é idêntica à do DFA/NFA. A diferença está nas **transições**, que têm 3 campos:

| Campo | Significado | Exemplo |
|---|---|---|
| **Símbolo lido** | Caractere consumido da entrada (`ε` = não consome) | `a` |
| **Desempilhar (pop)** | Símbolo removido do topo da pilha (`ε` = não remove) | `A` |
| **Empilhar (push)** | Símbolo colocado no topo da pilha (`ε` = não empilha) | `AA` |

**Símbolo de fundo de pilha:** `$` (inserido automaticamente no início da simulação).

#### Simulação passo a passo

1. Construa o AP no canvas (ou carregue um exemplo da sidebar).
2. Digite a string no campo **Simular** e clique **▶**.
3. Use os botões de passo para ver o estado atual, o restante da entrada e **o conteúdo da pilha em cada passo**.

#### Exemplo clássico: { aⁿbⁿ | n ≥ 1 }

```
Estados: q0 (inicial), q1, q2 (aceitação)
Transições:
  q0 --(a, ε → A)--> q0      ← empilha A para cada a lido
  q0 --(b, A → ε)--> q1      ← começa a desempilhar
  q1 --(b, A → ε)--> q1      ← desempilha A para cada b
  q1 --(ε, $ → ε)--> q2      ← pilha vazia = aceita
```

---

## 4. Turing (MT) — Máquina de Turing

**Conceito:** A Máquina de Turing é o modelo computacional mais poderoso da Hierarquia de Chomsky. Possui uma fita infinita, uma cabeça de leitura/escrita e uma função de transição que lê, escreve e move a cabeça para esquerda (L), direita (R) ou parada (S).

### Como usar

#### Gerenciando estados

- **Adicionar estado:** digite o nome no campo e clique **+ Estado** (ou pressione Enter).
- **Marcar inicial/aceitação:** clique nos ícones ao lado do estado na lista.
- **Remover estado:** clique no ✕ ao lado do nome.

#### Adicionando transições

Preencha a linha de edição na tabela de transições:

| Campo | Descrição |
|---|---|
| **De** | Estado de origem |
| **Lê** | Símbolo lido da fita (`_` = branco) |
| **Para** | Estado de destino |
| **Escreve** | Símbolo escrito na fita |
| **Dir** | Direção: **R** (direita), **L** (esquerda), **S** (parado) |

Clique **+ Adicionar** para confirmar. O símbolo branco é representado por `_` no editor.

#### Simulando

1. Digite a string de entrada no campo **Entrada** (deixe vazio para a fita começar em branco).
2. Clique **▶ Executar**.
3. Use **⏮ ⏴ ⏵ ⏭** para navegar passo a passo — a fita é exibida com a cabeça destacada em cada configuração.
4. O resultado mostra **Aceita** (atingiu estado de aceitação) ou **Rejeita** (travou ou atingiu configuração inválida).

#### Exemplos prontos

A sidebar traz MTs clássicas pré-montadas. Recomendados para estudo:

- **Palíndromo** — exemplifica uso de múltiplas passagens sobre a fita.
- **aⁿbⁿ** — mostra o padrão de "marcar e mover" para contar símbolos.

---

## 5. Regex — Expressões Regulares

**Conceito:** Esta aba usa o motor de regex nativo do JavaScript (ECMA-262). É útil para testar padrões em texto real e entender como as expressões regulares funcionam na prática.

> **Atenção:** A notação aqui é **JavaScript regex** — diferente da notação formal usada na aba Gramáticas (`+` aqui significa "um ou mais", não "união").

### Como usar

1. **Padrão:** digite a expressão regular (sem as barras `/`).
2. **Flags:** `g` (global — todas as ocorrências), `i` (case-insensitive), `m` (multiline). Combinações permitidas: `gi`, `gm`, etc.
3. **Texto de teste:** cole ou digite o texto onde a regex será aplicada.
4. As correspondências são **destacadas em verde** diretamente no texto. O contador mostra quantas ocorrências foram encontradas.

### Cheatsheet de referência (exibida na sidebar)

| Símbolo | Significado |
|---|---|
| `.` | Qualquer caractere (exceto newline) |
| `*` | 0 ou mais repetições |
| `+` | 1 ou mais repetições |
| `?` | 0 ou 1 repetição (opcional) |
| `^` | Início da string/linha |
| `$` | Fim da string/linha |
| `[abc]` | Classe de caracteres (a, b ou c) |
| `[^abc]` | Negação de classe |
| `a\|b` | a ou b |
| `(ab)` | Grupo de captura |
| `\d` | Dígito `[0-9]` |
| `\w` | Caractere de palavra `[a-zA-Z0-9_]` |
| `\s` | Espaço em branco |
| `{n,m}` | Entre n e m repetições |

---

## 6. Referência rápida de notação

### Hierarquia de Chomsky

| Tipo | Nome | Reconhecedor |
|---|---|---|
| Tipo 3 | Gramática Regular | Autômato Finito (DFA/NFA) |
| Tipo 2 | Gramática Livre de Contexto (GLC) | Autômato com Pilha (AP) |
| Tipo 1 | Gramática Sensível ao Contexto | Autômato Linear Limitado |
| Tipo 0 | Gramática Irrestrita | Máquina de Turing (MT) |

### Notação formal de ER (aba Gramáticas)

| Símbolo | Significado | Exemplo |
|---|---|---|
| `+` | União (OU) | `a + b` = a ou b |
| `*` | Kleene star | `a*` = ε, a, aa, aaa, … |
| `( )` | Agrupamento | `(a+b)*` |
| `eps` / `ε` | String vazia | `a*` inclui `eps` |
| Justaposição | Concatenação | `ab` = a seguido de b |

### Notação de gramáticas (aba Gramáticas)

```
S -> aAb | eps         GLC
A -> aA  | a           GR (linear à direita)
```

- Primeira regra define o símbolo inicial.
- `MAIÚSCULO` = não-terminal; `minúsculo` = terminal.
- Múltiplas produções separadas por `|` na mesma linha.

---

## Tecnologias

- **React 19** + **Vite 7** — interface SPA
- **Canvas API** — renderização dos autômatos
- **Algoritmos implementados do zero:** Thompson (ER→NFA), subconjuntos (NFA→DFA), Hopcroft (minimização DFA), BFS para derivação em GLC
- Sem backend — tudo roda localmente no navegador

---

*Projeto desenvolvido para apoio ao estudo da disciplina de Teoria da Computação.*
