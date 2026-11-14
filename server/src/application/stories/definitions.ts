import type { StoryDefinition } from '../../domain/story';

export const STORIES: StoryDefinition[] = [
  {
    id: 'rs-cheia-jul-2026',
    title: 'Cheia de julho de 2026 no Rio Grande do Sul',
    subtitle: 'Vale do Taquari, Rio Caí e Guaíba vistos pelo radar NISAR antes e depois',
    regionId: 'rs',
    eventDate: '2026-07-22',
    window: { start: '2026-07-01', end: '2026-08-05' },
    places: [
      { name: 'Porto Alegre / Guaíba', lon: -51.23, lat: -30.03 },
      { name: 'Lajeado (Vale do Taquari)', lon: -51.96, lat: -29.47 },
      { name: 'Montenegro (Rio Caí)', lon: -51.46, lat: -29.69 },
    ],
    narrative: {
      summary:
        'Em 22 de julho de 2026, chuvas intensas fizeram o rio Taquari ultrapassar a cota de inundação. ' +
        'O rio Caí entrou em alerta vermelho e mais de 160 municípios gaúchos foram afetados, segundo a imprensa. ' +
        'O radar do NISAR enxerga através das nuvens, então registrou a região durante a chuva, quando satélites ópticos só veem nuvem.',
      whatToLookFor: [
        'Água parada (rios, lagoas, áreas inundadas) reflete o pulso do radar para longe do satélite e aparece escura.',
        'Vegetação e áreas construídas parcialmente alagadas podem ficar mais claras em HH: o sinal bate na água e volta pelo tronco ou pela parede ("double bounce").',
        'Compare apenas imagens do mesmo stackId (mesma trilha, direção e frame): mudar a geometria de visada muda o brilho mesmo sem mudança no chão.',
      ],
      physicalDrivers: [
        'Chuva intensa e persistente nas bacias do Taquari, Caí, Jacuí e Sinos, que drenam para o Guaíba.',
        'Meteorologistas associaram o episódio ao El Niño 2026/2027, que tende a aumentar as chuvas no Sul do Brasil.',
        'Vales encaixados, como o do Taquari, concentram e aceleram a água; a planície do delta do Jacuí e do Guaíba acumula.',
      ],
      caveats: [
        'As imagens de prévia (browse) são renderizações visuais, não valores calibrados de retroespalhamento.',
        'Vento forte deixa a superfície da água rugosa, e ela pode aparecer clara em vez de escura.',
        'Uma passagem pode ocorrer antes ou depois do pico da cheia; o nível dos rios muda de hora em hora.',
        'Datas e números do evento vêm da imprensa; confirme com a Defesa Civil do RS.',
      ],
    },
    sources: [
      {
        title: 'Cheia de 22/07 apontada como a primeira grande inundação associada ao El Niño 2026/2027',
        publisher: 'Diário do Comércio',
        url: 'https://diariodocomercio.com.br/geral/?p=4968',
      },
      {
        title: 'Governador visita o Vale do Taquari após a primeira enchente de 2026',
        publisher: 'Jornal do Comércio',
        url: 'https://www.jornaldocomercio.com/jornal-cidades/2026/07/1257468-leite-visita-vale-do-taquari-e-admite-falha-na-comunicacao-de-alertas.html',
      },
      {
        title: 'Chuvas no RS: danos se espalham e cheia do Rio Caí ameaça Porto Alegre',
        publisher: 'Band',
        url: 'https://www.band.com.br/noticias/jornal-da-band/ultimas/chuvas-no-rs-danos-se-espalham-e-cheia-do-rio-cai-ameaca-porto-alegre-202607232019',
      },
      {
        title: 'Chuvas causam danos em 85 cidades e deixam rios sob risco muito alto no RS',
        publisher: 'Brasil de Fato',
        url: 'https://www.brasildefato.com.br/2026/07/29/chuvas-causam-danos-em-85-cidades-e-deixam-rios-sob-risco-muito-alto-no-rs/',
      },
    ],
  },
];
