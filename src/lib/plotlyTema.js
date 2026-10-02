// Profesyonel BIST / TradingView Kurumsal Finansal Grafik Teması (Delivery Vibrant Edition)
export const TEMA = {
  bg: '#08080A',
  surface: '#131316',
  surfaceElevated: '#1B1B1F',
  border: '#232327',
  grid: 'rgba(56, 56, 63, 0.45)',
  gridSubtle: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F8',
  textBright: '#FFFFFF',
  muted: '#9A9AA4',
  faint: '#5C5C64',
  gold: '#D7FF4E',
  goldStrong: '#E6FF80',
  blue: '#5B8DEF',
  blueStrong: '#2962FF',
  green: '#00F29D',
  greenDark: '#089981',
  greenFill: 'rgba(0, 242, 157, 0.16)',
  red: '#FF3355',
  redDark: '#F23645',
  redFill: 'rgba(255, 51, 85, 0.16)',
  orange: '#FF9800',
  purple: '#B180E0',
  cyan: '#00E5FF',
  colorway: ['#D7FF4E', '#5B8DEF', '#00F29D', '#B180E0', '#FF3355', '#00E5FF', '#FF9800'],
};

const eksenStil = {
  gridcolor: TEMA.grid,
  zerolinecolor: 'rgba(255, 255, 255, 0.08)',
  linecolor: TEMA.border,
  tickcolor: TEMA.border,
  showspikes: true,
  spikemode: 'across',
  spikesnap: 'cursor',
  spikethickness: 1,
  spikedash: 'dash',
  spikecolor: 'rgba(215, 255, 78, 0.5)',
  spikepresence: 'auto',
};

// Verilen layout'a ortak aracı kurum terminal teması uygular.
export function temaliLayout(layout = {}) {
  const out = {
    paper_bgcolor: TEMA.surface,
    plot_bgcolor: TEMA.surface,
    font: { family: "'JetBrains Mono', 'Inter', -apple-system, sans-serif", color: TEMA.muted, size: 11 },
    colorway: TEMA.colorway,
    legend: {
      font: { color: TEMA.muted, size: 10.5 },
      bgcolor: 'rgba(19, 19, 22, 0.85)',
      bordercolor: TEMA.border,
      borderwidth: 1,
    },
    hoverlabel: {
      bgcolor: '#1B1B1F',
      bordercolor: '#38383F',
      font: { family: "'JetBrains Mono', monospace", color: '#FFFFFF', size: 11 },
    },
    ...layout,
  };
  const eksenler = new Set(['xaxis', 'yaxis', ...Object.keys(layout).filter(k => /^[xy]axis\d*$/.test(k))]);
  eksenler.forEach(k => {
    out[k] = { ...eksenStil, ...(layout[k] || {}) };
  });
  return out;
}

// make_subplots(row_heights, vertical_spacing) karşılığı
export function satirAraliklari(yukseklikler, aralik = 0.03) {
  const n = yukseklikler.length;
  const toplam = yukseklikler.reduce((a, b) => a + b, 0);
  const bos = 1 - aralik * (n - 1);
  let ust = 1;
  return yukseklikler.map(h => {
    const boy = (h / toplam) * bos;
    const d = [Math.max(0, ust - boy), ust];
    ust -= boy + aralik;
    return d;
  });
}

// Alt panel eksenlerini (x2,y2,...) üretir; hepsi ilk x eksenine bağlıdır (shared_xaxes=True).
export function altPanelEksenleri(alanlar, sonEtiketAyari = {}, yan = 'right') {
  const l = {};
  alanlar.forEach((d, i) => {
    const s = i === 0 ? '' : String(i + 1);
    l['yaxis' + s] = {
      domain: d,
      anchor: 'x' + s,
      side: yan,
      fixedrange: false,
      tickfont: { size: 10, color: TEMA.muted, family: "'JetBrains Mono', monospace" },
    };
    l['xaxis' + s] = {
      domain: [0, 1],
      anchor: 'y' + s,
      ...(i === 0 ? {} : { matches: 'x' }),
      showticklabels: i === alanlar.length - 1,
      tickfont: { size: 10, color: TEMA.muted, family: "'JetBrains Mono', monospace" },
      ...(i === alanlar.length - 1 ? sonEtiketAyari : {}),
    };
  });
  return l;
}

// Hafta sonu ve seans dışı tatil günlerini grafikten kaldırıp sürekli mum dizisi sağlar
export const BIST_RANGEBREAKS = [
  { bounds: ['sat', 'mon'] }, // Cumartesi - Pazar aralığını kaldır
];

export const BIST_DARK_TEMPLATE = {
  layout: temaliLayout({
    paper_bgcolor: TEMA.surface,
    plot_bgcolor: TEMA.surface,
  })
};
