import axios from 'axios';

class OlhoVivoService {
  constructor() {
    this.baseUrl = 'https://api.olhovivo.sptrans.com.br/v2.1';
    this.token = process.env.SPTRANS_TOKEN || '';
    this.cookies = '';
    this.isAuthenticated = false;
    this.lastAuthTime = null;
    this.authPromise = null;
  }

  setToken(token) {
    this.token = (token || '').trim();
    this.isAuthenticated = false;
    this.cookies = '';
    this.lastAuthTime = null;
  }

  getToken() {
    return this.token;
  }

  async authenticate(force = false) {
    if (!this.token) {
      throw new Error('Nenhum token da SPTrans informado.');
    }

    // Se já está autenticado há menos de 1 hora e não for forçado, reaproveita
    const ONE_HOUR = 60 * 60 * 1000;
    if (!force && this.isAuthenticated && this.cookies && this.lastAuthTime && (Date.now() - this.lastAuthTime < ONE_HOUR)) {
      return true;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      try {
        console.log(`[SPTrans Olho Vivo] Autenticando com token...`);
        const response = await axios.post(
          `${this.baseUrl}/Login/Autenticar?token=${this.token}`,
          {},
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'PegaBus/1.0'
            },
            withCredentials: true
          }
        );

        if (response.data === true) {
          const rawCookies = response.headers['set-cookie'];
          if (rawCookies && rawCookies.length > 0) {
            this.cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
          }
          this.isAuthenticated = true;
          this.lastAuthTime = Date.now();
          console.log('[SPTrans Olho Vivo] Autenticado com sucesso!');
          return true;
        } else {
          this.isAuthenticated = false;
          throw new Error('Falha na autenticação da SPTrans: Token inválido ou não autorizado.');
        }
      } catch (err) {
        this.isAuthenticated = false;
        const msg = err.response?.data?.Message || err.message;
        console.error('[SPTrans Olho Vivo] Erro de autenticação:', msg);
        throw new Error(`Erro ao autenticar na SPTrans: ${msg}`);
      } finally {
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  }

  async request(endpoint, options = {}, retryCount = 1) {
    if (!this.isAuthenticated || !this.cookies) {
      await this.authenticate();
    }

    try {
      const response = await axios({
        url: `${this.baseUrl}${endpoint}`,
        method: options.method || 'GET',
        headers: {
          'Cookie': this.cookies,
          'Accept': 'application/json',
          'User-Agent': 'PegaBus/1.0',
          ...(options.headers || {})
        },
        timeout: 15000,
        ...options
      });

      return response.data;
    } catch (err) {
      // Se retornar 401 ou erro de sessão, tenta reautenticar uma vez
      if (retryCount > 0 && (err.response?.status === 401 || err.response?.status === 403)) {
        console.warn('[SPTrans Olho Vivo] Sessão expirada. Reautenticando...');
        await this.authenticate(true);
        return this.request(endpoint, options, retryCount - 1);
      }
      throw err;
    }
  }

  // Buscar linhas por código ou denominação
  async buscarLinhas(termo) {
    if (!termo || termo.trim().length === 0) return [];
    return await this.request(`/Linha/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  }

  // Buscar detalhes de uma linha pelo sentido
  async buscarLinhaSentido(termo, sentido) {
    return await this.request(`/Linha/BuscarLinhaSentido?termosBusca=${encodeURIComponent(termo)}&sentido=${sentido}`);
  }

  // Buscar paradas por linha
  async buscarParadasPorLinha(codigoLinha) {
    return await this.request(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`);
  }

  // Buscar paradas por termo
  async buscarParadas(termo) {
    if (!termo || termo.trim().length === 0) return [];
    return await this.request(`/Parada/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  }

  // Obter posições em tempo real dos ônibus de uma linha
  async obterPosicoesLinha(codigoLinha) {
    return await this.request(`/Posicao/Linha?codigoLinha=${codigoLinha}`);
  }

  // Obter posições de todos os ônibus em operação
  async obterPosicoesGeral() {
    return await this.request(`/Posicao`);
  }

  // Obter previsão de chegada de uma linha em todas as paradas
  async obterPrevisaoLinha(codigoLinha) {
    return await this.request(`/Previsao/Linha?codigoLinha=${codigoLinha}`);
  }

  // Obter previsão de chegada de todas as linhas em uma parada específica
  async obterPrevisaoParada(codigoParada) {
    return await this.request(`/Previsao/Parada?codigoParada=${codigoParada}`);
  }

  // Obter previsão de uma linha específica em uma parada específica
  async obterPrevisaoLinhaEParada(codigoLinha, codigoParada) {
    return await this.request(`/Previsao?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
  }

  // Obter corredores
  async obterCorredores() {
    return await this.request(`/Corredor`);
  }
}

export const olhoVivoService = new OlhoVivoService();
