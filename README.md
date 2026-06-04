# Monitoramento RU — Front-end

Interface web do sistema colaborativo de monitoramento de filas dos Restaurantes Universitários. Exibe o status em tempo real de cada RU, permite o envio de relatos de fila com validação de geolocalização, e oferece um painel admin para gestão.

---

## Stack

| Tecnologia | Papel |
|---|---|
| React 18 + TypeScript | UI |
| Vite | Build e dev server |
| React Router v6 | Roteamento SPA |
| IBM Plex Mono | Tipografia do sistema |

---

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# URL base da API (sem barra final)
VITE_API_URL=http://localhost:8000/api/v1

# Segredo para geração da geo-assinatura HMAC (deve ser igual ao APP_GEO_SECRET do back-end)
VITE_GEO_SECRET=seu-segredo-aqui

# Ativa modo debug — desativa restrições de horário no front-end
# O back-end também deve estar com DEBUG=True para funcionar completamente
VITE_DEBUG=false
```

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

---

## Build de produção

```bash
npm run build   # gera dist/
```

---

## Páginas

| Rota | Título da aba | Descrição |
|---|---|---|
| `/` | Monitor RU | Dashboard com todos os RUs, status atual e indicador de aberto/fechado |
| `/restaurants/:id` | `<Nome do RU>` · Monitor RU | Status detalhado, histórico, feed de relatos, horários e exceções |
| `/schedules` | Horários · Monitor RU | Grade de horários regulares de todos os RUs |
| `/admin` | Admin · Monitor RU | Gestão de restaurantes, horários e exceções (requer Admin Key) |

---

## Envio de relato

Ao enviar um relato, o front-end:

1. Solicita a geolocalização do dispositivo via `navigator.geolocation`
2. Gera uma geo-assinatura HMAC-SHA256 localmente com `VITE_GEO_SECRET`
3. Envia as coordenadas + assinatura para o back-end

A localização é usada **apenas para validar proximidade** ao RU — não é armazenada no servidor.

---

## Painel Admin

Acessível em `/admin`. Na primeira visita exibe um modal de autenticação. A Admin Key fica salva no `localStorage`. O botão **ALTERAR CHAVE** permite corrigir a chave sem encerrar a sessão atual.

---

## Modo debug

Com `VITE_DEBUG=true` (e `DEBUG=True` no back-end):

- Restrições de horário desativadas — o botão de envio de relato aparece mesmo fora do horário de funcionamento
- Feed de relatos exibido independente do status do RU
- Banner de aviso exibido no topo da página de detalhes

**Nunca ative em produção.**

---

## Estrutura do projeto

```
src/
├── api/           # Clientes HTTP tipados por domínio (restaurants, snapshots, reports…)
├── components/    # Componentes reutilizáveis (ReportForm, StatusBadge, Toast, LocationModal…)
├── context/       # Contextos React (AdminContext, ToastContext)
├── lib/           # Utilitários (geo, schedule, debug, usePageTitle)
└── pages/
    ├── Dashboard.tsx          # Listagem de todos os RUs
    ├── RestaurantDetail.tsx   # Detalhe de um RU
    ├── SchedulesPage.tsx      # Grade de horários
    └── AdminPanel.tsx         # Painel de gestão
```
