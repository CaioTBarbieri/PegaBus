/**
 * Dados de demonstração com linhas famosas de São Paulo
 * Usado para testar instantaneamente a aplicação antes ou em paralelo ao uso do token oficial
 */

export const DEMO_LINHAS = [
  {
    cl: 33857,
    lc: false,
    lt: "8000",
    tl: 10,
    sl: 1,
    tp: "TERM. LAPA",
    ts: "PÇA. RAMOS DE AZEVEDO",
    color: "#E11D48"
  },
  {
    cl: 33858,
    lc: false,
    lt: "8000",
    tl: 10,
    sl: 2,
    tp: "PÇA. RAMOS DE AZEVEDO",
    ts: "TERM. LAPA",
    color: "#E11D48"
  },
  {
    cl: 34120,
    lc: false,
    lt: "875H",
    tl: 10,
    sl: 1,
    tp: "TERM. LAPA",
    ts: "METRÔ STA. CRUZ",
    color: "#2563EB"
  },
  {
    cl: 34121,
    lc: false,
    lt: "875H",
    tl: 10,
    sl: 2,
    tp: "METRÔ STA. CRUZ",
    ts: "TERM. LAPA",
    color: "#2563EB"
  },
  {
    cl: 35012,
    lc: false,
    lt: "107T",
    tl: 10,
    sl: 1,
    tp: "METRÔ TUCURUVI",
    ts: "TERM. PINHEIROS",
    color: "#059669"
  }
];

export const DEMO_PARADAS = {
  33857: [
    { cp: 650001, np: "Terminal Lapa - Plataforma 1", ed: "Praça Miguel Dell'Erba, 50", py: -23.5208, px: -46.7029 },
    { cp: 650002, np: "Rua Guaicurus, 680", ed: "Rua Guaicurus, 680 - Lapa", py: -23.5242, px: -46.6974 },
    { cp: 650003, np: "Rua Clélia, 150", ed: "Rua Clélia, 150 - Água Branca", py: -23.5273, px: -46.6912 },
    { cp: 650004, np: "Sesc Pompéia", ed: "Rua Clélia, 930 - Pompeia", py: -23.5262, px: -46.6853 },
    { cp: 650005, np: "Allianz Parque / Av. Francisco Matarazzo", ed: "Av. Francisco Matarazzo, 1705", py: -23.5278, px: -46.6775 },
    { cp: 650006, np: "Parque da Água Branca", ed: "Av. Francisco Matarazzo, 694", py: -23.5305, px: -46.6667 },
    { cp: 650007, np: "Metrô Palmeiras - Barra Funda", ed: "Terminal Barra Funda", py: -23.5255, px: -46.6669 },
    { cp: 650008, np: "Elevado Presidente João Goulart", ed: "Minhocão / Sta. Cecília", py: -23.5358, px: -46.6541 },
    { cp: 650009, np: "Largo do Arouche", ed: "Largo do Arouche, 240", py: -23.5412, px: -46.6455 },
    { cp: 650010, np: "Praça Ramos de Azevedo (Teatro Municipal)", ed: "Praça Ramos de Azevedo", py: -23.5451, px: -46.6387 }
  ],
  34120: [
    { cp: 750001, np: "Terminal Lapa", ed: "Terminal Lapa", py: -23.5208, px: -46.7029 },
    { cp: 750002, np: "Rua Heitor Penteado, 1200", ed: "Rua Heitor Penteado - Sumarezinho", py: -23.5471, px: -46.6908 },
    { cp: 750003, np: "Metrô Vila Madalena", ed: "Rua Heitor Penteado", py: -23.5463, px: -46.6891 },
    { cp: 750004, np: "Metrô Sumaré / Santuário N. S. de Fátima", ed: "Av. Dr. Arnaldo, 1200", py: -23.5512, px: -46.6782 },
    { cp: 750005, np: "Metrô Clínicas / Av. Rebouças", ed: "Av. Dr. Arnaldo, 255", py: -23.5546, px: -46.6713 },
    { cp: 750006, np: "Av. Paulista (Masp)", ed: "Av. Paulista, 1578 - Bela Vista", py: -23.5614, px: -46.6559 },
    { cp: 750007, np: "Av. Paulista (Metrô Brigadeiro)", ed: "Av. Paulista, 400 - Paraíso", py: -23.5689, px: -46.6477 },
    { cp: 750008, np: "Metrô Paraíso", ed: "Rua Vergueiro / Praça Santa Generosa", py: -23.5762, px: -46.6418 },
    { cp: 750009, np: "Metrô Vila Mariana", ed: "Av. Prof. Noé Azevedo, 208", py: -23.5894, px: -46.6346 },
    { cp: 750010, np: "Metrô Santa Cruz", ed: "Rua Domingos de Morais, 2564", py: -23.5991, px: -46.6372 }
  ],
  35012: [
    { cp: 850001, np: "Terminal Metrô Tucuruvi", ed: "Av. Dr. Antonio Maria La Veti, 100", py: -23.4799, px: -46.6038 },
    { cp: 850002, np: "Metrô Santana", ed: "Rua Dr. Gabriel Piza, 230", py: -23.5025, px: -46.6247 },
    { cp: 850003, np: "Ponte das Bandeiras / Rio Tietê", ed: "Av. Santos Dumont", py: -23.5221, px: -46.6292 },
    { cp: 850004, np: "Estação da Luz / Parque Jardim da Luz", ed: "Praça da Luz, 1", py: -23.5350, px: -46.6340 },
    { cp: 850005, np: "Praça da República", ed: "Av. São Luís, 200", py: -23.5446, px: -46.6432 },
    { cp: 850006, np: "Rua da Consolação, 1800", ed: "Rua da Consolação, 1800", py: -23.5539, px: -46.6575 },
    { cp: 850007, np: "Av. Rebouças (Hospital das Clínicas)", ed: "Av. Rebouças, 381", py: -23.5574, px: -46.6685 },
    { cp: 850008, np: "Metrô Faria Lima", ed: "Av. Brigadeiro Faria Lima, 950", py: -23.5676, px: -46.6938 },
    { cp: 850009, np: "Terminal Pinheiros", ed: "Rua Gilberto Sabino, 130", py: -23.5671, px: -46.7025 }
  ]
};

// Gera posições de ônibus simuladas com pequenos deslocamentos no tempo
export function getDemoPositions(codigoLinha) {
  const lineCode = Number(codigoLinha);
  const paradas = DEMO_PARADAS[lineCode] || DEMO_PARADAS[33857];
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Cria 3 a 4 veículos distribuídos ao longo das paradas com pequena variação
  const seconds = now.getSeconds();
  const step = (seconds % 60) / 60; // 0..1

  const vehicles = [
    {
      p: `${(lineCode % 1000) * 10 + 1}`,
      a: true, // Acessível
      fromIndex: 1,
      toIndex: 2
    },
    {
      p: `${(lineCode % 1000) * 10 + 2}`,
      a: true,
      fromIndex: 4,
      toIndex: 5
    },
    {
      p: `${(lineCode % 1000) * 10 + 3}`,
      a: false,
      fromIndex: 7,
      toIndex: 8
    }
  ];

  const vs = vehicles.map(v => {
    const p1 = paradas[v.fromIndex % paradas.length];
    const p2 = paradas[v.toIndex % paradas.length];

    const lat = p1.py + (p2.py - p1.py) * step;
    const lng = p1.px + (p2.px - p1.px) * step;

    return {
      p: v.p,
      a: v.a,
      py: Number(lat.toFixed(6)),
      px: Number(lng.toFixed(6)),
      ta: now.toISOString()
    };
  });

  return {
    hr: timeString,
    vs
  };
}

// Gera previsão simulada para a linha
export function getDemoPrevisao(codigoLinha) {
  const lineCode = Number(codigoLinha);
  const paradas = DEMO_PARADAS[lineCode] || DEMO_PARADAS[33857];
  const now = new Date();
  const hr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const ps = paradas.map((parada, idx) => {
    const min1 = (idx * 3 + 2) % 18 + 1;
    const min2 = min1 + 8 + (idx % 4);

    const d1 = new Date(now.getTime() + min1 * 60000);
    const d2 = new Date(now.getTime() + min2 * 60000);

    const t1 = `${String(d1.getHours()).padStart(2, '0')}:${String(d1.getMinutes()).padStart(2, '0')}`;
    const t2 = `${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}`;

    return {
      cp: parada.cp,
      np: parada.np,
      py: parada.py,
      px: parada.px,
      vs: [
        {
          p: `${(lineCode % 1000) * 10 + 1}`,
          t: t1,
          a: true,
          ta: now.toISOString(),
          minutosAprox: min1
        },
        {
          p: `${(lineCode % 1000) * 10 + 2}`,
          t: t2,
          a: true,
          ta: now.toISOString(),
          minutosAprox: min2
        }
      ]
    };
  });

  return {
    hr,
    p: {
      cp: paradas[0].cp,
      np: paradas[0].np,
      l: [
        {
          cl: lineCode,
          c: "8000-10",
          sl: 1,
          lt0: paradas[0].np,
          lt1: paradas[paradas.length - 1].np,
          qv: 3,
          vs: [
            { p: "80011", t: "05 min", a: true },
            { p: "80012", t: "14 min", a: true }
          ]
        }
      ]
    },
    ps // lista detalhada por parada
  };
}
