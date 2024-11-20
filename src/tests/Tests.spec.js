// Importando o módulo para gerar o relatório em HTML
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
// Importando o módulo para gerar o resumo do teste no terminal
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
// Importando as funções necessárias para realizar as requisições HTTP
import http from 'k6/http';
// Importando a função 'check' para validar as respostas das requisições
import { check, sleep } from 'k6';
// Importando a classe 'Trend' para medir a duração da requisição
import { Trend } from 'k6/metrics';

// Criando uma métrica para medir o tempo de duração das requisições feitas ao endpoint de raças de cães
export const getBreedsDuration = new Trend('get_breeds_duration', true);

// Configurações do teste
export const options = {
  // Definindo limiares de performance
  thresholds: {
    // Percentual de falhas nas requisições deve ser menor que 5%
    http_req_failed: ['rate<0.05'],
    // A duração média das requisições HTTP deve ser menor que 10 segundos
    http_req_duration: ['avg<10000']
  },
  // Definindo as fases do teste (simulando aumento de carga)
  stages: [
    { duration: '1m', target: 50 }, // Subindo para 50 usuários em 1 minuto
    { duration: '2m', target: 100 }, // Estabilizando em 100 usuários por 2 minutos
    { duration: '1m', target: 0 } // Reduzindo para 0 usuários em 1 minuto
  ]
};

// Função que gera o resumo do teste no final, incluindo o relatório em HTML
export function handleSummary(data) {
  return {
    // Gerando o relatório em HTML no diretório './src/output/index.html'
    './src/output/index.html': htmlReport(data),
    // Gerando o resumo do teste no terminal (stdout)
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função principal que será executada pelos usuários virtuais
export default function () {
  // URL base da Dog CEO's Dog API
  const baseUrl = 'https://dog.ceo/api/';

  // Definindo os parâmetros para as requisições HTTP
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Resposta esperada da requisição (status HTTP 200)
  const OK = 200;

  // Simulando latência aleatória (entre 50ms e 500ms)
  sleep(Math.random() * 0.5);

  // Realizando uma requisição GET ao endpoint "/breeds/list/all" para obter a lista de raças
  const res = http.get(`${baseUrl}breeds/list/all`, params);

  // Registrando a duração da requisição para análise posterior
  getBreedsDuration.add(res.timings.duration);

  // Tentando converter a resposta para JSON
  let responseBody;
  try {
    responseBody = JSON.parse(res.body); // Converte o corpo da resposta para JSON
  } catch (error) {
    responseBody = {}; // Define um objeto vazio caso haja erro
  }

  // Simulando falhas aleatórias (falha em 5% dos casos)
  const randomFailure = Math.random() < 0.05;

  // Validando a resposta da requisição (status 200 e dados presentes na resposta)
  check(res, {
    'GET Breeds - Status 200': () => res.status === OK,
    'GET Breeds - Contains Breeds': () =>
      !randomFailure && responseBody.message !== undefined
  });
}
