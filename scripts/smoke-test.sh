#!/usr/bin/env bash
# Smoke test dos fluxos centrais via HTTP (usar com servidor em localhost:3000).
set -u
BASE="http://localhost:3000"
JAR=/tmp/mc_cookies.txt
JAR2=/tmp/mc_cookies2.txt
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    PASS=$((PASS+1)); echo "✔ $desc"
  else
    FAIL=$((FAIL+1)); echo "✘ $desc — esperado conter '$expected', obtido: ${actual:0:200}"
  fi
}

code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "── Autenticação ──"
check "login com senha errada é rejeitado" '"code":"unauthorized"' \
  "$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ana@demo.local","password":"errada"}')"
check "login válido retorna usuário" '"name":"Ana Souza"' \
  "$(curl -s -c $JAR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ana@demo.local","password":"demo12345"}')"
check "sessão devolve workspace" '"workspace"' \
  "$(curl -s -b $JAR $BASE/api/auth/session)"
check "sem cookie, /api/tasks nega (401)" "401" \
  "$(code $BASE/api/tasks)"

echo "── Projetos ──"
PROJECT_JSON=$(curl -s -b $JAR -X POST $BASE/api/projects -H 'Content-Type: application/json' \
  -d '{"name":"Projeto Smoke Test","description":"Criado pelo smoke test","status":"ACTIVE","color":"#38BDF8"}')
check "criar projeto" '"name":"Projeto Smoke Test"' "$PROJECT_JSON"
PID=$(echo "$PROJECT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['project']['id'])")
check "editar projeto" '"status":"ON_HOLD"' \
  "$(curl -s -b $JAR -X PATCH $BASE/api/projects/$PID -H 'Content-Type: application/json' -d '{"status":"ON_HOLD"}')"
check "detalhe do projeto inclui tarefas" '"tasks"' \
  "$(curl -s -b $JAR $BASE/api/projects/$PID)"

echo "── Tarefas ──"
TASK_JSON=$(curl -s -b $JAR -X POST $BASE/api/tasks -H 'Content-Type: application/json' \
  -d "{\"title\":\"Tarefa smoke\",\"projectId\":\"$PID\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"dueDate\":\"2026-10-20\"}")
check "criar tarefa vinculada" '"title":"Tarefa smoke"' "$TASK_JSON"
TID=$(echo "$TASK_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['task']['id'])")
check "alterar status via PATCH" '"status":"IN_PROGRESS"' \
  "$(curl -s -b $JAR -X PATCH $BASE/api/tasks/$TID -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}')"
check "alterar prioridade" '"priority":"URGENT"' \
  "$(curl -s -b $JAR -X PATCH $BASE/api/tasks/$TID -H 'Content-Type: application/json' -d '{"priority":"URGENT"}')"
check "mover via /move (kanban)" '"status":"DONE"' \
  "$(curl -s -b $JAR -X POST $BASE/api/tasks/$TID/move -H 'Content-Type: application/json' -d '{"status":"DONE","position":4200}')"
check "persistência: status segue DONE após novo GET" '"status":"DONE"' \
  "$(curl -s -b $JAR $BASE/api/tasks/$TID)"

echo "── Subtarefas e comentários ──"
SID=$(curl -s -b $JAR -X POST $BASE/api/tasks/$TID/subtasks -H 'Content-Type: application/json' -d '{"title":"Sub smoke"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['subtask']['id'])")
check "concluir subtarefa" '"done":true' \
  "$(curl -s -b $JAR -X PATCH $BASE/api/subtasks/$SID -H 'Content-Type: application/json' -d '{"done":true}')"
check "criar comentário" '"body":"Comentário smoke"' \
  "$(curl -s -b $JAR -X POST $BASE/api/tasks/$TID/comments -H 'Content-Type: application/json' -d '{"body":"Comentário smoke"}')"
check "ler comentários" '"Comentário smoke"' \
  "$(curl -s -b $JAR $BASE/api/tasks/$TID/comments)"

echo "── Filtros e busca ──"
check "filtro por status" '"title":"Tarefa smoke"' \
  "$(curl -s -b $JAR "$BASE/api/tasks?status=DONE,IN_PROGRESS")"
check "busca global acha tarefa" '"Tarefa smoke"' \
  "$(curl -s -b $JAR "$BASE/api/search?q=smoke")"
check "filtro vazio não quebra" '"tasks":[]' \
  "$(curl -s -b $JAR "$BASE/api/tasks?search=naoexiste123")"

echo "── Exportação CSV ──"
CSV=$(curl -s -b $JAR "$BASE/api/tasks/export")
check "CSV tem cabeçalho" "Título" "$CSV"
check "CSV tem a tarefa criada" "Tarefa smoke" "$CSV"

echo "── Notificações (2º usuário) ──"
curl -s -c $JAR2 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"bruno@demo.local","password":"demo12345"}' > /dev/null
# Atribuir tarefa ao Bruno deve gerar notificação para ele
curl -s -b $JAR -X POST $BASE/api/tasks -H 'Content-Type: application/json' \
  -d "{\"title\":\"Tarefa para Bruno\",\"assigneeId\":\"$(curl -s -b $JAR2 $BASE/api/auth/session | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")\"}" > /dev/null
check "Bruno recebe notificação de atribuição" "TASK_ASSIGNED" \
  "$(curl -s -b $JAR2 $BASE/api/notifications)"
check "contador de não lidas > 0" '"count":' \
  "$(curl -s -b $JAR2 $BASE/api/notifications/count)"
check "marcar como lida funciona" '"updated":' \
  "$(curl -s -b $JAR2 -X POST $BASE/api/notifications/read -H 'Content-Type: application/json' -d '{"all":true}')"

echo "── Permissões ──"
check "Bruno (member) não cria membros (403)" "403" \
  "$(code -b $JAR2 -X POST $BASE/api/members -H 'Content-Type: application/json' -d '{"email":"x@y.com","name":"Xavier"}')"
check "editar perfil próprio funciona" '"name":"Bruno Lima"' \
  "$(curl -s -b $JAR2 -X PATCH $BASE/api/auth/profile -H 'Content-Type: application/json' -d '{"name":"Bruno Lima"}')"

echo "── Arquivar/restaurar ──"
check "arquivar tarefa" '"archived":true' \
  "$(curl -s -b $JAR -X POST $BASE/api/tasks/$TID/archive)"
check "restaurar tarefa" '"archived":false' \
  "$(curl -s -b $JAR -X POST $BASE/api/tasks/$TID/restore)"
check "arquivar projeto" '"archived":true' \
  "$(curl -s -b $JAR -X POST $BASE/api/projects/$PID/archive)"
check "restaurar projeto" '"archived":false' \
  "$(curl -s -b $JAR -X POST $BASE/api/projects/$PID/restore)"

echo "── Páginas (HTML) ──"
check "página de login renderiza" "Bem-vindo" "$(curl -s $BASE/login)"
check "dashboard redireciona sem sessão (307)" "307" "$(code $BASE/dashboard)"
check "dashboard renderiza com sessão" "Visão geral" "$(curl -s -b $JAR $BASE/dashboard | head -c 40000)"
check "página de tarefas renderiza" "Tarefas" "$(curl -s -b $JAR $BASE/tasks | head -c 40000)"

echo ""
echo "Resultado: $PASS passaram, $FAIL falharam."
[[ $FAIL -eq 0 ]]
