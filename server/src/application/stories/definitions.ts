import type { StoryDefinition } from '../../domain/story';

export const STORIES: StoryDefinition[] = [
  {
    id: 'rs-flood-jul-2026',
    title: 'July 2026 flood in Rio Grande do Sul',
    subtitle: 'Taquari Valley, Caí River and Guaíba seen by the NISAR radar before and after',
    regionId: 'rs',
    eventDate: '2026-07-22',
    window: { start: '2026-07-01', end: '2026-08-05' },
    places: [
      { name: 'Porto Alegre / Guaíba', lon: -51.23, lat: -30.03 },
      { name: 'Lajeado (Taquari Valley)', lon: -51.96, lat: -29.47 },
      { name: 'Montenegro (Caí River)', lon: -51.46, lat: -29.69 },
    ],
    narrative: {
      summary:
        'On July 22, 2026, heavy rain pushed the Taquari River above flood level. ' +
        'The Caí River went on red alert and more than 160 municipalities in Rio Grande do Sul were affected, according to press reports. ' +
        "NISAR's radar sees through clouds, so it recorded the region during the rain, when optical satellites only see clouds.",
      whatToLookFor: [
        'Still water (rivers, lakes, flooded areas) reflects the radar pulse away from the satellite and appears dark.',
        'Partly flooded vegetation and built-up areas can look brighter in HH: the signal hits the water and bounces back off tree trunks or walls ("double bounce").',
        'Only compare images with the same stackId (same track, direction and frame): changing the viewing geometry changes the brightness even when nothing changed on the ground.',
      ],
      physicalDrivers: [
        'Heavy, persistent rain in the Taquari, Caí, Jacuí and Sinos river basins, which drain into the Guaíba.',
        'Meteorologists linked the event to the 2026/2027 El Niño, which tends to bring more rain to southern Brazil.',
        'Deep, narrow valleys such as the Taquari concentrate the water and speed it up; the plain of the Jacuí delta and the Guaíba collects it.',
      ],
      caveats: [
        'The preview (browse) images are visual renderings, not calibrated backscatter values.',
        'Strong wind makes the water surface rough, and then it can appear bright instead of dark.',
        'A pass can happen before or after the flood peak; river levels change from hour to hour.',
        'Event dates and numbers come from the press; check them with the Rio Grande do Sul Civil Defense.',
      ],
    },
    sources: [
      {
        title: 'July 22 flood identified as the first major flood linked to the 2026/2027 El Niño',
        publisher: 'Diário do Comércio',
        url: 'https://diariodocomercio.com.br/geral/?p=4968',
      },
      {
        title: 'Governor visits the Taquari Valley after the first flood of 2026',
        publisher: 'Jornal do Comércio',
        url: 'https://www.jornaldocomercio.com/jornal-cidades/2026/07/1257468-leite-visita-vale-do-taquari-e-admite-falha-na-comunicacao-de-alertas.html',
      },
      {
        title: 'Rain in Rio Grande do Sul: damage spreads and the Caí River flood threatens Porto Alegre',
        publisher: 'Band',
        url: 'https://www.band.com.br/noticias/jornal-da-band/ultimas/chuvas-no-rs-danos-se-espalham-e-cheia-do-rio-cai-ameaca-porto-alegre-202607232019',
      },
      {
        title: 'Rain causes damage in 85 cities and leaves rivers at very high risk in Rio Grande do Sul',
        publisher: 'Brasil de Fato',
        url: 'https://www.brasildefato.com.br/2026/07/29/chuvas-causam-danos-em-85-cidades-e-deixam-rios-sob-risco-muito-alto-no-rs/',
      },
    ],
  },
];
