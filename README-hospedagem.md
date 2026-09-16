# Ranking Help — hospedagem

Este projeto consulta os dados reais de OTD no backend e entrega apenas os resultados ao navegador. O JWT da Help permanece no ambiente do servidor.

## Variáveis obrigatórias

Cadastre estas variáveis como **Secrets** no serviço de hospedagem:

| Variável | Valor |
| --- | --- |
| `HELP_DASHBOARD_JWT` | JWT atual de uma conta admin ou analista da Help |
| `HELP_DASHBOARD_API_URL` | `https://live-he-dashboard-relatorio-api-service.helpentregas.com.br` |

`PORT` é definido automaticamente pela maior parte dos provedores. Se for necessário informar manualmente, use `4173`.

## Subir com Node

1. Envie todos os arquivos desta pasta para um repositório ou serviço Node.js.
2. Selecione Node 20 ou superior.
3. Cadastre os dois secrets acima no painel do provedor.
4. Use `npm start` como comando de inicialização.
5. Após a publicação, valide `https://seu-dominio/health` e abra a raiz do domínio.

## Subir com Docker

```bash
docker build -t ranking-help .
docker run --rm -p 4173:4173 \
  -e HELP_DASHBOARD_JWT='JWT_ATUAL' \
  -e HELP_DASHBOARD_API_URL='https://live-he-dashboard-relatorio-api-service.helpentregas.com.br' \
  ranking-help
```

## Endpoints internos

- `GET /` — painel de ranking
- `GET /api/rankings/otd?period=week` — ranking semanal
- `GET /api/rankings/otd?period=month` — ranking mensal
- `GET /health` — verificação de disponibilidade, sem expor o JWT

O serviço consulta a rota de produção `/dashboard-financeiro/admin/performance-entregadores` com `Authorization: Bearer` e guarda a resposta por cinco minutos. Quando o JWT expirar, atualize somente o secret `HELP_DASHBOARD_JWT` no provedor e reinicie o serviço.
