# 🚌 PegaBus - Rastreamento de Ônibus em Tempo Real (SPTrans Olho Vivo)

Aplicativo moderno inspirado no **Moovit** para acompanhamento de linhas de ônibus, itinerários no mapa acompanhando as ruas, paradas ordenadas e previsão de chegada (tempo estimado) utilizando a **API oficial do Olho Vivo da SPTrans**.

---

## 🚀 Funcionalidades

- **🗺️ Mapa Interativo em Tempo Real (Leaflet):**
  - Traçado fiel da rota da linha acompanhando as ruas da cidade de São Paulo (roteamento geométrico OSRM).
  - Marcadores de ônibus com animação de pulso em tempo real, prefixo do veículo e indicação de acessibilidade para cadeirantes (♿).
  - Paradas numeradas com sequência do trajeto e popups informativos.
- **⏱️ Previsão de Chegada (ETA):**
  - Estimativa do horário e minutos para a chegada dos próximos veículos em cada ponto.
- **🔍 Busca Inteligente:**
  - Pesquisa por número da linha (ex: `8000`, `875H`, `107T`) ou denominação/destino (ex: `Lapa`, `Paulista`, `Pinheiros`).
  - Sugestões rápidas de linhas populares com 1 clique.
- **🔄 Inversão de Sentido:**
  - Alterne instantaneamente entre **Ida** (Terminal Principal ➔ Secundário) e **Volta** (Terminal Secundário ➔ Principal).
- **🔑 Gerenciamento de Token & Modo Demonstração:**
  - Interface visual integrada para colar sua chave de acesso da SPTrans.
  - Modo Demonstração funcional com linhas reais de São Paulo e movimentação contínua de ônibus.
- **📱 Responsivo:**
  - Layout otimizado tanto para telas de desktop quanto para smartphones (gaveta retrátil estilo Moovit).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, Tailwind CSS, Leaflet, React-Leaflet, Lucide Icons.
- **Backend:** Node.js, Express, Axios (com gerenciamento de cookies de sessão `ASP.NET_SessionId` da SPTrans e proxy anti-CORS).
- **Serviço de Roteamento:** OSRM (Open Source Routing Machine) com cache em memória para geração de GeoJSON contínuo das vias.

---

## ⚙️ Como Executar

### 1. Primeira configuração (após clonar)

```bash
# Dependências
cd backend && npm install
cd ../frontend && npm install && npm run build

# Variáveis de ambiente: copie o exemplo e preencha seu token
cd ../backend
cp .env.example .env
```

**Dados de trajetos e paradas (GTFS):** baixe o GTFS da SPTrans
([Portal de Desenvolvedores](https://www.sptrans.com.br/desenvolvedores/) ou o espelho público
`https://files.mobilitydatabase.org/mdb-8/latest.zip`), descompacte e gere o arquivo
`backend/data/gtfs-lines.json`:

```bash
npm run gtfs -- "caminho/para/pasta-gtfs"
```

### 2. Iniciar a Aplicação

Dentro da pasta `backend`:

```bash
npm start          # só no computador
npm run celular    # com link público + QR Code para abrir no celular
```

Abra no navegador:
👉 **[http://localhost:3001](http://localhost:3001)**

---

### 3. Configurar seu Token Oficial da SPTrans

1. Abra a aplicação no navegador em [http://localhost:3001](http://localhost:3001).
2. Clique no botão **Token SPTrans** no cabeçalho superior.
3. Cole o seu token obtido no [Portal de Desenvolvedores da SPTrans](https://www.sptrans.com.br/desenvolvedores/).
4. Clique em **Salvar e Autenticar**.
5. O status mudará imediatamente para **🟢 SPTrans Ao Vivo**!

*Dica:* Você também pode salvar seu token no arquivo `backend/.env`:
```env
PORT=3001
SPTRANS_TOKEN=seu_token_aqui_64_caracteres
```

---

## ☁️ Deploy na Vercel

O projeto está configurado em [vercel.json](vercel.json): o frontend (`frontend/dist`) é servido como estático e
toda a API Express roda como uma função serverless em [api/index.js](api/index.js).

1. Importe o repositório na Vercel (raiz do repositório como *Root Directory*; o resto vem do `vercel.json`).
2. Em **Settings → Environment Variables**, defina:
   - `SPTRANS_TOKEN` — token da API Olho Vivo (sem ele o app roda em modo demonstração)
   - `CARTO_API_KEY` — opcional
   - `ADMIN_KEY` — opcional, só para as rotas administrativas de token/modo
3. Faça o deploy. O build (`npm run vercel-build`) compila o frontend e baixa o GTFS da SPTrans para
   `backend/data/gtfs-lines.json`, que é empacotado junto com a função.

Observações: na Vercel o estado fica em memória por instância, então trocar o token/modo pelas rotas
administrativas não persiste — use as variáveis de ambiente. Para rodar localmente continue usando `npm start`.
