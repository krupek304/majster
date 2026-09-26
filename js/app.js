import {
  pobierzProjekty, dodajProjekt, usunProjekt,
  pobierzKategorie, dodajKategorie, aktualizujKategorie, usunKategorieRazemZCennikiem,
  pobierzCennik, dodajPozycjeCennika, aktualizujPozycjeCennika, usunPozycjeCennika,
  pobierzPozycjeProjektu, dodajPozycjeKosztorysu, aktualizujPozycjeKosztorysu, usunPozycjeKosztorysu,
  pobierzWszystkiePozycjeKosztorysu,
  pobierzPlatnosciProjektu, dodajPlatnosc, usunPlatnosc,
  pobierzDaneFirmy, zapiszDaneFirmy,
} from './db.js';
import { kwotaPozycji, sumyKategorii, sumyPolem, sumaCalkowita, sumaPlatnosci, formatujKwote } from './calc.js';

const app = document.getElementById('app');
const topbarTitle = document.getElementById('topbar-title');
const dialog = document.getElementById('dialog');
const tabButtons = document.querySelectorAll('.tab-btn');

const state = { widok: 'projekty', projektId: null, grupowanie: 'kategoria' };

// Zamknięty zestaw jednostek - te same, których używają domyślne pozycje
// cennika w db.js. Zamiast wolnego tekstu (łatwo o literówkę typu "m2"/"m²"/"metr")
// wybiera się z listy, żeby sumy i grupowanie zawsze się zgadzały.
const JEDNOSTKI = ['szt.', 'm2', 'mb', 'pkt', 'kpl.', 'usł.'];

// Tylko podpowiedzi (datalist) - pole zostaje wolnym tekstem, bo nazwy
// pomieszczeń są unikalne dla każdego mieszkania i nie da się ich z góry zgadnąć.
const POMIESZCZENIA_PODPOWIEDZI = [
  'Kuchnia', 'Łazienka', 'Salon', 'Sypialnia', 'Przedpokój / Hol', 'Balkon / Taras', 'Cały dom / mieszkanie',
];

// Ikony kategorii - tylko orientacja wzrokowa w długiej liście, nie wpływają na dane.
const IKONY_KATEGORII = {
  'Przygotowanie i planowanie': '📋',
  'Prace rozbiórkowe i konstrukcyjne': '🔨',
  'Instalacje wewnętrzne (stan surowy)': '🔌',
  'Prace tynkarskie i wylewki': '🧱',
  'Zabudowy z płyt gipsowo-kartonowych (GK)': '📐',
  'Prace glazurnicze i terakota': '🚿',
  'Gładzie i przygotowanie ścian do malowania': '🖌️',
  'Podłogi': '🪵',
  'Stolarka drzwiowa i okienna': '🚪',
  'Malowanie i wykończenie ścian': '🎨',
  'Biały montaż i osprzęt': '🚰',
  'Kuchnia i AGD': '🍳',
  'Sprzątanie i odbiór': '🧹',
  'Prace dodatkowe i opcjonalne': '✨',
};
function ikonaKategorii(nazwa) {
  return IKONY_KATEGORII[nazwa] || '📁';
}

// Paleta do paska podziału kosztów - cykliczna, wystarcza na więcej niż 14 kategorii.
const PALETA_WYKRESU = ['#ea580c', '#0ea5e9', '#22c55e', '#a855f7', '#f43f5e', '#eab308', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#ec4899', '#06b6d4', '#8b5cf6', '#64748b'];

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function htmlSelectJednostka(id, wybrana) {
  // Jeśli istniejąca pozycja ma jednostkę spoza standardowej listy (np. wpisaną
  // ręcznie przed wprowadzeniem dropdowna), dopisz ją jako dodatkową opcję -
  // żeby zapisanie formularza bez zmian nie podmieniło jej po cichu na "szt.".
  const opcje = JEDNOSTKI.includes(wybrana) || !wybrana ? JEDNOSTKI : [wybrana, ...JEDNOSTKI];
  const domyslna = wybrana && opcje.includes(wybrana) ? wybrana : JEDNOSTKI[0];
  return `
    <select id="${id}">
      ${opcje.map((j) => `<option value="${esc(j)}" ${j === domyslna ? 'selected' : ''}>${esc(j)}</option>`).join('')}
    </select>
  `;
}

// Kategorie widoczne w dropdownach do wyboru: bez ukrytych, chyba że to
// aktualna kategoria edytowanej pozycji (nie chowamy tego, co już wybrane).
function kategorieWidoczne(kategorie, zachowajNazwe) {
  return kategorie.filter((k) => !k.ukryta || k.nazwa === zachowajNazwe);
}

function formatujStawke(stawka, jednostka) {
  if (!stawka) return 'stawka nieustalona';
  return `${formatujKwote(stawka)}/${jednostka}`;
}

// ---------- Nawigacja ----------

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => ustawWidok(btn.dataset.widok));
});

function ustawWidok(widok, projektId = null) {
  state.widok = widok;
  state.projektId = projektId;
  tabButtons.forEach((btn) => {
    if (btn.dataset.widok === widok) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  render();
}

async function render() {
  if (state.widok === 'projekty') return renderProjekty();
  if (state.widok === 'kosztorys') return renderKosztorys(state.projektId);
  if (state.widok === 'cennik') return renderCennik();
  if (state.widok === 'ustawienia') return renderUstawienia();
}

// ---------- Widok: Projekty ----------

async function renderProjekty() {
  topbarTitle.textContent = 'O!Majster';
  const projekty = await pobierzProjekty();
  const sumyProjektow = await Promise.all(
    projekty.map(async (p) => sumaCalkowita(await pobierzPozycjeProjektu(p.id)))
  );

  const listaHtml = projekty.length === 0
    ? '<div class="pusty-stan">Brak projektów.<br>Dodaj pierwszy kosztorys.</div>'
    : projekty.map((p, i) => `
      <div class="karta karta-projekt" data-id="${p.id}">
        <div>
          <div class="nazwa">${esc(p.nazwa)}</div>
          <div class="klient">${esc(p.klient) || 'Bez klienta'} &middot; ${new Date(p.data_utworzenia).toLocaleDateString('pl-PL')}</div>
        </div>
        <div class="suma">${formatujKwote(sumyProjektow[i])}</div>
      </div>
    `).join('');

  app.innerHTML = `
    ${listaHtml}
    <button class="btn" id="btn-nowy-projekt">+ Nowy projekt</button>
  `;

  app.querySelectorAll('.karta-projekt').forEach((el) => {
    el.addEventListener('click', () => ustawWidok('kosztorys', el.dataset.id));
  });
  document.getElementById('btn-nowy-projekt').addEventListener('click', dialogNowyProjekt);
}

function dialogNowyProjekt() {
  otworzDialog(`
    <h2>Nowy projekt</h2>
    <div class="pole">
      <label for="pole-nazwa">Nazwa projektu</label>
      <input id="pole-nazwa" type="text" placeholder="np. Mieszkanie ul. Kwiatowa 5" />
    </div>
    <div class="pole">
      <label for="pole-klient">Klient (opcjonalnie)</label>
      <input id="pole-klient" type="text" placeholder="np. Jan Kowalski" />
    </div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">Zapisz</button>
    </div>
  `);
  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const nazwa = document.getElementById('pole-nazwa').value.trim();
    if (!nazwa) return;
    const klient = document.getElementById('pole-klient').value;
    const projekt = await dodajProjekt({ nazwa, klient });
    zamknijDialog();
    ustawWidok('kosztorys', projekt.id);
  });
}

// ---------- Widok: Kosztorys projektu ----------

async function renderKosztorys(projektId) {
  const projekty = await pobierzProjekty();
  const projekt = projekty.find((p) => p.id === projektId);
  if (!projekt) return ustawWidok('projekty');

  topbarTitle.innerHTML = `<button class="wstecz" id="btn-wstecz">←</button> ${esc(projekt.nazwa)}`;
  document.getElementById('btn-wstecz').addEventListener('click', () => ustawWidok('projekty'));

  const [pozycje, platnosci, firma] = await Promise.all([
    pobierzPozycjeProjektu(projektId),
    pobierzPlatnosciProjektu(projektId),
    pobierzDaneFirmy(),
  ]);

  const pole = state.grupowanie === 'pomieszczenie' ? 'pomieszczenie' : 'kategoria';
  const domyslnaEtykieta = state.grupowanie === 'pomieszczenie' ? 'Bez pomieszczenia' : 'Bez kategorii';
  const grupy = grupujPozycje(pozycje, pole, domyslnaEtykieta);
  const suma = sumaCalkowita(pozycje);

  const grupyHtml = pozycje.length === 0
    ? '<div class="pusty-stan">Brak pozycji.<br>Dodaj pierwszą wykonaną pracę.</div>'
    : grupy.map(({ klucz, pozycje: poz, suma: sumaGrupy }) => `
      <div class="kategoria-naglowek"><span>${state.grupowanie === 'kategoria' ? ikonaKategorii(klucz) + ' ' : ''}${esc(klucz)}</span><span>${formatujKwote(sumaGrupy)}</span></div>
      ${poz.map((p) => `
        <div class="pozycja" data-edytuj="${p.id}">
          <div>
            <div class="nazwa">${esc(p.nazwa)}</div>
            <div class="szczegoly">${p.ilosc} ${esc(p.jednostka)} &times; ${formatujStawke(p.stawka, p.jednostka)}${htmlDrugiWymiar(p)}</div>
          </div>
          <div class="kwota">${p.stawka ? formatujKwote(kwotaPozycji(p.ilosc, p.stawka)) : '—'}</div>
          <button class="btn-usun" data-usun="${p.id}" aria-label="Usuń" title="Usuń">🗑</button>
        </div>
      `).join('')}
    `).join('');

  app.innerHTML = `
    <div class="naglowek-druku">
      ${firma.nazwa || firma.telefon || firma.email ? `<div class="firma-druk">${[esc(firma.nazwa), firma.telefon ? 'tel. ' + esc(firma.telefon) : '', esc(firma.email)].filter(Boolean).join(' &middot; ')}</div>` : ''}
      <h1>Kosztorys</h1>
      <div class="meta-druku">
        <div><strong>Projekt:</strong> ${esc(projekt.nazwa)}</div>
        ${projekt.klient ? `<div><strong>Klient:</strong> ${esc(projekt.klient)}</div>` : ''}
        <div><strong>Data:</strong> ${new Date().toLocaleDateString('pl-PL')}</div>
      </div>
    </div>
    ${projekt.klient ? `<div class="uwaga">Klient: ${esc(projekt.klient)}</div>` : ''}
    ${pozycje.length > 0 ? `
      <div class="przelacznik-grupowania">
        <button class="btn-segment ${state.grupowanie === 'kategoria' ? 'aktywny' : ''}" data-grupuj="kategoria">Wg kategorii</button>
        <button class="btn-segment ${state.grupowanie === 'pomieszczenie' ? 'aktywny' : ''}" data-grupuj="pomieszczenie">Wg pomieszczenia</button>
      </div>
    ` : ''}
    <div class="karta">${grupyHtml}</div>
    <button class="btn" id="btn-dodaj-pozycje">+ Dodaj pozycję</button>
    ${htmlPasekPodzialu(pozycje)}
    ${htmlPlatnosci(platnosci, suma)}
    <div class="podsumowanie">
      <span>Razem</span>
      <span class="kwota-calkowita">${formatujKwote(suma)}</span>
    </div>
    <div class="akcje-eksportu">
      <button class="btn wtorny" id="btn-drukuj">Drukuj / PDF</button>
      <button class="btn wtorny" id="btn-csv">Eksport CSV</button>
      <button class="btn wtorny niebezpieczny" id="btn-usun-projekt">Usuń projekt</button>
    </div>
  `;

  document.getElementById('btn-dodaj-pozycje').addEventListener('click', () => dialogPozycja(projektId));
  document.getElementById('btn-drukuj').addEventListener('click', () => window.print());
  document.getElementById('btn-csv').addEventListener('click', () => eksportujCSV(projekt, pozycje));
  document.getElementById('btn-usun-projekt').addEventListener('click', async () => {
    if (!confirm(`Usunąć projekt "${projekt.nazwa}" wraz ze wszystkimi pozycjami?`)) return;
    await usunProjekt(projektId);
    ustawWidok('projekty');
  });
  app.querySelectorAll('[data-grupuj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grupowanie = btn.dataset.grupuj;
      renderKosztorys(projektId);
    });
  });
  app.querySelectorAll('[data-edytuj]').forEach((el) => {
    el.addEventListener('click', () => {
      const pozycja = pozycje.find((p) => p.id === el.dataset.edytuj);
      dialogPozycja(projektId, pozycja);
    });
  });
  app.querySelectorAll('[data-usun]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await usunPozycjeKosztorysu(btn.dataset.usun);
      renderKosztorys(projektId);
    });
  });

  const btnDodajPlatnosc = document.getElementById('btn-dodaj-platnosc');
  if (btnDodajPlatnosc) btnDodajPlatnosc.addEventListener('click', () => dialogPlatnosc(projektId));
  app.querySelectorAll('[data-usun-platnosc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await usunPlatnosc(btn.dataset.usunPlatnosc);
      renderKosztorys(projektId);
    });
  });
}

// Tag drugiego wymiaru w wierszu pozycji: gdy grupujemy wg kategorii, pokaż
// pomieszczenie (jeśli podane); gdy grupujemy wg pomieszczenia, pokaż kategorię.
function htmlDrugiWymiar(p) {
  if (state.grupowanie === 'kategoria') {
    return p.pomieszczenie ? ` &middot; 📍 ${esc(p.pomieszczenie)}` : '';
  }
  return p.kategoria ? ` &middot; ${ikonaKategorii(p.kategoria)} ${esc(p.kategoria)}` : '';
}

function grupujPozycje(pozycje, pole, domyslnaEtykieta) {
  const sumy = sumyPolem(pozycje, pole, domyslnaEtykieta);
  return sumy.map(({ klucz, suma }) => ({
    klucz,
    suma,
    pozycje: pozycje.filter((p) => (p[pole] || domyslnaEtykieta) === klucz),
  }));
}

// Prosty pasek podziału kosztów wg kategorii (zawsze wg kategorii, niezależnie
// od przełącznika grupowania listy) - "gdzie poszły pieniądze" na pierwszy rzut oka.
function htmlPasekPodzialu(pozycje) {
  const suma = sumaCalkowita(pozycje);
  if (suma <= 0) return '';
  const grupy = sumyKategorii(pozycje).filter((g) => g.suma > 0);
  if (grupy.length < 2) return '';
  const segmenty = grupy.map((g, i) => {
    const proc = (g.suma / suma) * 100;
    const kolor = PALETA_WYKRESU[i % PALETA_WYKRESU.length];
    return `<div class="segment-paska" style="width:${proc.toFixed(2)}%; background:${kolor}" title="${esc(g.kategoria)}: ${formatujKwote(g.suma)} (${proc.toFixed(0)}%)"></div>`;
  }).join('');
  const legenda = grupy.map((g, i) => {
    const proc = Math.round((g.suma / suma) * 100);
    const kolor = PALETA_WYKRESU[i % PALETA_WYKRESU.length];
    return `<div class="legenda-pozycja"><span class="kropka" style="background:${kolor}"></span>${ikonaKategorii(g.kategoria)} ${esc(g.kategoria)} &middot; ${proc}%</div>`;
  }).join('');
  return `
    <div class="podzial-kosztow">
      <div class="pasek-podzialu">${segmenty}</div>
      <div class="legenda">${legenda}</div>
    </div>
  `;
}

// Płatności - ile klient wpłacił, ile zostało. Realny problem fachowca,
// nie tylko sam koszt prac.
function htmlPlatnosci(platnosci, suma) {
  const zaplacono = sumaPlatnosci(platnosci);
  const pozostalo = Math.round((suma - zaplacono) * 100) / 100;
  const listaHtml = platnosci.map((p) => `
    <div class="pozycja" data-usun-platnosc="${p.id}">
      <div>
        <div class="nazwa">${formatujKwote(p.kwota)}</div>
        <div class="szczegoly">${new Date(p.data).toLocaleDateString('pl-PL')}${p.opis ? ' &middot; ' + esc(p.opis) : ''}</div>
      </div>
    </div>
  `).join('');
  return `
    <div class="karta karta-platnosci">
      <div class="kategoria-naglowek"><span>Płatności</span></div>
      <div class="platnosci-podsumowanie">
        <div><span class="etykieta">Zapłacono</span><br><span class="kwota-zaplacono">${formatujKwote(zaplacono)}</span></div>
        <div><span class="etykieta">Pozostało</span><br><span class="kwota-pozostalo">${formatujKwote(pozostalo)}</span></div>
      </div>
      ${listaHtml}
      <button class="btn wtorny maly" id="btn-dodaj-platnosc">+ Dodaj wpłatę</button>
    </div>
  `;
}

function dialogPlatnosc(projektId) {
  const dzisiaj = new Date().toISOString().slice(0, 10);
  otworzDialog(`
    <h2>Nowa wpłata</h2>
    <div class="pole">
      <label for="pole-kwota-platnosci">Kwota (zł)</label>
      <input id="pole-kwota-platnosci" type="number" step="0.01" min="0" value="0" />
    </div>
    <div class="pole">
      <label for="pole-data-platnosci">Data</label>
      <input id="pole-data-platnosci" type="date" value="${dzisiaj}" />
    </div>
    <div class="pole">
      <label for="pole-opis-platnosci">Opis (opcjonalnie)</label>
      <input id="pole-opis-platnosci" type="text" placeholder="np. zaliczka" />
    </div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">Dodaj</button>
    </div>
  `);
  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const kwota = document.getElementById('pole-kwota-platnosci').value;
    if (!kwota || Number(kwota) <= 0) return;
    await dodajPlatnosc(projektId, {
      kwota,
      data: document.getElementById('pole-data-platnosci').value,
      opis: document.getElementById('pole-opis-platnosci').value,
    });
    zamknijDialog();
    renderKosztorys(projektId);
  });
}

async function dialogPozycja(projektId, edytowanaPozycja = null) {
  const [kategorieWszystkie, cennik] = await Promise.all([pobierzKategorie(), pobierzCennik()]);
  const kategorie = kategorieWidoczne(kategorieWszystkie, edytowanaPozycja?.kategoria);
  const edycja = !!edytowanaPozycja;

  otworzDialog(`
    <h2>${edycja ? 'Edytuj pozycję' : 'Nowa pozycja'}</h2>
    ${cennik.length > 0 ? `
      <div class="pole">
        <label for="szukaj-cennik">Z cennika (opcjonalnie)</label>
        <input id="szukaj-cennik" type="text" placeholder="Szukaj czynności..." style="margin-bottom:6px;" />
        ${htmlSelectCennik('pole-z-cennika', kategorieWszystkie, cennik)}
      </div>
    ` : ''}
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" value="${esc(edytowanaPozycja?.nazwa)}" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria</label>
      <select id="pole-kategoria">
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}" ${edytowanaPozycja?.kategoria === k.nazwa ? 'selected' : ''}>${ikonaKategorii(k.nazwa)} ${esc(k.nazwa)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-pomieszczenie">Pomieszczenie (opcjonalnie)</label>
      <input id="pole-pomieszczenie" type="text" list="lista-pomieszczen" placeholder="np. Łazienka" value="${esc(edytowanaPozycja?.pomieszczenie ?? '')}" />
      <datalist id="lista-pomieszczen">
        ${POMIESZCZENIA_PODPOWIEDZI.map((p) => `<option value="${esc(p)}"></option>`).join('')}
      </datalist>
    </div>
    <div class="pole">
      <label for="pole-ilosc">Ilość</label>
      <input id="pole-ilosc" type="number" step="0.01" min="0" value="${edytowanaPozycja?.ilosc ?? 1}" />
    </div>
    <div class="pole">
      <label for="pole-jednostka">Jednostka</label>
      ${htmlSelectJednostka('pole-jednostka', edytowanaPozycja?.jednostka ?? 'szt.')}
    </div>
    <div class="pole">
      <label for="pole-stawka">Stawka za jednostkę (zł)</label>
      <input id="pole-stawka" type="number" step="0.01" min="0" value="${edytowanaPozycja?.stawka ?? 0}" />
    </div>
    <div class="pole">
      <label>Kwota</label>
      <div id="podglad-kwoty" style="font-weight:600; font-size:16px;">0,00 zł</div>
    </div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">${edycja ? 'Zapisz zmiany' : 'Dodaj'}</button>
    </div>
  `);

  const poleNazwa = document.getElementById('pole-nazwa');
  const poleKategoria = document.getElementById('pole-kategoria');
  const polePomieszczenie = document.getElementById('pole-pomieszczenie');
  const poleIlosc = document.getElementById('pole-ilosc');
  const poleJednostka = document.getElementById('pole-jednostka');
  const poleStawka = document.getElementById('pole-stawka');
  const podgladKwoty = document.getElementById('podglad-kwoty');
  const poleZCennika = document.getElementById('pole-z-cennika');
  const szukajCennik = document.getElementById('szukaj-cennik');

  function przeliczPodglad() {
    podgladKwoty.textContent = formatujKwote(kwotaPozycji(poleIlosc.value, poleStawka.value));
  }
  przeliczPodglad();
  [poleIlosc, poleStawka].forEach((el) => el.addEventListener('input', przeliczPodglad));

  if (poleZCennika) {
    poleZCennika.addEventListener('change', () => {
      const wybrany = cennik.find((c) => c.id === poleZCennika.value);
      if (!wybrany) return;
      poleNazwa.value = wybrany.nazwa;
      poleKategoria.value = wybrany.kategoria;
      poleJednostka.value = wybrany.jednostka;
      poleStawka.value = wybrany.stawka;
      przeliczPodglad();
    });
  }
  if (szukajCennik) {
    szukajCennik.addEventListener('input', () => filtrujSelectCennik(szukajCennik, poleZCennika));
  }

  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const nazwa = poleNazwa.value.trim();
    if (!nazwa) return;
    const dane = {
      nazwa,
      kategoria: poleKategoria.value,
      pomieszczenie: polePomieszczenie.value,
      jednostka: poleJednostka.value || 'szt.',
      ilosc: poleIlosc.value,
      stawka: poleStawka.value,
    };
    if (edycja) {
      await aktualizujPozycjeKosztorysu({ ...edytowanaPozycja, ...dane, ilosc: Number(dane.ilosc), stawka: Number(dane.stawka), pomieszczenie: dane.pomieszczenie.trim() });
    } else {
      await dodajPozycjeKosztorysu(projektId, dane);
    }
    zamknijDialog();
    renderKosztorys(projektId);
  });
}

// Ukrywa (nie usuwa z DOM) opcje/optgroupy z cennika niepasujące do frazy -
// select zostaje ten sam element, więc reszta obsługi (change -> autofill)
// działa bez zmian.
function filtrujSelectCennik(input, select) {
  const fraza = input.value.trim().toLowerCase();
  select.querySelectorAll('optgroup').forEach((grupa) => {
    let widoczneWGrupie = 0;
    grupa.querySelectorAll('option').forEach((opt) => {
      const pasuje = !fraza || opt.textContent.toLowerCase().includes(fraza);
      opt.hidden = !pasuje;
      if (pasuje) widoczneWGrupie++;
    });
    grupa.hidden = widoczneWGrupie === 0;
  });
}

// Grupowany <select> z cennika, wg kolejności kategorii (etapy remontu),
// żeby przy 60+ pozycjach dało się szybko odnaleźć właściwą czynność.
function htmlSelectCennik(id, kategorie, cennik) {
  const optgroups = kategorie.map((k) => {
    const lista = cennik.filter((c) => c.kategoria === k.nazwa);
    if (lista.length === 0) return '';
    return `
      <optgroup label="${ikonaKategorii(k.nazwa)} ${esc(k.nazwa)}">
        ${lista.map((c) => `<option value="${c.id}">${esc(c.nazwa)} (${c.stawka ? formatujKwote(c.stawka) + '/' + esc(c.jednostka) : 'stawka do ustalenia'})</option>`).join('')}
      </optgroup>
    `;
  }).join('');
  return `
    <select id="${id}">
      <option value="">— wpisz ręcznie —</option>
      ${optgroups}
    </select>
  `;
}

function eksportujCSV(projekt, pozycje) {
  const naglowek = ['Kategoria', 'Pomieszczenie', 'Nazwa', 'Ilość', 'Jednostka', 'Stawka', 'Kwota'];
  const wiersze = pozycje.map((p) => [
    p.kategoria, p.pomieszczenie || '', p.nazwa, p.ilosc, p.jednostka, p.stawka, kwotaPozycji(p.ilosc, p.stawka),
  ]);
  wiersze.push([]);
  wiersze.push(['', '', '', '', '', 'RAZEM', sumaCalkowita(pozycje)]);

  const csv = [naglowek, ...wiersze]
    .map((wiersz) => wiersz.map((pole) => `"${String(pole ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kosztorys-${projekt.nazwa.replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Widok: Cennik ----------

let cennikPamiec = [];

async function renderCennik() {
  topbarTitle.textContent = 'Cennik';
  cennikPamiec = await pobierzCennik();

  app.innerHTML = `
    <div class="uwaga">To Twoje domyślne stawki — wybierasz je przy dodawaniu pozycji do kosztorysu. Stuknij pozycję, żeby zmienić jej stawkę na stałe.</div>
    <input id="szukaj-w-cenniku" type="text" placeholder="🔍 Szukaj w cenniku..." style="margin-bottom:10px;" />
    <div class="karta" id="lista-cennika"></div>
    <button class="btn" id="btn-nowa-pozycja-cennika">+ Dodaj czynność do cennika</button>
  `;

  renderListaCennika('');
  document.getElementById('szukaj-w-cenniku').addEventListener('input', (e) => renderListaCennika(e.target.value));
  document.getElementById('btn-nowa-pozycja-cennika').addEventListener('click', () => dialogPozycjaCennika());
}

function renderListaCennika(filtr) {
  const fraza = filtr.trim().toLowerCase();
  const przefiltrowany = !fraza
    ? cennikPamiec
    : cennikPamiec.filter((c) => c.nazwa.toLowerCase().includes(fraza) || c.kategoria.toLowerCase().includes(fraza));

  const kontener = document.getElementById('lista-cennika');
  kontener.innerHTML = przefiltrowany.length === 0
    ? `<div class="pusty-stan">${cennikPamiec.length === 0 ? 'Cennik jest pusty.<br>Dodaj typowe czynności ze stawkami, żeby szybciej budować kosztorysy.' : 'Brak wyników dla tej frazy.'}</div>`
    : przefiltrowany.map((c) => `
      <div class="pozycja" data-edytuj="${c.id}">
        <div>
          <div class="nazwa">${esc(c.nazwa)}</div>
          <div class="szczegoly">${ikonaKategorii(c.kategoria)} ${esc(c.kategoria)} &middot; ${formatujStawke(c.stawka, c.jednostka)}</div>
        </div>
        <button class="btn-usun" data-usun="${c.id}" aria-label="Usuń" title="Usuń">🗑</button>
      </div>
    `).join('');

  kontener.querySelectorAll('[data-edytuj]').forEach((el) => {
    el.addEventListener('click', () => {
      const pozycja = cennikPamiec.find((c) => c.id === el.dataset.edytuj);
      dialogPozycjaCennika(pozycja);
    });
  });
  kontener.querySelectorAll('[data-usun]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await usunPozycjeCennika(btn.dataset.usun);
      renderCennik();
    });
  });
}

async function dialogPozycjaCennika(edytowanaPozycja = null) {
  const kategorieWszystkie = await pobierzKategorie();
  const kategorie = kategorieWidoczne(kategorieWszystkie, edytowanaPozycja?.kategoria);
  const edycja = !!edytowanaPozycja;
  otworzDialog(`
    <h2>${edycja ? 'Edytuj stawkę' : 'Nowa czynność w cenniku'}</h2>
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" value="${esc(edytowanaPozycja?.nazwa)}" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria</label>
      <select id="pole-kategoria">
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}" ${edytowanaPozycja?.kategoria === k.nazwa ? 'selected' : ''}>${ikonaKategorii(k.nazwa)} ${esc(k.nazwa)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-jednostka">Jednostka</label>
      ${htmlSelectJednostka('pole-jednostka', edytowanaPozycja?.jednostka ?? 'm2')}
    </div>
    <div class="pole">
      <label for="pole-stawka">Stawka (zł za jednostkę)</label>
      <input id="pole-stawka" type="number" step="0.01" min="0" value="${edytowanaPozycja?.stawka ?? 0}" />
    </div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">${edycja ? 'Zapisz zmiany' : 'Zapisz'}</button>
    </div>
  `);
  const poleNazwa = document.getElementById('pole-nazwa');
  const poleKategoria = document.getElementById('pole-kategoria');
  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const nazwa = poleNazwa.value.trim();
    if (!nazwa) return;
    const dane = {
      nazwa,
      kategoria: poleKategoria.value,
      jednostka: document.getElementById('pole-jednostka').value || 'szt.',
      stawka: document.getElementById('pole-stawka').value,
    };
    if (edycja) {
      await aktualizujPozycjeCennika({ ...edytowanaPozycja, ...dane, stawka: Number(dane.stawka) });
    } else {
      await dodajPozycjeCennika(dane);
    }
    zamknijDialog();
    renderCennik();
  });
}

// ---------- Widok: Ustawienia ----------

async function renderUstawienia() {
  topbarTitle.textContent = 'Ustawienia';
  const [kategorie, firma] = await Promise.all([pobierzKategorie(), pobierzDaneFirmy()]);

  app.innerHTML = `
    <div class="karta">
      <h3 class="sekcja-tytul">Dane firmy (widoczne na wydruku)</h3>
      <div class="pole">
        <label for="pole-firma-nazwa">Nazwa firmy / imię i nazwisko</label>
        <input id="pole-firma-nazwa" type="text" value="${esc(firma.nazwa)}" />
      </div>
      <div class="pole">
        <label for="pole-firma-telefon">Telefon</label>
        <input id="pole-firma-telefon" type="text" value="${esc(firma.telefon)}" />
      </div>
      <div class="pole">
        <label for="pole-firma-email">E-mail</label>
        <input id="pole-firma-email" type="text" value="${esc(firma.email)}" />
      </div>
      <button class="btn" id="btn-zapisz-firme">Zapisz dane firmy</button>
    </div>

    <div class="karta">
      <h3 class="sekcja-tytul">Kategorie</h3>
      <div class="lista-kategorii">
        ${kategorie.map((k) => `
          <div class="wiersz-kategorii">
            <span>${ikonaKategorii(k.nazwa)} ${esc(k.nazwa)}</span>
            <span class="wiersz-kategorii-akcje">
              <button class="btn wtorny maly" data-toggle-kategoria="${k.id}">${k.ukryta ? 'Pokaż' : 'Ukryj'}</button>
              <button class="btn wtorny maly niebezpieczny" data-usun-kategorie="${k.id}" title="Usuń na stałe">Usuń</button>
            </span>
          </div>
        `).join('')}
      </div>
      <div class="pole" style="margin-top:14px;">
        <label for="pole-nowa-kategoria">Nowa kategoria</label>
        <div style="display:flex; gap:8px;">
          <input id="pole-nowa-kategoria" type="text" placeholder="np. Ogród / Taras" style="flex:1;" />
          <button class="btn maly" id="btn-dodaj-kategorie">Dodaj</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-zapisz-firme').addEventListener('click', async (e) => {
    await zapiszDaneFirmy({
      nazwa: document.getElementById('pole-firma-nazwa').value,
      telefon: document.getElementById('pole-firma-telefon').value,
      email: document.getElementById('pole-firma-email').value,
    });
    const btn = e.target;
    const tekstOryginalny = btn.textContent;
    btn.textContent = 'Zapisano ✓';
    setTimeout(() => { btn.textContent = tekstOryginalny; }, 1500);
  });

  document.getElementById('btn-dodaj-kategorie').addEventListener('click', async () => {
    const nazwa = document.getElementById('pole-nowa-kategoria').value.trim();
    if (!nazwa) return;
    await dodajKategorie(nazwa);
    renderUstawienia();
  });

  app.querySelectorAll('[data-toggle-kategoria]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kategoria = kategorie.find((k) => k.id === btn.dataset.toggleKategoria);
      await aktualizujKategorie({ ...kategoria, ukryta: !kategoria.ukryta });
      renderUstawienia();
    });
  });

  app.querySelectorAll('[data-usun-kategorie]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kategoria = kategorie.find((k) => k.id === btn.dataset.usunKategorie);
      const [cennik, wszystkiePozycje] = await Promise.all([pobierzCennik(), pobierzWszystkiePozycjeKosztorysu()]);
      const liczbaCennika = cennik.filter((c) => c.kategoria === kategoria.nazwa).length;
      const liczbaWKosztorysach = wszystkiePozycje.filter((p) => p.kategoria === kategoria.nazwa).length;

      let tresc = `Usunąć kategorię "${kategoria.nazwa}" na stałe?`;
      if (liczbaCennika > 0) tresc += `\n\nUsunie też ${liczbaCennika} ${odmienPozycje(liczbaCennika)} w cenniku.`;
      if (liczbaWKosztorysach > 0) {
        const fraza = liczbaWKosztorysach === 1 ? 'zapisanej pozycji' : 'zapisanych pozycjach';
        tresc += `\n\nKategoria jest użyta w ${liczbaWKosztorysach} ${fraza} kosztorysu w Twoich projektach — te ZOSTANĄ, kategoria zapisze się przy nich jako zwykły tekst i nadal będą poprawnie liczone.`;
      }
      if (!confirm(tresc)) return;

      await usunKategorieRazemZCennikiem(kategoria.id, kategoria.nazwa);
      renderUstawienia();
    });
  });
}

function odmienPozycje(n) {
  if (n === 1) return 'pozycję';
  const ostatniaCyfra = n % 10;
  const ostatnieDwie = n % 100;
  if (ostatniaCyfra >= 2 && ostatniaCyfra <= 4 && !(ostatnieDwie >= 12 && ostatnieDwie <= 14)) return 'pozycje';
  return 'pozycji';
}

// ---------- Dialog (generyczny) ----------

function otworzDialog(html) {
  dialog.innerHTML = `<div class="dialog-tresc">${html}</div>`;
  dialog.showModal();
}
function zamknijDialog() {
  dialog.close();
  dialog.innerHTML = '';
}
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) zamknijDialog();
});

// ---------- Start ----------

if ('serviceWorker' in navigator) {
  // Czy strona była już kontrolowana przez jakiś service worker PRZED tym
  // ładowaniem - odróżnia "świeża instalacja" (controller null -> pierwszy SW,
  // przeładowanie niepotrzebne) od "aktualizacja" (stary SW -> nowy SW,
  // przeładowanie konieczne, bo już wczytany app.js jest przestarzały).
  const mielKontrolerNaStarcie = !!navigator.serviceWorker.controller;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.error('SW rejestracja nieudana:', err));
  });

  // Standalone PWA na iOS rzadko odświeża się samo po aktualizacji na
  // serwerze, więc bez tego telefon mógłby pokazywać stary kod w nieskończoność.
  // `odswiezonoJuz` zabezpiecza przed pętlą przeładowań.
  let odswiezonoJuz = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (odswiezonoJuz || !mielKontrolerNaStarcie) {
      odswiezonoJuz = true;
      return;
    }
    odswiezonoJuz = true;
    location.reload();
  });
}

render();
