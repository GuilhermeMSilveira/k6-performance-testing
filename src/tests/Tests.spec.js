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
// Importando a classe 'Rate' para medir o percentual de requisições falhas
import { Rate } from 'k6/metrics';

// Criando uma métrica para medir o tempo de duração das requisições feitas ao endpoint de raças de cães
export const getBreedsDuration = new Trend('get_breeds_duration', true);
// Criando uma métrica para medir as falhas nas requisições
export const errorRate = new Rate('error_rate');

// Configurações do teste
export const options = {
  // Definindo limiares de performance
  thresholds: {
    // 95% das requisições devem ter um tempo de resposta inferior a 5700ms
    http_req_duration: ['p(95)<5700'], // Usando p(95) para indicar 95% das requisições
    // A taxa de falhas deve ser menor que 12%
    http_req_failed: ['rate<0.12']
  },
  // Definindo as fases do teste (simulando aumento de carga)
  stages: [
    { duration: '43s', target: 10 }, // Inicia com 10 usuários
    { duration: '43s', target: 50 }, // Aumenta para 50 usuários
    { duration: '43s', target: 100 }, // Aumenta para 100 usuários
    { duration: '43s', target: 150 }, // Aumenta para 150 usuários
    { duration: '43s', target: 200 }, // Aumenta para 200 usuários
    { duration: '43s', target: 250 }, // Aumenta para 250 usuários
    { duration: '42s', target: 300 } // Atinge o máximo de 300 usuários
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

  // Verificando se a resposta foi bem-sucedida
  const isSuccessful = res.status === OK && responseBody.message !== undefined;

  // Validando a resposta da requisição (status 200 e dados presentes na resposta)
  check(res, {
    'GET Breeds - Status 200': () => res.status === OK,
    'GET Breeds - Contains Breeds': () => responseBody.message !== undefined
  });

  // Registra a falha na métrica 'errorRate' se a requisição não foi bem-sucedida
  if (!isSuccessful) {
    errorRate.add(1); // Adiciona falha
  } else {
    errorRate.add(0); // Adiciona sucesso
  }
}
