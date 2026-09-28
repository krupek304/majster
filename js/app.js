import {
  pobierzProjekty, dodajProjekt, usunProjekt, przywrocProjekt, aktualizujProjekt, duplikujProjekt,
  pobierzKategorie, dodajKategorie, aktualizujKategorie, usunKategorieRazemZCennikiem, przywrocDomyslnyCennik,
  pobierzCennik, dodajPozycjeCennika, aktualizujPozycjeCennika, usunPozycjeCennika, przywrocPozycjeCennika,
  pobierzPozycjeProjektu, dodajPozycjeKosztorysu, aktualizujPozycjeKosztorysu, usunPozycjeKosztorysu, przywrocPozycjeKosztorysu,
  pobierzWszystkiePozycjeKosztorysu, dodajWielePozycjiKosztorysu,
  pobierzNazwySzablonowPomieszczen, pobierzPozycjeSzablonu,
  pobierzPlatnosciProjektu, dodajPlatnosc, usunPlatnosc, przywrocPlatnosc, pobierzWszystkiePlatnosci,
  pobierzDaneFirmy, zapiszDaneFirmy, zapiszLogoFirmy,
  dodajZdjeciePozycji, pobierzZdjeciaPozycji, pobierzWszystkieZdjecia, usunZdjeciePozycji,
  pobierzPowiadomienia, istniejePowiadomienie, dodajPowiadomienie,
  oznaczPowiadomieniaJakoPrzeczytane, pobierzLiczbeNieprzeczytanychPowiadomien,
  eksportujCalaBaze, importujCalaBaze,
} from './db.js';
import { kwotaPozycji, sumyKategorii, sumyPolem, sumaCalkowita, sumaPlatnosci, formatujKwote } from './calc.js';

const app = document.getElementById('app');
const topbar = document.querySelector('.topbar');
const topbarTitle = document.getElementById('topbar-title');
const dialog = document.getElementById('dialog');
const tabButtons = document.querySelectorAll('.tab-btn');
const btnPowiadomienia = document.getElementById('btn-powiadomienia');
const odznakaPowiadomien = document.getElementById('odznaka-powiadomien');

const state = {
  widok: 'projekty', projektId: null, grupowanie: 'kategoria', filtrProjekty: '', sortowanieProjektow: 'data',
  podsumowanieTryb: 'miesiac', podsumowanieRok: new Date().getFullYear(), podsumowanieMiesiac: new Date().getMonth(),
};

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
// Pliki SVG (Lucide, self-hosted w icons-ui/) do kontekstów HTML - w <option>/<optgroup
// label> HTML się nie renderuje, więc tam używamy osobnej mapy z emoji (IKONY_KATEGORII_TEKST).
const IKONY_KATEGORII = {
  'Przygotowanie i planowanie': 'clipboard-check',
  'Prace rozbiórkowe i konstrukcyjne': 'hammer',
  'Instalacje wewnętrzne (stan surowy)': 'zap',
  'Prace tynkarskie i wylewki': 'layers',
  'Zabudowy z płyt gipsowo-kartonowych (GK)': 'ruler',
  'Prace glazurnicze i terakota': 'grid-3x3',
  'Gładzie i przygotowanie ścian do malowania': 'paintbrush',
  'Podłogi': 'grid-2x2',
  'Stolarka drzwiowa i okienna': 'door-open',
  'Malowanie i wykończenie ścian': 'paint-bucket',
  'Biały montaż i osprzęt': 'droplets',
  'Kuchnia i AGD': 'utensils-crossed',
  'Sprzątanie i odbiór': 'sparkles',
  'Prace dodatkowe i opcjonalne': 'wand-2',
};
const IKONY_KATEGORII_TEKST = {
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

// Zwraca <span> z ikoną SVG jako maskę tła - dziedziczy kolor (currentColor) z otoczenia,
// więc jedna i ta sama ikona pasuje do jasnego/ciemnego motywu i do koloru odznaki.
function ikonaSvg(plik, klasy = '') {
  return `<span class="ikona-svg ${klasy}" style="--ikona:url('../icons-ui/${plik}.svg')"></span>`;
}
// Do kontekstów HTML (nagłówki, listy, wiersze) - ikona kategorii jako SVG.
function ikonaKategorii(nazwa) {
  return ikonaSvg(IKONY_KATEGORII[nazwa] || 'folder');
}
// Ta sama ikona w kolorowym kółku (odznaka) - do widoczniejszych miejsc, np. lista
// kategorii w Ustawieniach.
function ikonaKategoriiOdznaka(nazwa) {
  return `<span class="ikona-badge">${ikonaKategorii(nazwa)}</span>`;
}
// Do <option>/<optgroup label="..."> - HTML się tam nie renderuje, więc emoji (zwykły znak).
function ikonaKategoriiTekst(nazwa) {
  return IKONY_KATEGORII_TEKST[nazwa] || '📁';
}

// Animowany baner z nazwą - litery wjeżdżają pojedynczo (CSS, .baner-tytul
// span). Dwie odsłony współdzielą tę samą logikę liter: pełna (okno powitalne
// O!Majster, z ikoną w kółku i podkreśleniem) i kompaktowa (na stałe w pasku
// na górze KAŻDEGO ekranu - Projekty, Cennik, Ustawienia - z własną ikoną
// i tekstem). `aria-label` na rodzicu daje czytnikom ekranu jedno słowo
// zamiast osobnych liter.
function htmlLiteryBaneru(tekst) {
  return tekst.split('').map((znak, i) => `<span aria-hidden="true" style="--i:${i}">${znak}</span>`).join('');
}
function htmlBanerPelny() {
  return `
    <div class="baner-powitalny">
      <span class="baner-ikona">${ikonaSvg('hammer')}</span>
      <h2 class="baner-tytul" aria-label="O!Majster">${htmlLiteryBaneru('O!Majster')}</h2>
      <span class="baner-podkreslenie"></span>
    </div>
  `;
}
// `klasa` dodatkowa tylko dla banera O!Majster - to on ma pomarańczowy
// wykrzyknik jako drugi "znak" (patrz .topbar-baner-omajster w CSS); Cennik/
// Ustawienia nie mają tej sztucznej reguły na drugiej literze.
function htmlBanerKompaktowy(plikIkony = 'hammer', tekst = 'O!Majster', klasa = '') {
  return `
    <span class="topbar-baner ${klasa}" aria-label="${esc(tekst)}">
      <span class="topbar-baner-ikona">${ikonaSvg(plikIkony)}</span>
      <span class="baner-tytul topbar-baner-tekst">${htmlLiteryBaneru(tekst)}</span>
    </span>
  `;
}

// Wyraźny komunikat "dane zostają na telefonie" - pokazywany przy pierwszym
// uruchomieniu (okno powitalne) i za każdym razem przy zakładaniu nowego
// projektu, żeby to zaufanie było widoczne, nie tylko zadeklarowane raz.
// Sprawdzone 2026-09-27: appka nie ma ani jednego wywołania sieciowego, które
// wysyłałoby dane użytkownika (jedyny fetch to Service Worker cache'ujący
// własne pliki appki) - jedyne dwa wyjątki to ręczne "Udostępnij" i eksport
// PDF/kopii zapasowej, oba w pełni sterowane przez użytkownika.
function htmlNotatkaPrywatnosci() {
  return `
    <div class="uwaga-prywatnosc">
      ${ikonaSvg('lock')}
      <span>Wszystkie dane (projekty, kosztorysy, zdjęcia) zostają <strong>wyłącznie na tym telefonie</strong>. Aplikacja nie ma serwera i nic nie wysyła do internetu bez Twojej wyraźnej akcji (np. „Udostępnij”).</span>
    </div>
  `;
}

// Paleta do paska podziału kosztów - cykliczna, wystarcza na więcej niż 14 kategorii.
const PALETA_WYKRESU = ['#ea580c', '#0ea5e9', '#22c55e', '#a855f7', '#f43f5e', '#eab308', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#ec4899', '#06b6d4', '#8b5cf6', '#64748b'];

// Statusy projektu - czysto organizacyjne, nie wpływają na liczenie sumy.
// Ikona obok koloru - kolor sam w sobie jest słabo dostępny (osoby z zaburzeniami
// rozpoznawania barw, ostre słońce na budowie), ikona daje drugi, niezależny sygnał.
const STATUSY = {
  wycena: { etykieta: 'Wycena', kolor: '#94a3b8', ikona: 'file-text' },
  w_trakcie: { etykieta: 'W trakcie', kolor: '#0ea5e9', ikona: 'hard-hat' },
  zakonczony: { etykieta: 'Zakończony', kolor: '#22c55e', ikona: 'check-circle' },
};
function statusProjektu(projekt) {
  return STATUSY[projekt.status] ? projekt.status : 'wycena';
}
function htmlOdznakaStatusu(status) {
  const s = STATUSY[status];
  return `<span class="odznaka-statusu" style="background:${s.kolor}">${ikonaSvg(s.ikona)}${s.etykieta}</span>`;
}

// Moment zakończenia projektu - zamiast konfetti (za mało "biznesowe" na
// narzędzie do kosztorysów): animowany znaczek zatwierdzenia (SVG, rysuje się
// samo przez stroke-dashoffset) i zaraz po nim karta z krótkim podsumowaniem
// projektu. Jedno okno, jedna spójna sekwencja.
function pokazZakonczenieProjektu(projekt, pozycje) {
  const suma = sumaCalkowita(pozycje);
  const liczbaKategorii = new Set(pozycje.map((p) => p.kategoria)).size;
  const start = new Date(dataRozpoczeciaProjektu(projekt) + 'T00:00:00');
  const koniec = new Date((projekt.data_zakonczenia || dzisiajYMD()) + 'T00:00:00');
  const liczbaDni = Math.max(0, Math.round((koniec - start) / 86400000));

  otworzDialog(`
    <div class="podsumowanie-zakonczenia">
      <svg class="check-svg" viewBox="0 0 52 52">
        <circle class="check-okrag" cx="26" cy="26" r="24" fill="none" />
        <path class="check-znak" fill="none" d="M14 27l7 7 16-16" />
      </svg>
      <h2 class="check-tytul">Projekt zakończony!</h2>
      <div class="karta-podsumowania-projektu">
        <div class="wiersz-podsumowania"><span>Projekt</span><span>${esc(projekt.nazwa)}</span></div>
        <div class="wiersz-podsumowania"><span>Czas trwania</span><span>${liczbaDni} ${odmienDni(liczbaDni)}</span></div>
        <div class="wiersz-podsumowania"><span>Kategorii prac</span><span>${liczbaKategorii}</span></div>
        <div class="wiersz-podsumowania wiersz-suma"><span>Wartość kosztorysu</span><span>${formatujKwote(suma)}</span></div>
      </div>
      <button class="btn" id="btn-zamknij-podsumowanie">Świetna robota</button>
    </div>
  `);
  document.getElementById('btn-zamknij-podsumowanie').addEventListener('click', () => {
    zamknijDialog();
    renderKosztorys(projekt.id);
  });
}
// "dzień/dni" ma tylko dwie formy w polskim (nie trzy jak np. "pozycja/-e/-i") -
// 1 to zawsze "dzień", każda inna liczba (w tym 0) to "dni".
// Polska odmiana liczebnikowa (1 / 2-4 / 5+, z wyjątkiem 12-14 które mimo
// końcówki 2-4 idą do formy "wiele") - jeden wspólny algorytm zamiast
// kopiowanego osobno dla każdego rzeczownika (odmienDni/odmienProjekty/
// odmienPozycje różniły się kiedyś tylko słowami, ten sam kod trzy razy).
function odmien(n, jeden, kilka, wiele) {
  if (n === 1) return jeden;
  const ostatniaCyfra = n % 10;
  const ostatnieDwie = n % 100;
  if (ostatniaCyfra >= 2 && ostatniaCyfra <= 4 && !(ostatnieDwie >= 12 && ostatnieDwie <= 14)) return kilka;
  return wiele;
}
function odmienDni(n) {
  return odmien(n, 'dzień', 'dni', 'dni');
}

// ---------- Wygląd: jasny / ciemny / systemowy ----------
// Domyślnie appka podąża za ustawieniem telefonu (media query w CSS), ale da
// się to wymusić w Ustawieniach. Wybór to czysto lokalna preferencja urządzenia
// (nie dane biznesowe), stąd localStorage a nie baza - i dlatego zapisuje się
// też inline-script w <head> (żeby ustawić atrybut PRZED pierwszym rysowaniem
// strony, bez mignięcia złym motywem).
const KLUCZ_MOTYWU = 'o-majster-motyw';
function pobierzMotyw() {
  try {
    const zapisany = localStorage.getItem(KLUCZ_MOTYWU);
    return zapisany === 'jasny' || zapisany === 'ciemny' ? zapisany : 'system';
  } catch {
    return 'system';
  }
}
let zdjecieKlasyMotywu = null;
function zastosujMotyw(motyw) {
  // Krótkie okno globalnej transition na kolorach (patrz CSS `.zmiana-motywu`)
  // - żeby przełączenie jasny/ciemny/systemowy przenikało płynnie zamiast
  // skakać skokowo. Zdjęte po 350ms, żeby nie spowalniać innych, normalnych
  // zmian koloru w appce (np. odznaki statusu) przez resztę sesji.
  // `clearTimeout` poprzedniego - bez tego dwie szybkie zmiany motywu pod rząd
  // (np. Ciemny, a po chwili Systemowy) miałyby ścigające się timeouty: ten ze
  // STARSZEJ zmiany odpaliłby się jako pierwszy i zdjąłby klasę przedwcześnie,
  // ucinając płynne przejście dla tej NOWSZEJ, właściwej zmiany.
  clearTimeout(zdjecieKlasyMotywu);
  document.documentElement.classList.add('zmiana-motywu');
  zdjecieKlasyMotywu = setTimeout(() => document.documentElement.classList.remove('zmiana-motywu'), 350);
  if (motyw === 'jasny' || motyw === 'ciemny') {
    document.documentElement.setAttribute('data-motyw', motyw);
  } else {
    document.documentElement.removeAttribute('data-motyw');
  }
  try {
    if (motyw === 'system') localStorage.removeItem(KLUCZ_MOTYWU);
    else localStorage.setItem(KLUCZ_MOTYWU, motyw);
  } catch {
    // localStorage niedostępny (np. tryb prywatny) - motyw zadziała do końca
    // tej sesji (atrybut jest ustawiony), tylko nie przetrwa zamknięcia appki.
  }
  odswiezKolorPaskaStatusu();
}
// Pasek statusu telefonu (kolor "theme-color") ma pasować do faktycznie
// widocznego motywu - łącznie z przypadkiem "systemowy", gdzie liczy się
// aktualne ustawienie telefonu, nie żaden zapamiętany wybór.
function odswiezKolorPaskaStatusu() {
  const meta = document.getElementById('meta-kolor-paska');
  if (!meta) return;
  const motyw = pobierzMotyw();
  const ciemny = motyw === 'ciemny'
    || (motyw === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  meta.setAttribute('content', ciemny ? '#0b1220' : '#1e293b');
}
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (pobierzMotyw() === 'system') odswiezKolorPaskaStatusu();
  });
}

// Data ostatniego eksportu kopii zapasowej - lokalny fakt o tym urządzeniu
// (nie o samych danych), stąd localStorage, nie baza: po przywróceniu kopii
// na nowym telefonie appka słusznie "nie pamięta" żadnego eksportu stąd.
const KLUCZ_OSTATNIEGO_EKSPORTU = 'o-majster-ostatni-eksport';

// Zapamiętywanie ostatnio wpisanej ilości dla danej pozycji cennika - czysto
// lokalna wygoda urządzenia (nie dane biznesowe), stąd localStorage a nie baza.
const KLUCZ_OSTATNICH_ILOSCI = 'o-majster-ostatnie-ilosci';
function pobierzOstatniaIlosc(cennikId) {
  try {
    const mapa = JSON.parse(localStorage.getItem(KLUCZ_OSTATNICH_ILOSCI) || '{}');
    return mapa[cennikId];
  } catch {
    return undefined;
  }
}
function zapamietajIlosc(cennikId, ilosc) {
  try {
    const mapa = JSON.parse(localStorage.getItem(KLUCZ_OSTATNICH_ILOSCI) || '{}');
    mapa[cennikId] = ilosc;
    localStorage.setItem(KLUCZ_OSTATNICH_ILOSCI, JSON.stringify(mapa));
  } catch {
    // localStorage niedostępny (np. tryb prywatny) - pomijamy, to tylko wygoda
  }
}

// "Dzisiaj" jako RRRR-MM-DD w czasie LOKALNYM - NIE new Date().toISOString(),
// bo ta konwertuje na UTC i potrafi cofnąć datę o dzień w nocy przy dodatniej
// strefie czasowej (np. 00:30 w Polsce latem = 22:30 UTC dnia poprzedniego).
// Znalezione empirycznie 2026-09-27 przy testowaniu powiadomień o datach.
function ymdLokalny(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dzisiajYMD() {
  return ymdLokalny(new Date());
}

// Musi escapować TAKŻE cudzysłowy - wynik trafia nie tylko do tekstu węzła,
// ale też do atrybutów w cudzysłowie (np. value="${esc(...)}"). Poprzednia
// wersja (przez d.textContent -> d.innerHTML) escapowała tylko &<> - cudzysłów
// w nazwie projektu/pozycji mógł zamknąć atrybut i wstrzyknąć nowy (np. przez
// zaimportowaną od kogoś innego kopię zapasową).
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (znak) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[znak]));
}

// ---------- Obrazy: logo firmy i zdjęcia pozycji ----------
// Zdjęcie z aparatu telefonu potrafi mieć kilkanaście MB - zanim trafi do
// IndexedDB, skalujemy je w dół przez <canvas>. Bez tego kilka zdjęć na
// pozycję szybko napuchłoby bazę i spowolniło appkę.
const MAX_ROZMIAR_OBRAZU_MB = 20;
function wczytajObraz(plik) {
  return new Promise((resolve, reject) => {
    // Sprawdzone PRZED odczytem - dekodowanie ogromnego/wadliwego pliku jako
    // obrazu (np. przez pomyłkę wybrany plik wideo, albo bardzo wysokiej
    // rozdzielczości zdjęcie) potrafi zawiesić kartę na słabszym telefonie.
    if (plik.size > MAX_ROZMIAR_OBRAZU_MB * 1024 * 1024) {
      reject(new Error(`Plik jest za duży (max ${MAX_ROZMIAR_OBRAZU_MB} MB).`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Nie udało się odczytać pliku jako obrazu.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'));
    reader.readAsDataURL(plik);
  });
}
function skalujDoCanvas(obraz, maxSzerokosc) {
  const skala = obraz.width > maxSzerokosc ? maxSzerokosc / obraz.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(obraz.width * skala));
  canvas.height = Math.max(1, Math.round(obraz.height * skala));
  canvas.getContext('2d').drawImage(obraz, 0, 0, canvas.width, canvas.height);
  return canvas;
}
// Logo jako PNG (zachowuje przezroczyste tło, typowe dla logotypów).
async function plikNaDataUrl(plik, maxSzerokosc = 400) {
  const obraz = await wczytajObraz(plik);
  return skalujDoCanvas(obraz, maxSzerokosc).toDataURL('image/png');
}
// Zdjęcia "przed/po" jako skompresowany JPEG (mniejszy rozmiar, tu nie liczy
// się przezroczystość).
async function plikNaBlob(plik, maxSzerokosc = 1000) {
  const obraz = await wczytajObraz(plik);
  return new Promise((resolve) => skalujDoCanvas(obraz, maxSzerokosc).toBlob(resolve, 'image/jpeg', 0.85));
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

// Nazwa View Transition dla "rozwinięcia" karty projektu w pełny ekran
// kosztorysu - jedna stała nazwa wystarczy, bo w danej chwili nosi ją co
// najwyżej jeden element (stary, znikający) i co najwyżej jeden nowy.
const NAZWA_MORFOWANIA_KARTY = 'karta-projektu-aktywna';

// `elementZrodlowy` (opcjonalnie) = kliknięta karta projektu - dostaje tę samą
// view-transition-name co pole z danymi klienta w kosztorysie, więc przeglądarka
// sama animuje przejście z kształtu/pozycji karty w pełny ekran, zamiast
// zwykłego cross-fade. Bez wsparcia przeglądarki (i bez podanego elementu)
// appka po prostu przełącza widok - efekt jest czysto kosmetyczny.
// Najwyżej JEDEN żywy element na raz może nosić NAZWA_MORFOWANIA_KARTY - bez
// tego dwa szybkie kliknięcia w RÓŻNE karty projektów (zanim pierwsze zdąży
// usunąć swoją kartę z DOM w trakcie asynchronicznego render()) mogłyby nadać
// tę samą view-transition-name dwóm żywym elementom naraz, co View Transitions
// API traktuje jako twardy błąd i pomija animację zamiast ją odegrać. Ta
// funkcja jest jedynym miejscem, które nadaje tę nazwę - zawsze najpierw
// zdejmuje ją z poprzedniego nosiciela.
let elementZTagiemMorfowania = null;
function ustawNazweMorfowania(el) {
  if (elementZTagiemMorfowania) elementZTagiemMorfowania.style.viewTransitionName = '';
  elementZTagiemMorfowania = el;
  if (el) el.style.viewTransitionName = NAZWA_MORFOWANIA_KARTY;
}

// Licznik "generacji" - gdy w trakcie jednej nawigacji (np. kliknięta karta
// wskazuje na projekt, który zniknął z bazy) wystartuje KOLEJNA, nowsza
// nawigacja, sprzątanie tej starszej nie może zgasić nazwy/tagów należących
// już do tej nowszej.
let generacjaMorfowania = 0;

function ustawWidok(widok, projektId = null, elementZrodlowy = null) {
  const mojaGeneracja = ++generacjaMorfowania;
  if (elementZrodlowy) ustawNazweMorfowania(elementZrodlowy);
  const wykonaj = async () => {
    state.widok = widok;
    state.projektId = projektId;
    tabButtons.forEach((btn) => {
      if (btn.dataset.widok === widok) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    await render();
    if (widok === 'kosztorys' && mojaGeneracja === generacjaMorfowania) {
      const celMorfowania = app.querySelector('.uwaga');
      if (celMorfowania) ustawNazweMorfowania(celMorfowania);
    }
  };
  const posprzatajNazwy = () => {
    if (mojaGeneracja === generacjaMorfowania) ustawNazweMorfowania(null);
  };
  // View Transitions API - natywne przejście (cross-fade) między ekranami.
  // Bez wsparcia przeglądarki (starsze niż Safari 18) po prostu renderuje od razu.
  if (document.startViewTransition) {
    document.startViewTransition(wykonaj).finished.finally(posprzatajNazwy);
  } else {
    wykonaj();
  }
}

// Szkielet ładowania TYLKO tutaj (dyspozytor wołany przy realnej zmianie
// zakładki/wejściu w projekt) - nie w poszczególnych funkcjach renderujących,
// bo te są też wołane wprost do zwykłego odświeżenia tego samego ekranu (np.
// po dodaniu pozycji) i tam szkielet migałby bez potrzeby przy każdej akcji.
async function render() {
  pokazSzkielet(state.widok);
  if (state.widok === 'projekty') return renderProjekty();
  if (state.widok === 'kosztorys') return renderKosztorys(state.projektId);
  if (state.widok === 'cennik') return renderCennik();
  if (state.widok === 'podsumowanie') return renderPodsumowanie();
  if (state.widok === 'ustawienia') return renderUstawienia();
}

function pokazSzkielet(widok) {
  if (widok === 'kosztorys') app.innerHTML = htmlSzkieletKosztorys();
  else if (widok === 'ustawienia') app.innerHTML = htmlSzkieletUstawienia();
  else app.innerHTML = htmlSzkieletListy();
}
function htmlSzkieletListy() {
  return Array.from({ length: 3 }).map(() => `
    <div class="karta szkielet-karta">
      <span class="szkielet-pasek" style="width:55%; height:16px;"></span>
      <span class="szkielet-pasek" style="width:35%; height:12px;"></span>
      <span class="szkielet-pasek" style="width:74px; height:20px; border-radius:999px; margin-top:2px;"></span>
    </div>
  `).join('');
}
function htmlSzkieletKosztorys() {
  return `
    <div class="karta szkielet-karta" style="margin-bottom:10px;">
      <span class="szkielet-pasek" style="width:40%; height:16px;"></span>
    </div>
    <div class="karta">
      ${Array.from({ length: 4 }).map((_, i) => `
        <div class="szkielet-karta" style="padding:10px 0; ${i < 3 ? 'border-bottom:1px solid var(--linia);' : ''}">
          <span class="szkielet-pasek" style="width:60%; height:14px;"></span>
          <span class="szkielet-pasek" style="width:30%; height:11px;"></span>
        </div>
      `).join('')}
    </div>
  `;
}
function htmlSzkieletUstawienia() {
  return Array.from({ length: 2 }).map(() => `
    <div class="karta szkielet-karta">
      <span class="szkielet-pasek" style="width:30%; height:16px;"></span>
      <span class="szkielet-pasek" style="height:38px; border-radius:8px;"></span>
      <span class="szkielet-pasek" style="height:38px; border-radius:8px;"></span>
    </div>
  `).join('');
}

// ---------- Widok: Projekty ----------

let projektyPamiec = [];

// Jedno zbiorcze pobranie WSZYSTKICH pozycji (zamiast osobnego zapytania na
// każdy projekt z osobna) - przy M projektach to jedna transakcja IndexedDB
// zamiast M. Kolejność pozycji w każdej grupie zostaje identyczna jak przy
// odpytaniu przez indeks projekt_id (obie ścieżki sortują wg klucza głównego),
// więc `sumaCalkowita` (liczy z zaokrągleniem krok po kroku) daje ten sam wynik.
async function pozycjeWgProjektuMapa() {
  const wszystkie = await pobierzWszystkiePozycjeKosztorysu();
  const mapa = new Map();
  for (const p of wszystkie) {
    if (!mapa.has(p.projekt_id)) mapa.set(p.projekt_id, []);
    mapa.get(p.projekt_id).push(p);
  }
  return mapa;
}

// Ten sam wzorzec co wyżej (jedno zbiorcze zapytanie zamiast osobnego na
// każdy projekt) - do paska postępu wpłat na karcie projektu.
async function platnosciWgProjektuMapa() {
  const wszystkie = await pobierzWszystkiePlatnosci();
  const mapa = new Map();
  for (const p of wszystkie) {
    if (!mapa.has(p.projekt_id)) mapa.set(p.projekt_id, []);
    mapa.get(p.projekt_id).push(p);
  }
  return mapa;
}

// ---------- Podpowiedź "dodaj do ekranu głównego" ----------
// Android/Chrome mają programowy prompt (beforeinstallprompt); iOS Safari go
// NIE wspiera w ogóle (Apple celowo nie udostępnia tego API) - tam jedyna
// droga to ręczne Udostępnij -> Dodaj do ekranu głównego, więc dla iOS
// pokazujemy samą instrukcję zamiast przycisku.
const KLUCZ_INSTALACJI_UKRYTEJ = 'o-majster-instalacja-ukryta';
let odlozonyPromptInstalacji = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  odlozonyPromptInstalacji = e;
  if (state.widok === 'projekty') renderProjekty();
});

function czyJuzZainstalowana() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function czyIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function czyBanerInstalacjiPotrzebny() {
  if (czyJuzZainstalowana()) return false;
  try {
    if (localStorage.getItem(KLUCZ_INSTALACJI_UKRYTEJ)) return false;
  } catch {}
  return !!odlozonyPromptInstalacji || czyIOS();
}
function htmlBanerInstalacji() {
  if (!czyBanerInstalacjiPotrzebny()) return '';
  const tekst = odlozonyPromptInstalacji
    ? 'Zainstaluj O!Majster jako appkę - szybszy dostęp z ekranu głównego, działa offline.'
    : 'Dodaj O!Majster do ekranu głównego: stuknij „Udostępnij”, potem „Dodaj do ekranu głównego” - szybszy dostęp, działa offline.';
  return `
    <div class="uwaga-instalacja">
      ${ikonaSvg('home')}
      <span>${tekst}</span>
      ${odlozonyPromptInstalacji ? '<button class="btn" id="btn-zainstaluj">Zainstaluj</button>' : ''}
      <button class="btn-zamknij-baner" id="btn-zamknij-baner-instalacji" aria-label="Zamknij" title="Nie pokazuj więcej">${ikonaSvg('x')}</button>
    </div>
  `;
}
function wireBanerInstalacji() {
  const btnZamknij = document.getElementById('btn-zamknij-baner-instalacji');
  if (btnZamknij) {
    btnZamknij.addEventListener('click', () => {
      try { localStorage.setItem(KLUCZ_INSTALACJI_UKRYTEJ, '1'); } catch {}
      renderProjekty();
    });
  }
  const btnZainstaluj = document.getElementById('btn-zainstaluj');
  if (btnZainstaluj) {
    btnZainstaluj.addEventListener('click', async () => {
      if (!odlozonyPromptInstalacji) return;
      odlozonyPromptInstalacji.prompt();
      await odlozonyPromptInstalacji.userChoice;
      odlozonyPromptInstalacji = null;
      renderProjekty();
    });
  }
}

async function renderProjekty() {
  topbarTitle.innerHTML = htmlBanerKompaktowy('hammer', 'O!Majster', 'topbar-baner-omajster');
  const [projekty, mapaPozycji, mapaPlatnosci] = await Promise.all([pobierzProjekty(), pozycjeWgProjektuMapa(), platnosciWgProjektuMapa()]);
  projektyPamiec = projekty.map((p) => ({
    ...p,
    _suma: sumaCalkowita(mapaPozycji.get(p.id) || []),
    _zaplacono: sumaPlatnosci(mapaPlatnosci.get(p.id) || []),
  }));

  app.innerHTML = `
    ${htmlBanerInstalacji()}
    ${projektyPamiec.length > 0 ? `
      <input id="szukaj-projekty" type="text" placeholder="🔍 Szukaj po nazwie lub kliencie..." value="${esc(state.filtrProjekty)}" style="margin-bottom:10px;" />
      <div class="przelacznik-grupowania">
        <button class="btn-segment ${state.sortowanieProjektow === 'data' ? 'aktywny' : ''}" data-sortuj-projekty="data">Najnowsze</button>
        <button class="btn-segment ${state.sortowanieProjektow === 'nazwa' ? 'aktywny' : ''}" data-sortuj-projekty="nazwa">Nazwa</button>
        <button class="btn-segment ${state.sortowanieProjektow === 'kwota' ? 'aktywny' : ''}" data-sortuj-projekty="kwota">Kwota</button>
      </div>
    ` : ''}
    <div id="lista-projektow"></div>
    <button class="btn" id="btn-nowy-projekt">+ Nowy projekt</button>
  `;

  renderListaProjektow();
  wireBanerInstalacji();

  const poleSzukaj = document.getElementById('szukaj-projekty');
  if (poleSzukaj) {
    poleSzukaj.addEventListener('input', () => {
      state.filtrProjekty = poleSzukaj.value;
      renderListaProjektow();
    });
  }
  app.querySelectorAll('[data-sortuj-projekty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sortowanieProjektow = btn.dataset.sortujProjekty;
      app.querySelectorAll('[data-sortuj-projekty]').forEach((b) => b.classList.toggle('aktywny', b === btn));
      renderListaProjektow(true);
    });
  });
  document.getElementById('btn-nowy-projekt').addEventListener('click', dialogNowyProjekt);
}

// Osobno od renderProjekty(), żeby wpisywanie w polu szukania nie przebudowywało
// całego ekranu (a razem z nim samego pola - kursor/fokus by uciekał przy
// każdej literze). Sortuje i filtruje projektyPamiec zebrane przy ostatnim
// pełnym renderze, bez ponownego odpytywania bazy.
// Data rozpoczęcia to nowe pole (dodane 2026-09-27) - starsze projekty go nie
// mają, stąd fallback na datę utworzenia rekordu. `data_utworzenia` to pełny
// znacznik UTC (`toISOString()`) - samo ucięcie do 10 znaków dawało datę UTC,
// nie lokalną, więc projekt zapisany tuż po północy w Polsce trafiał "dzień
// wcześniej" (ten sam błąd, który `dzisiajYMD`/`ymdLokalny` mają eliminować).
function dataRozpoczeciaProjektu(p) {
  return p.data_rozpoczecia || ymdLokalny(new Date(p.data_utworzenia));
}
// `dataYMD` to zwykłe "RRRR-MM-DD" (bez godziny) - dopisanie T00:00:00 zamiast
// samego przekazania do Date() pilnuje, żeby parsowanie było w czasie lokalnym,
// nie UTC (inaczej przy ujemnej strefie czasowej data potrafi "cofnąć się" o dzień).
function formatujDateYMD(dataYMD) {
  if (!dataYMD) return '';
  return new Date(dataYMD + 'T00:00:00').toLocaleDateString('pl-PL');
}

// `zAnimacjaFlip=true` (tylko ze zmiany sortowania) - zestaw kart się nie
// zmienia, tylko kolejność, więc zamiast fade-in-od-nowa (co wyglądałoby jak
// "znikanie i pojawianie się") liczymy pozycje PRZED i PO (technika FLIP) i
// animujemy przesunięcie. Domyślnie (pierwsze wejście, wynik szukania) karty
// dostają zwykły wjazd z klasą `.nowa` (fade+translate, patrz CSS).
let flipRaf = null;
function renderListaProjektow(zAnimacjaFlip = false) {
  const kontenerPrzed = document.getElementById('lista-projektow');
  const stareRects = new Map();
  if (zAnimacjaFlip) {
    kontenerPrzed.querySelectorAll('.karta-projekt').forEach((el) => {
      stareRects.set(el.dataset.id, el.getBoundingClientRect());
    });
  }

  const fraza = state.filtrProjekty.trim().toLowerCase();
  const przefiltrowane = !fraza
    ? projektyPamiec
    : projektyPamiec.filter((p) => p.nazwa.toLowerCase().includes(fraza) || (p.klient || '').toLowerCase().includes(fraza));

  const posortowane = [...przefiltrowane].sort((a, b) => {
    if (state.sortowanieProjektow === 'nazwa') return a.nazwa.localeCompare(b.nazwa, 'pl');
    if (state.sortowanieProjektow === 'kwota') return b._suma - a._suma;
    return dataRozpoczeciaProjektu(b).localeCompare(dataRozpoczeciaProjektu(a));
  });

  const kontener = document.getElementById('lista-projektow');
  kontener.innerHTML = posortowane.length === 0
    ? `<div class="pusty-stan">${projektyPamiec.length === 0 ? 'Brak projektów.<br>Dodaj pierwszy kosztorys.' : 'Brak wyników dla tej frazy.'}</div>`
    : posortowane.map((p, i) => `
      <div class="karta karta-projekt${zAnimacjaFlip ? '' : ' nowa'}" data-id="${p.id}"${zAnimacjaFlip ? '' : ` style="--wjazd-opoznienie:${Math.min(i, 8) * 30}ms"`}>
        <div>
          <div class="nazwa">${esc(p.nazwa)}</div>
          <div class="klient">${esc(p.klient) || 'Bez klienta'} &middot; ${formatujDateYMD(dataRozpoczeciaProjektu(p))}</div>
          ${p._suma > 0 ? `
            <div class="pasek-wplat" title="Zapłacono ${formatujKwote(p._zaplacono)} z ${formatujKwote(p._suma)}">
              <div class="pasek-wplat-wypelnienie" style="width:${Math.min(100, (p._zaplacono / p._suma) * 100).toFixed(1)}%"></div>
            </div>
          ` : ''}
          ${htmlOdznakaStatusu(statusProjektu(p))}
          ${p.data_zakonczenia ? `<span class="znacznik-zakonczenia">Zakończono ${formatujDateYMD(p.data_zakonczenia)}</span>` : ''}
        </div>
        <div class="suma">${formatujKwote(p._suma)}</div>
      </div>
    `).join('');

  kontener.querySelectorAll('.karta-projekt').forEach((el) => {
    el.addEventListener('click', () => ustawWidok('kosztorys', el.dataset.id, el));
  });

  if (zAnimacjaFlip && stareRects.size > 0) {
    // Jeden wspólny rAF na całą listę (nie jeden na kartę) - i anulowanie
    // poprzedniego przed zaplanowaniem nowego. Bez tego dwa bardzo szybkie
    // kliknięcia sortowania pod rząd (drugie zanim rAF z pierwszego zdąży
    // się wykonać) odczytałyby getBoundingClientRect() kart, które WCIĄŻ mają
    // nałożone `translate` z nieukończonej pierwszej animacji - delta byłaby
    // liczona od złej pozycji startowej, dając widoczne szarpnięcie.
    if (flipRaf) cancelAnimationFrame(flipRaf);
    const doZresetowania = [];
    kontener.querySelectorAll('.karta-projekt').forEach((el) => {
      const stary = stareRects.get(el.dataset.id);
      if (!stary) return;
      const delta = stary.top - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.style.transition = 'none';
      el.style.translate = `0 ${delta}px`;
      doZresetowania.push(el);
    });
    flipRaf = requestAnimationFrame(() => {
      doZresetowania.forEach((el) => {
        el.style.transition = '';
        el.style.translate = '0 0';
      });
      flipRaf = null;
    });
  }
}

function dialogNowyProjekt() {
  otworzDialog(`
    <h2>Nowy projekt</h2>
    ${htmlNotatkaPrywatnosci()}
    <div class="pole">
      <label for="pole-nazwa">Nazwa projektu</label>
      <input id="pole-nazwa" type="text" placeholder="np. Mieszkanie ul. Kwiatowa 5" maxlength="200" />
    </div>
    <div class="pole">
      <label for="pole-klient">Klient (opcjonalnie)</label>
      <input id="pole-klient" type="text" placeholder="np. Jan Kowalski" maxlength="200" />
    </div>
    <div class="pole">
      <label for="pole-data-rozpoczecia">Data rozpoczęcia</label>
      <input id="pole-data-rozpoczecia" type="date" value="${dzisiajYMD()}" />
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
    const dataRozpoczecia = document.getElementById('pole-data-rozpoczecia').value;
    const projekt = await dodajProjekt({ nazwa, klient, dataRozpoczecia });
    zamknijDialog();
    ustawWidok('kosztorys', projekt.id);
  });
}

// ---------- Widok: Kosztorys projektu ----------

// Czyta liczbę z tekstu sformatowanego przez formatujKwote (np. "3 420,00 zł"),
// żeby animacja licznika miała punkt startowy przy re-renderze tego samego widoku.
function odczytajKwote(tekst) {
  if (!tekst) return NaN;
  return parseFloat(tekst.replace(/[^\d,-]/g, '').replace(',', '.'));
}

// Animuje kwotę od poprzedniej do nowej wartości (rAF, ease-out, ~450ms) - czysto
// kosmetyczne. Bez sensownej wartości startowej (pierwszy render widoku) ustawia
// docelową liczbę od razu, bez odliczania od zera.
function animujKwote(element, od, docelowa) {
  if (!element) return;
  if (!Number.isFinite(od) || od === docelowa) {
    element.textContent = formatujKwote(docelowa);
    return;
  }
  const czasStart = performance.now();
  const czasTrwania = 450;
  function krok(teraz) {
    const postep = Math.min((teraz - czasStart) / czasTrwania, 1);
    const wygladzony = 1 - Math.pow(1 - postep, 3);
    element.textContent = formatujKwote(od + (docelowa - od) * wygladzony);
    if (postep < 1) requestAnimationFrame(krok);
  }
  requestAnimationFrame(krok);
}

async function renderKosztorys(projektId) {
  const poprzedniaKwota = odczytajKwote(app.querySelector('.kwota-calkowita')?.textContent);
  const projekty = await pobierzProjekty();
  const projekt = projekty.find((p) => p.id === projektId);
  if (!projekt) return ustawWidok('projekty');

  topbarTitle.innerHTML = `<button class="wstecz" id="btn-wstecz">←</button> ${esc(projekt.nazwa)}`;
  document.getElementById('btn-wstecz').addEventListener('click', () => ustawWidok('projekty'));

  const [pozycje, platnosci, firma, wszystkieZdjecia] = await Promise.all([
    pobierzPozycjeProjektu(projektId),
    pobierzPlatnosciProjektu(projektId),
    pobierzDaneFirmy(),
    pobierzWszystkieZdjecia(),
  ]);
  const liczbaZdjecPozycji = new Map();
  wszystkieZdjecia.forEach((z) => liczbaZdjecPozycji.set(z.pozycja_id, (liczbaZdjecPozycji.get(z.pozycja_id) || 0) + 1));

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
            <div class="nazwa">${esc(p.nazwa)}${liczbaZdjecPozycji.has(p.id) ? ` <span class="znacznik-zdjec" title="${liczbaZdjecPozycji.get(p.id)} zdjęć">${ikonaSvg('camera')} ${liczbaZdjecPozycji.get(p.id)}</span>` : ''}</div>
            <div class="szczegoly">${p.ilosc} ${esc(p.jednostka)} &times; ${formatujStawke(p.stawka, p.jednostka)}${htmlDrugiWymiar(p)}</div>
          </div>
          <div class="kwota">${p.stawka ? formatujKwote(kwotaPozycji(p.ilosc, p.stawka)) : '—'}</div>
          <button class="btn-usun" data-usun="${p.id}" aria-label="Usuń" title="Usuń">${ikonaSvg('trash-2')}</button>
        </div>
      `).join('')}
    `).join('');

  app.innerHTML = `
    <div class="naglowek-druku">
      ${firma.logo ? `<img class="logo-druk" src="${firma.logo}" alt="Logo firmy" />` : ''}
      ${firma.nazwa || firma.telefon || firma.email ? `<div class="firma-druk">${[esc(firma.nazwa), firma.telefon ? 'tel. ' + esc(firma.telefon) : '', esc(firma.email)].filter(Boolean).join(' &middot; ')}</div>` : ''}
      <h1>Kosztorys</h1>
      <div class="meta-druku">
        <div><strong>Projekt:</strong> ${esc(projekt.nazwa)}</div>
        ${projekt.klient ? `<div><strong>Klient:</strong> ${esc(projekt.klient)}</div>` : ''}
        <div><strong>Rozpoczęcie:</strong> ${formatujDateYMD(dataRozpoczeciaProjektu(projekt))}</div>
        ${projekt.data_zakonczenia ? `<div><strong>Zakończenie:</strong> ${formatujDateYMD(projekt.data_zakonczenia)}</div>` : ''}
        <div><strong>Data wydruku:</strong> ${new Date().toLocaleDateString('pl-PL')}</div>
      </div>
    </div>
    <div class="uwaga">
      ${projekt.klient ? `Klient: ${esc(projekt.klient)}<br>` : ''}
      Rozpoczęcie: ${formatujDateYMD(dataRozpoczeciaProjektu(projekt))}${projekt.data_zakonczenia ? ` &middot; Zakończono: ${formatujDateYMD(projekt.data_zakonczenia)}` : ''}
    </div>
    <div class="podpowiedz-statusu">Status ustawiasz ręcznie. Data zakończenia pojawia się i znika razem z nim - wybór „Zakończony” ją zapisuje, każdy inny status ją czyści.</div>
    <div class="przelacznik-grupowania">
      ${Object.entries(STATUSY).map(([klucz, s]) => `<button class="btn-segment ${statusProjektu(projekt) === klucz ? 'aktywny' : ''}" data-status="${klucz}">${ikonaSvg(s.ikona)} ${s.etykieta}</button>`).join('')}
    </div>
    ${pozycje.length > 0 ? `
      <div class="przelacznik-grupowania">
        <button class="btn-segment ${state.grupowanie === 'kategoria' ? 'aktywny' : ''}" data-grupuj="kategoria">Wg kategorii</button>
        <button class="btn-segment ${state.grupowanie === 'pomieszczenie' ? 'aktywny' : ''}" data-grupuj="pomieszczenie">Wg pomieszczenia</button>
      </div>
    ` : ''}
    <div class="karta">${grupyHtml}</div>
    <div class="akcje-dodawania">
      <button class="btn" id="btn-dodaj-pozycje">+ Dodaj pozycję</button>
      <button class="btn wtorny" id="btn-dodaj-szablon">+ Typowy zestaw</button>
    </div>
    ${htmlPasekPodzialu(pozycje)}
    ${htmlPlatnosci(platnosci, suma)}
    <div class="podsumowanie">
      <span>Razem</span>
      <span class="kwota-calkowita">${formatujKwote(suma)}</span>
    </div>
    <div class="akcje-eksportu">
      <button class="btn wtorny" id="btn-drukuj">Eksportuj PDF</button>
      <button class="btn wtorny" id="btn-udostepnij" hidden>Udostępnij</button>
      <button class="btn wtorny" id="btn-duplikuj">Duplikuj projekt</button>
      <button class="btn wtorny niebezpieczny" id="btn-usun-projekt">Usuń projekt</button>
    </div>
  `;

  animujKwote(app.querySelector('.kwota-calkowita'), poprzedniaKwota, suma);

  document.getElementById('btn-dodaj-pozycje').addEventListener('click', () => dialogPozycja(projektId));
  document.getElementById('btn-dodaj-szablon').addEventListener('click', () => dialogSzablonPomieszczenia(projektId));
  document.getElementById('btn-drukuj').addEventListener('click', () => window.print());
  document.getElementById('btn-duplikuj').addEventListener('click', () => dialogDuplikujProjekt(projekt));
  document.getElementById('btn-usun-projekt').addEventListener('click', async () => {
    if (!confirm(`Usunąć projekt "${projekt.nazwa}" wraz ze wszystkimi pozycjami?`)) return;
    const usuniete = await usunProjekt(projektId);
    ustawWidok('projekty');
    pokazCofnij(`Usunięto projekt „${projekt.nazwa}”.`, () => przywrocProjekt(usuniete));
  });
  const btnUdostepnij = document.getElementById('btn-udostepnij');
  if (navigator.share) {
    btnUdostepnij.hidden = false;
    btnUdostepnij.addEventListener('click', () => udostepnijKosztorys(projekt, pozycje, suma));
  }
  app.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nowyStatus = btn.dataset.status;
      const byloZakonczone = statusProjektu(projekt) === 'zakonczony';
      const zmiany = { ...projekt, status: nowyStatus };
      // Data zakończenia podąża za statusem - ustawiana tylko ręczną zmianą
      // statusu na "Zakończony", czyszczona przy każdej zmianie na inny status.
      // (Wcześniej ustawiał ją też sam fakt 100% wpłat, niezależnie od statusu -
      // efekt: karta pokazywała "W trakcie" i "Zakończono DATA" jednocześnie.)
      zmiany.data_zakonczenia = nowyStatus === 'zakonczony' ? (projekt.data_zakonczenia || dzisiajYMD()) : null;
      await aktualizujProjekt(zmiany);
      if (nowyStatus === 'zakonczony' && !byloZakonczone) {
        pokazZakonczenieProjektu(zmiany, pozycje);
      } else {
        renderKosztorys(projektId);
      }
    });
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
      const pozycja = pozycje.find((p) => p.id === btn.dataset.usun);
      const usuniete = await usunPozycjeKosztorysu(btn.dataset.usun);
      renderKosztorys(projektId);
      // `usuniete` bywa puste przy podwójnym kliknięciu (drugi klik trafia
      // już nieistniejący rekord) - wtedy nie ma czego pokazywać/cofać.
      if (usuniete.pozycja) pokazCofnij(`Usunięto „${pozycja.nazwa}”.`, () => przywrocPozycjeKosztorysu(usuniete));
    });
  });

  const btnDodajPlatnosc = document.getElementById('btn-dodaj-platnosc');
  if (btnDodajPlatnosc) btnDodajPlatnosc.addEventListener('click', () => dialogPlatnosc(projektId));
  app.querySelectorAll('[data-usun-platnosc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const usunieta = await usunPlatnosc(btn.dataset.usunPlatnosc);
      renderKosztorys(projektId);
      if (usunieta) pokazCofnij(`Usunięto wpłatę ${formatujKwote(usunieta.kwota)}.`, () => przywrocPlatnosc(usunieta));
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
// Pierścień (donut) zamiast poziomego paska - czytelniejszy przy 4+
// kategoriach niż wąskie segmenty w jednym rzędzie. Rysowany ręcznie przez
// SVG <circle> ze stroke-dasharray/dashoffset (bez biblioteki wykresów -
// appka ma być w 100% self-hosted). `transform="rotate(-90 50 50)"` na
// grupie łuków, żeby pierwszy zaczynał się od godziny 12, jak w typowym
// wykresie kołowym, a nie od 3.
function htmlPasekPodzialu(pozycje) {
  const suma = sumaCalkowita(pozycje);
  if (suma <= 0) return '';
  const grupy = sumyKategorii(pozycje).filter((g) => g.suma > 0);
  if (grupy.length < 2) return '';

  const promien = 42;
  const obwod = 2 * Math.PI * promien;
  let dotychczas = 0;
  const luki = grupy.map((g, i) => {
    const proc = (g.suma / suma) * 100;
    const dlugosc = (proc / 100) * obwod;
    const kolor = PALETA_WYKRESU[i % PALETA_WYKRESU.length];
    const luk = `<circle class="luk-donuta" cx="50" cy="50" r="${promien}" stroke="${kolor}" stroke-dasharray="${dlugosc.toFixed(2)} ${(obwod - dlugosc).toFixed(2)}" stroke-dashoffset="${(-dotychczas).toFixed(2)}"><title>${esc(g.kategoria)}: ${formatujKwote(g.suma)} (${proc.toFixed(0)}%)</title></circle>`;
    dotychczas += dlugosc;
    return luk;
  }).join('');

  const legenda = grupy.map((g, i) => {
    const proc = Math.round((g.suma / suma) * 100);
    const kolor = PALETA_WYKRESU[i % PALETA_WYKRESU.length];
    return `<div class="legenda-pozycja"><span class="kropka" style="background:${kolor}"></span>${ikonaKategorii(g.kategoria)} ${esc(g.kategoria)} &middot; ${proc}%</div>`;
  }).join('');

  return `
    <div class="podzial-kosztow">
      <svg class="donut-podzialu" viewBox="0 0 100 100" role="img" aria-label="Podział kosztów wg kategorii">
        <circle class="donut-tlo" cx="50" cy="50" r="${promien}" />
        <g transform="rotate(-90 50 50)">${luki}</g>
        <text class="donut-liczba" x="50" y="47">${grupy.length}</text>
        <text class="donut-etykieta" x="50" y="60">${odmien(grupy.length, 'kategoria', 'kategorie', 'kategorii')}</text>
      </svg>
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
    <div class="pozycja pozycja-platnosci">
      <div>
        <div class="nazwa">${formatujKwote(p.kwota)}</div>
        <div class="szczegoly">${formatujDateYMD(p.data)}${p.opis ? ' &middot; ' + esc(p.opis) : ''}</div>
      </div>
      <button class="btn-usun" data-usun-platnosc="${p.id}" aria-label="Usuń wpłatę" title="Usuń wpłatę">${ikonaSvg('trash-2')}</button>
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
  const dzisiaj = dzisiajYMD();
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
      <input id="pole-opis-platnosci" type="text" placeholder="np. zaliczka" maxlength="200" />
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
  const [kategorieWszystkie, cennik, zdjecia] = await Promise.all([
    pobierzKategorie(),
    pobierzCennik(),
    edytowanaPozycja ? pobierzZdjeciaPozycji(edytowanaPozycja.id) : Promise.resolve([]),
  ]);
  const kategorie = kategorieWidoczne(kategorieWszystkie, edytowanaPozycja?.kategoria);
  const edycja = !!edytowanaPozycja;

  otworzDialog(`
    <h2>${edycja ? 'Edytuj pozycję' : 'Nowa pozycja'}</h2>
    ${cennik.length > 0 ? `
      <div class="pole">
        <label for="szukaj-cennik">Z cennika (opcjonalnie)</label>
        <input id="szukaj-cennik" type="text" placeholder="🔍 Szukaj czynności..." style="margin-bottom:6px;" />
        ${htmlSelectCennik('pole-z-cennika', kategorie, cennik)}
      </div>
    ` : ''}
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" value="${esc(edytowanaPozycja?.nazwa)}" maxlength="200" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria (dobierana automatycznie z czynności)</label>
      <select id="pole-kategoria" disabled>
        ${!edytowanaPozycja ? '<option value="" selected>— wybierz czynność z cennika, żeby dobrać kategorię —</option>' : ''}
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}" ${edytowanaPozycja?.kategoria === k.nazwa ? 'selected' : ''}>${ikonaKategoriiTekst(k.nazwa)} ${esc(k.nazwa)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-pomieszczenie">Pomieszczenie (opcjonalnie)</label>
      <input id="pole-pomieszczenie" type="text" list="lista-pomieszczen" placeholder="np. Łazienka" value="${esc(edytowanaPozycja?.pomieszczenie ?? '')}" maxlength="100" />
      <datalist id="lista-pomieszczen">
        ${POMIESZCZENIA_PODPOWIEDZI.map((p) => `<option value="${esc(p)}"></option>`).join('')}
      </datalist>
    </div>
    <div class="wiersz-pol">
      <div class="pole">
        <label for="pole-ilosc">Ilość</label>
        <input id="pole-ilosc" type="number" step="0.01" min="0" value="${edytowanaPozycja?.ilosc ?? 1}" />
      </div>
      <div class="pole">
        <label for="pole-jednostka">Jednostka</label>
        ${htmlSelectJednostka('pole-jednostka', edytowanaPozycja?.jednostka ?? 'szt.')}
      </div>
    </div>
    <div class="pole">
      <label for="pole-stawka">Stawka za jednostkę (zł)</label>
      <input id="pole-stawka" type="number" step="0.01" min="0" value="${edytowanaPozycja?.stawka ?? 0}" />
    </div>
    <div class="podglad-kwoty-box">
      <span>Kwota</span>
      <span id="podglad-kwoty">0,00 zł</span>
    </div>
    ${edycja ? htmlSekcjaZdjec(zdjecia) : ''}
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
      const zapamietanaIlosc = pobierzOstatniaIlosc(wybrany.id);
      if (zapamietanaIlosc !== undefined) poleIlosc.value = zapamietanaIlosc;
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
    if (poleZCennika && poleZCennika.value) {
      zapamietajIlosc(poleZCennika.value, Number(dane.ilosc));
    }
    if (edycja) {
      await aktualizujPozycjeKosztorysu({ ...edytowanaPozycja, ...dane, ilosc: Number(dane.ilosc), stawka: Number(dane.stawka), pomieszczenie: dane.pomieszczenie.trim() });
    } else {
      await dodajPozycjeKosztorysu(projektId, dane);
    }
    zamknijDialog();
    renderKosztorys(projektId);
  });

  if (edycja) {
    const inputZdjecie = document.getElementById('plik-zdjecie');
    inputZdjecie.addEventListener('change', async () => {
      const plik = inputZdjecie.files[0];
      if (!plik) return;
      try {
        const blob = await plikNaBlob(plik);
        await dodajZdjeciePozycji(edytowanaPozycja.id, blob);
        dialogPozycja(projektId, edytowanaPozycja);
      } catch (err) {
        alert(`Nie udało się dodać zdjęcia: ${err.message}`);
      }
    });
    document.querySelectorAll('[data-usun-zdjecie]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await usunZdjeciePozycji(btn.dataset.usunZdjecie);
        dialogPozycja(projektId, edytowanaPozycja);
      });
    });
  }
}

// Miniatury zdjęć "przed/po" dopiętych do pozycji kosztorysu - tylko przy
// edycji już zapisanej pozycji (nowa jeszcze nie ma id, do którego dopiąć
// zdjęcie w bazie). `data-url` na miniaturze znaczy URL.createObjectURL() do
// zwolnienia przy zamknięciu/odświeżeniu dialogu (patrz sprzatnijUrleObiektow).
function htmlSekcjaZdjec(zdjecia) {
  const miniatury = zdjecia.map((z) => {
    const url = URL.createObjectURL(z.blob);
    return `
      <div class="miniatura-zdjecia" data-url="${url}">
        <img src="${url}" alt="Zdjęcie pozycji" />
        <button class="btn-usun-miniatura" data-usun-zdjecie="${z.id}" type="button" aria-label="Usuń zdjęcie">${ikonaSvg('x')}</button>
      </div>
    `;
  }).join('');
  return `
    <div class="pole">
      <label>Zdjęcia (przed/po) - zostają tylko na tym telefonie</label>
      <div class="siatka-zdjec">
        ${miniatury}
        <label class="dodaj-zdjecie">
          ${ikonaSvg('camera')}
          <input type="file" id="plik-zdjecie" accept="image/*" capture="environment" hidden />
        </label>
      </div>
    </div>
  `;
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
      <optgroup label="${ikonaKategoriiTekst(k.nazwa)} ${esc(k.nazwa)}">
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

function dialogDuplikujProjekt(projekt) {
  otworzDialog(`
    <h2>Duplikuj projekt</h2>
    <div class="pole">
      <label for="pole-nazwa">Nazwa nowego projektu</label>
      <input id="pole-nazwa" type="text" value="Kopia - ${esc(projekt.nazwa)}" maxlength="200" />
    </div>
    <div class="uwaga">Skopiuje wszystkie pozycje kosztorysu. Płatności NIE są kopiowane - to historia konkretnego zlecenia.</div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">Duplikuj</button>
    </div>
  `);
  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const nazwa = document.getElementById('pole-nazwa').value.trim();
    if (!nazwa) return;
    const { projekt: nowyProjekt } = await duplikujProjekt(projekt.id, nazwa);
    zamknijDialog();
    ustawWidok('kosztorys', nowyProjekt.id);
  });
}

async function udostepnijKosztorys(projekt, pozycje, suma) {
  const linie = pozycje.map((p) => `- ${p.nazwa}: ${p.ilosc} ${p.jednostka} x ${formatujStawke(p.stawka, p.jednostka)} = ${p.stawka ? formatujKwote(kwotaPozycji(p.ilosc, p.stawka)) : 'do ustalenia'}`);
  const tekst = `Kosztorys: ${projekt.nazwa}${projekt.klient ? `\nKlient: ${projekt.klient}` : ''}\n\n${linie.join('\n')}\n\nRazem: ${formatujKwote(suma)}`;
  try {
    await navigator.share({ title: `Kosztorys - ${projekt.nazwa}`, text: tekst });
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Udostępnianie nieudane:', err);
  }
}

async function dialogSzablonPomieszczenia(projektId) {
  const nazwySzablonow = pobierzNazwySzablonowPomieszczen();
  otworzDialog(`
    <h2>Dodaj typowy zestaw</h2>
    <div class="pole">
      <label for="pole-szablon">Typ pomieszczenia</label>
      <select id="pole-szablon">
        ${nazwySzablonow.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-pomieszczenie">Nazwa pomieszczenia (do tagu)</label>
      <input id="pole-pomieszczenie" type="text" value="${esc(nazwySzablonow[0])}" maxlength="100" />
    </div>
    <div class="pole">
      <label>Czynności do dodania (odznacz to, czego nie potrzebujesz)</label>
      <div id="lista-szablonu" class="lista-checkboxow"></div>
    </div>
    <div class="uwaga">Każda pozycja doda się z ilością 1 - popraw realną ilość osobno dla każdej po dodaniu (stuknij pozycję w kosztorysie).</div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">Dodaj zaznaczone</button>
    </div>
  `);

  const poleSzablon = document.getElementById('pole-szablon');
  const polePomieszczenie = document.getElementById('pole-pomieszczenie');
  const listaSzablonu = document.getElementById('lista-szablonu');
  let aktualnePozycjeSzablonu = [];

  async function odswiezListe() {
    aktualnePozycjeSzablonu = await pobierzPozycjeSzablonu(poleSzablon.value);
    listaSzablonu.innerHTML = aktualnePozycjeSzablonu.length === 0
      ? '<div class="pusty-stan">Brak pozycji w cenniku dla tego szablonu (usunięte ręcznie?).</div>'
      : aktualnePozycjeSzablonu.map((c, i) => `
        <label class="wiersz-checkboxu">
          <input type="checkbox" data-indeks="${i}" checked />
          <span>${esc(c.nazwa)} <span class="szczegoly">(${formatujStawke(c.stawka, c.jednostka)})</span></span>
        </label>
      `).join('');
  }
  await odswiezListe();
  poleSzablon.addEventListener('change', () => {
    polePomieszczenie.value = poleSzablon.value;
    odswiezListe();
  });

  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const zaznaczone = [...listaSzablonu.querySelectorAll('input[type="checkbox"]:checked')]
      .map((cb) => aktualnePozycjeSzablonu[Number(cb.dataset.indeks)]);
    if (zaznaczone.length === 0) return;
    await dodajWielePozycjiKosztorysu(projektId, zaznaczone, polePomieszczenie.value);
    zamknijDialog();
    renderKosztorys(projektId);
  });
}

// ---------- Widok: Cennik ----------

let cennikPamiec = [];

async function renderCennik() {
  topbarTitle.innerHTML = htmlBanerKompaktowy('clipboard-list', 'Cennik');
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
        <button class="btn-usun" data-usun="${c.id}" aria-label="Usuń" title="Usuń">${ikonaSvg('trash-2')}</button>
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
      const usunieta = await usunPozycjeCennika(btn.dataset.usun);
      renderCennik();
      if (usunieta) pokazCofnij(`Usunięto „${usunieta.nazwa}” z cennika.`, () => przywrocPozycjeCennika(usunieta));
    });
  });
}

async function dialogPozycjaCennika(edytowanaPozycja = null, domyslnaKategoria = null, naZapisano = renderCennik) {
  const kategorieWszystkie = await pobierzKategorie();
  const kategorie = kategorieWidoczne(kategorieWszystkie, edytowanaPozycja?.kategoria ?? domyslnaKategoria);
  const edycja = !!edytowanaPozycja;
  const wybranaKategoria = edytowanaPozycja?.kategoria ?? domyslnaKategoria;
  otworzDialog(`
    <h2>${edycja ? 'Edytuj stawkę' : 'Nowa czynność w cenniku'}</h2>
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" value="${esc(edytowanaPozycja?.nazwa)}" maxlength="200" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria</label>
      <select id="pole-kategoria">
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}" ${wybranaKategoria === k.nazwa ? 'selected' : ''}>${ikonaKategoriiTekst(k.nazwa)} ${esc(k.nazwa)}</option>`).join('')}
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
    naZapisano();
  });
}

// ---------- Widok: Podsumowanie (miesięczne/roczne) ----------
// Dwie NIEZALEŻNE rzeczy, obie potrzebne, ale liczone inaczej (decyzja
// 2026-09-27): "liczba projektów" w danym miesiącu/roku wg daty ROZPOCZĘCIA
// projektu; "dochód" to suma faktycznie WPŁACONYCH kwot wg daty WPŁATY -
// więc wpłata za projekt rozpoczęty we wrześniu, wpłacona w październiku,
// liczy się do dochodu października, a projekt nadal wisi na liście września.

const MIESIACE_PL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

let podsumowaniePamiec = { projekty: [], platnosci: [] };

async function renderPodsumowanie() {
  topbarTitle.innerHTML = htmlBanerKompaktowy('bar-chart-3', 'Podsumowanie');
  const [projekty, platnosci, mapaPozycji] = await Promise.all([pobierzProjekty(), pobierzWszystkiePlatnosci(), pozycjeWgProjektuMapa()]);
  podsumowaniePamiec = {
    projekty: projekty.map((p) => ({ ...p, _suma: sumaCalkowita(mapaPozycji.get(p.id) || []) })),
    platnosci,
  };

  app.innerHTML = `
    <div class="przelacznik-grupowania">
      <button class="btn-segment ${state.podsumowanieTryb === 'miesiac' ? 'aktywny' : ''}" data-tryb-podsum="miesiac">Miesięcznie</button>
      <button class="btn-segment ${state.podsumowanieTryb === 'rok' ? 'aktywny' : ''}" data-tryb-podsum="rok">Rocznie</button>
    </div>
    <div id="tresc-podsumowania"></div>
  `;
  app.querySelectorAll('[data-tryb-podsum]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.podsumowanieTryb = btn.dataset.trybPodsum;
      renderTrescPodsumowania();
    });
  });
  renderTrescPodsumowania();
}

function projektyRoku(rok) {
  return podsumowaniePamiec.projekty.filter((p) => dataRozpoczeciaProjektu(p).slice(0, 4) === String(rok));
}
function projektyMiesiaca(rok, miesiac) {
  const prefiks = `${rok}-${String(miesiac + 1).padStart(2, '0')}`;
  return podsumowaniePamiec.projekty.filter((p) => dataRozpoczeciaProjektu(p).startsWith(prefiks));
}
function wplatySumaWFiltrze(filtrPrefiks) {
  return podsumowaniePamiec.platnosci
    .filter((pl) => pl.data.startsWith(filtrPrefiks))
    .reduce((acc, pl) => acc + Number(pl.kwota || 0), 0);
}
function odmienProjekty(n) {
  return odmien(n, 'projekt', 'projekty', 'projektów');
}

function renderTrescPodsumowania() {
  app.querySelectorAll('[data-tryb-podsum]').forEach((btn) => {
    btn.classList.toggle('aktywny', btn.dataset.trybPodsum === state.podsumowanieTryb);
  });
  const kontener = document.getElementById('tresc-podsumowania');
  const poprzedniaSuma = odczytajKwote(document.getElementById('suma-wplat-okresu')?.textContent);
  kontener.innerHTML = state.podsumowanieTryb === 'rok' ? htmlPodsumowanieRoku() : htmlPodsumowanieMiesiaca();
  wirePodsumowanie();
  const elSuma = document.getElementById('suma-wplat-okresu');
  animujKwote(elSuma, poprzedniaSuma, odczytajKwote(elSuma.textContent));
}

function htmlPodsumowanieRoku() {
  const rok = state.podsumowanieRok;
  const projektyTegoRoku = projektyRoku(rok);
  const sumaWplatRoku = wplatySumaWFiltrze(String(rok));

  const wplatyPerMiesiac = MIESIACE_PL.map((_, i) => wplatySumaWFiltrze(`${rok}-${String(i + 1).padStart(2, '0')}`));
  const maxWplata = Math.max(...wplatyPerMiesiac, 1);
  const dzis = new Date();
  const wykresTrendu = `
    <div class="karta">
      <div class="wykres-trendu">
        ${MIESIACE_PL.map((nazwa, i) => {
          const wartosc = wplatyPerMiesiac[i];
          const proc = (wartosc / maxWplata) * 100;
          const biezacy = i === dzis.getMonth() && rok === dzis.getFullYear();
          return `
            <div class="slupek-wykresu" data-miesiac="${i}" title="${nazwa}: ${formatujKwote(wartosc)}">
              <div class="slupek-wypelnienie ${biezacy ? 'biezacy' : ''}" style="height:${proc}%"></div>
              <span class="etykieta-slupka">${nazwa.slice(0, 3)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const wierszeMiesiecy = MIESIACE_PL.map((nazwa, i) => {
    const liczbaProj = projektyMiesiaca(rok, i).length;
    return `
      <div class="wiersz-miesiaca" data-miesiac="${i}">
        <span class="nazwa-miesiaca">${nazwa}</span>
        <span class="liczba-miesiaca">${liczbaProj} ${odmienProjekty(liczbaProj)}</span>
        <span class="kwota-miesiaca">${formatujKwote(wplatyPerMiesiac[i])}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="nawigacja-okresu">
      <button class="btn-nawigacja-okresu" id="btn-poprzedni-rok" aria-label="Poprzedni rok">${ikonaSvg('chevron-left')}</button>
      <span class="etykieta-okresu">${rok}</span>
      <button class="btn-nawigacja-okresu" id="btn-nastepny-rok" aria-label="Następny rok">${ikonaSvg('chevron-right')}</button>
    </div>
    <div class="karta">
      <div class="wiersz-podsumowania"><span>Projektów rozpoczętych w ${rok}</span><span>${projektyTegoRoku.length}</span></div>
      <div class="wiersz-podsumowania wiersz-suma"><span>Wpłacono w ${rok}</span><span id="suma-wplat-okresu">${formatujKwote(sumaWplatRoku)}</span></div>
    </div>
    ${wplatyPerMiesiac.some((w) => w > 0) ? wykresTrendu : ''}
    <div class="uwaga">Liczba projektów liczona wg daty rozpoczęcia. Wpłaty liczone wg daty wpłaty - mogą pochodzić też z projektów rozpoczętych w innym roku. Stuknij miesiąc/słupek, żeby zobaczyć szczegóły.</div>
    <div class="karta lista-miesiecy">${wierszeMiesiecy}</div>
  `;
}

function htmlPodsumowanieMiesiaca() {
  const rok = state.podsumowanieRok;
  const miesiac = state.podsumowanieMiesiac;
  const projektyMies = projektyMiesiaca(rok, miesiac).sort((a, b) => dataRozpoczeciaProjektu(a).localeCompare(dataRozpoczeciaProjektu(b)));
  const wplaty = wplatySumaWFiltrze(`${rok}-${String(miesiac + 1).padStart(2, '0')}`);

  const listaHtml = projektyMies.length === 0
    ? '<div class="pusty-stan-male">Brak projektów rozpoczętych w tym miesiącu.</div>'
    : projektyMies.map((p) => `
      <div class="pozycja karta-projekt-podsumowania" data-id="${p.id}">
        <div>
          <div class="nazwa">${esc(p.nazwa)}</div>
          <div class="szczegoly">${esc(p.klient) || 'Bez klienta'} &middot; ${formatujDateYMD(dataRozpoczeciaProjektu(p))}</div>
          ${htmlOdznakaStatusu(statusProjektu(p))}
        </div>
        <div class="kwota">${formatujKwote(p._suma)}</div>
      </div>
    `).join('');

  return `
    <div class="nawigacja-okresu">
      <button class="btn-nawigacja-okresu" id="btn-poprzedni-miesiac" aria-label="Poprzedni miesiąc">${ikonaSvg('chevron-left')}</button>
      <span class="etykieta-okresu">${MIESIACE_PL[miesiac]} ${rok}</span>
      <button class="btn-nawigacja-okresu" id="btn-nastepny-miesiac" aria-label="Następny miesiąc">${ikonaSvg('chevron-right')}</button>
    </div>
    <div class="karta">
      <div class="wiersz-podsumowania"><span>Projektów rozpoczętych</span><span>${projektyMies.length}</span></div>
      <div class="wiersz-podsumowania wiersz-suma"><span>Wpłacono w tym miesiącu</span><span id="suma-wplat-okresu">${formatujKwote(wplaty)}</span></div>
    </div>
    <div class="karta">${listaHtml}</div>
  `;
}

function wirePodsumowanie() {
  const btnPoprzedniRok = document.getElementById('btn-poprzedni-rok');
  const btnNastepnyRok = document.getElementById('btn-nastepny-rok');
  if (btnPoprzedniRok) btnPoprzedniRok.addEventListener('click', () => { state.podsumowanieRok--; renderTrescPodsumowania(); });
  if (btnNastepnyRok) btnNastepnyRok.addEventListener('click', () => { state.podsumowanieRok++; renderTrescPodsumowania(); });

  const btnPoprzedniMiesiac = document.getElementById('btn-poprzedni-miesiac');
  const btnNastepnyMiesiac = document.getElementById('btn-nastepny-miesiac');
  if (btnPoprzedniMiesiac) {
    btnPoprzedniMiesiac.addEventListener('click', () => {
      state.podsumowanieMiesiac--;
      if (state.podsumowanieMiesiac < 0) { state.podsumowanieMiesiac = 11; state.podsumowanieRok--; }
      renderTrescPodsumowania();
    });
  }
  if (btnNastepnyMiesiac) {
    btnNastepnyMiesiac.addEventListener('click', () => {
      state.podsumowanieMiesiac++;
      if (state.podsumowanieMiesiac > 11) { state.podsumowanieMiesiac = 0; state.podsumowanieRok++; }
      renderTrescPodsumowania();
    });
  }

  app.querySelectorAll('.wiersz-miesiaca, .slupek-wykresu').forEach((el) => {
    el.addEventListener('click', () => {
      state.podsumowanieMiesiac = Number(el.dataset.miesiac);
      state.podsumowanieTryb = 'miesiac';
      renderTrescPodsumowania();
    });
  });

  app.querySelectorAll('.karta-projekt-podsumowania').forEach((el) => {
    el.addEventListener('click', () => ustawWidok('kosztorys', el.dataset.id, el));
  });
}

// ---------- Widok: Ustawienia ----------

// Które kategorie mają rozwiniętą listę czynności - trzyma się między
// odświeżeniami renderUstawienia (np. po edycji/usunięciu pozycji), żeby
// rozwinięcie nie znikało po każdej zmianie.
const rozwinieteKategorieUstawien = new Set();

async function renderUstawienia() {
  topbarTitle.innerHTML = htmlBanerKompaktowy('settings', 'Ustawienia');
  const [kategorie, firma, cennik] = await Promise.all([pobierzKategorie(), pobierzDaneFirmy(), pobierzCennik()]);
  const motyw = pobierzMotyw();

  app.innerHTML = `
    <div class="karta">
      <h3 class="sekcja-tytul">Wygląd</h3>
      <div class="przelacznik-grupowania">
        <button class="btn-segment ${motyw === 'system' ? 'aktywny' : ''}" data-motyw-wybor="system">Systemowy</button>
        <button class="btn-segment ${motyw === 'jasny' ? 'aktywny' : ''}" data-motyw-wybor="jasny">Jasny</button>
        <button class="btn-segment ${motyw === 'ciemny' ? 'aktywny' : ''}" data-motyw-wybor="ciemny">Ciemny</button>
      </div>
      <button class="btn wtorny maly" id="btn-pokaz-powitanie" style="margin-top:12px;">Pokaż ekran powitalny</button>
    </div>

    <div class="karta">
      <h3 class="sekcja-tytul">Dane firmy (widoczne na wydruku)</h3>
      <div class="pole">
        <label for="pole-firma-nazwa">Nazwa firmy / imię i nazwisko</label>
        <input id="pole-firma-nazwa" type="text" value="${esc(firma.nazwa)}" maxlength="200" />
      </div>
      <div class="pole">
        <label for="pole-firma-telefon">Telefon</label>
        <input id="pole-firma-telefon" type="text" value="${esc(firma.telefon)}" maxlength="30" />
      </div>
      <div class="pole">
        <label for="pole-firma-email">E-mail</label>
        <input id="pole-firma-email" type="text" value="${esc(firma.email)}" maxlength="200" />
      </div>
      <div class="pole">
        <label>Logo (widoczne na wydruku/PDF)</label>
        ${firma.logo ? `
          <div class="podglad-logo">
            <img src="${firma.logo}" alt="Logo firmy" />
            <button class="btn wtorny maly niebezpieczny" id="btn-usun-logo" type="button">Usuń logo</button>
          </div>
        ` : `
          <button class="btn wtorny maly" id="btn-wgraj-logo" type="button">Wgraj logo</button>
        `}
        <input type="file" id="plik-logo" accept="image/*" hidden />
      </div>
      <button class="btn" id="btn-zapisz-firme">Zapisz dane firmy</button>
    </div>

    <div class="karta">
      <h3 class="sekcja-tytul">Kategorie</h3>
      <div class="lista-kategorii">
        ${kategorie.map((k) => {
          const rozwinieta = rozwinieteKategorieUstawien.has(k.id);
          const czynnosci = cennik.filter((c) => c.kategoria === k.nazwa);
          return `
          <div class="grupa-kategorii">
            <div class="wiersz-kategorii wiersz-kategorii-klikalny" data-rozwin-kategorie="${k.id}">
              <span class="wiersz-kategorii-etykieta">${ikonaKategoriiOdznaka(k.nazwa)} ${esc(k.nazwa)} <span class="licznik-czynnosci">(${czynnosci.length})</span></span>
              <span class="wiersz-kategorii-akcje">
                <button class="btn wtorny maly" data-toggle-kategoria="${k.id}">${k.ukryta ? 'Pokaż' : 'Ukryj'}</button>
                <button class="btn wtorny maly niebezpieczny" data-usun-kategorie="${k.id}" title="Usuń na stałe">Usuń</button>
              </span>
            </div>
            ${rozwinieta ? `
              <div class="lista-czynnosci-kategorii">
                ${czynnosci.length === 0 ? '<div class="pusty-stan-male">Brak czynności w tej kategorii.</div>' : czynnosci.map((c) => `
                  <div class="pozycja pozycja-czynnosc" data-edytuj-czynnosc="${c.id}">
                    <div>
                      <div class="nazwa">${esc(c.nazwa)}</div>
                      <div class="szczegoly">${formatujStawke(c.stawka, c.jednostka)}</div>
                    </div>
                    <button class="btn-usun" data-usun-czynnosc="${c.id}" aria-label="Usuń" title="Usuń">${ikonaSvg('trash-2')}</button>
                  </div>
                `).join('')}
                <button class="btn wtorny maly" data-dodaj-czynnosc="${k.id}" style="margin-top:8px;">+ Dodaj czynność</button>
              </div>
            ` : ''}
          </div>
        `; }).join('')}
      </div>
      <div class="pole" style="margin-top:14px;">
        <label for="pole-nowa-kategoria">Nowa kategoria</label>
        <div style="display:flex; gap:8px;">
          <input id="pole-nowa-kategoria" type="text" placeholder="np. Ogród / Taras" style="flex:1;" maxlength="100" />
          <button class="btn maly" id="btn-dodaj-kategorie">Dodaj</button>
        </div>
      </div>
    </div>

    <div class="karta">
      <h3 class="sekcja-tytul">Przywróć domyślne</h3>
      <div class="uwaga">Cofnie własne zmiany w cenniku i kategoriach: zmienione stawki, ukryte/usunięte kategorie oraz dodane własne czynności — wszystko wróci do fabrycznych 14 kategorii i 60 czynności ze stawkami orientacyjnymi. Projekty, kosztorysy, płatności i dane firmy NIE zostaną ruszone. Rozważ najpierw eksport kopii zapasowej poniżej.</div>
      <button class="btn niebezpieczny" id="btn-reset-cennika">Przywróć domyślny cennik i kategorie</button>
    </div>

    <div class="karta">
      <h3 class="sekcja-tytul">Kopia zapasowa</h3>
      <div class="uwaga">Wszystkie dane siedzą tylko na tym telefonie. Zgubiony/wymieniony telefon = zero danych bez kopii. Zrób eksport od czasu do czasu i zapisz plik gdzieś poza telefonem (mail do siebie, dysk w chmurze).</div>
      <button class="btn" id="btn-eksportuj-kopie">Eksportuj kopię zapasową</button>
      <button class="btn wtorny" id="btn-importuj-kopie" style="margin-top:8px;">Importuj kopię zapasową</button>
      <input type="file" id="plik-importu" accept="application/json" hidden />
    </div>
  `;

  app.querySelectorAll('[data-motyw-wybor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      zastosujMotyw(btn.dataset.motywWybor);
      renderUstawienia();
    });
  });

  document.getElementById('btn-pokaz-powitanie').addEventListener('click', pokazOnboarding);

  const plikLogo = document.getElementById('plik-logo');
  const btnWgrajLogo = document.getElementById('btn-wgraj-logo');
  if (btnWgrajLogo) btnWgrajLogo.addEventListener('click', () => plikLogo.click());
  const btnUsunLogo = document.getElementById('btn-usun-logo');
  if (btnUsunLogo) {
    btnUsunLogo.addEventListener('click', async () => {
      await zapiszLogoFirmy(null);
      renderUstawienia();
    });
  }
  plikLogo.addEventListener('change', async () => {
    const plik = plikLogo.files[0];
    if (!plik) return;
    try {
      const dataUrl = await plikNaDataUrl(plik);
      await zapiszLogoFirmy(dataUrl);
      renderUstawienia();
    } catch (err) {
      alert(`Nie udało się wgrać logo: ${err.message}`);
    } finally {
      plikLogo.value = '';
    }
  });

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
    try {
      await dodajKategorie(nazwa);
      renderUstawienia();
    } catch (err) {
      alert(err.message);
    }
  });

  app.querySelectorAll('[data-toggle-kategoria]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const kategoria = kategorie.find((k) => k.id === btn.dataset.toggleKategoria);
      await aktualizujKategorie({ ...kategoria, ukryta: !kategoria.ukryta });
      renderUstawienia();
    });
  });

  app.querySelectorAll('[data-rozwin-kategorie]').forEach((wiersz) => {
    wiersz.addEventListener('click', () => {
      const id = wiersz.dataset.rozwinKategorie;
      if (rozwinieteKategorieUstawien.has(id)) {
        rozwinieteKategorieUstawien.delete(id);
      } else {
        rozwinieteKategorieUstawien.add(id);
      }
      renderUstawienia();
    });
  });

  app.querySelectorAll('[data-edytuj-czynnosc]').forEach((el) => {
    el.addEventListener('click', () => {
      const pozycja = cennik.find((c) => c.id === el.dataset.edytujCzynnosc);
      dialogPozycjaCennika(pozycja, null, renderUstawienia);
    });
  });

  app.querySelectorAll('[data-usun-czynnosc]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const usunieta = await usunPozycjeCennika(btn.dataset.usunCzynnosc);
      renderUstawienia();
      if (usunieta) pokazCofnij(`Usunięto „${usunieta.nazwa}” z cennika.`, () => przywrocPozycjeCennika(usunieta));
    });
  });

  app.querySelectorAll('[data-dodaj-czynnosc]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kategoria = kategorie.find((k) => k.id === btn.dataset.dodajCzynnosc);
      dialogPozycjaCennika(null, kategoria.nazwa, renderUstawienia);
    });
  });

  app.querySelectorAll('[data-usun-kategorie]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
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

  document.getElementById('btn-reset-cennika').addEventListener('click', async () => {
    const tresc = 'Przywrócić domyślny cennik i kategorie?\n\n'
      + 'Stracisz własne zmiany stawek, ukryte/usunięte kategorie i dodane czynności — wrócą fabryczne 14 kategorii i 60 pozycji cennika.\n\n'
      + 'Projekty, kosztorysy, płatności i dane firmy zostaną bez zmian. Tej operacji nie da się cofnąć (chyba że masz kopię zapasową).';
    if (!confirm(tresc)) return;
    await przywrocDomyslnyCennik();
    rozwinieteKategorieUstawien.clear();
    renderUstawienia();
  });

  document.getElementById('btn-eksportuj-kopie').addEventListener('click', async () => {
    const kopia = await eksportujCalaBaze();
    const json = JSON.stringify(kopia, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `o-majster-kopia-${dzisiajYMD()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Nie wiemy, czy user faktycznie zapisał plik gdzieś bezpiecznie (mógł
    // anulować dialog zapisu) - ale to najlepszy dostępny sygnał "kopia
    // zrobiona", do przypomnienia w `sprawdzPrzypomnienieKopii()`.
    try { localStorage.setItem(KLUCZ_OSTATNIEGO_EKSPORTU, dzisiajYMD()); } catch {}
  });

  const plikImportu = document.getElementById('plik-importu');
  document.getElementById('btn-importuj-kopie').addEventListener('click', () => plikImportu.click());
  plikImportu.addEventListener('change', async () => {
    const plik = plikImportu.files[0];
    if (!plik) return;
    // Import PODMIENIA projekty/pozycje/płatności/ustawienia z tym samym ID
    // (nadpisuje bez ostrzeżenia) i scala cennik/kategorie - pomyłkowo
    // wybrany plik (np. stara kopia) cicho cofnąłby część danych. Jedno
    // pytanie kontrolne, zanim cokolwiek się zmieni w bazie.
    if (!confirm('Import scali dane z pliku z tym, co już masz w aplikacji (może nadpisać projekty/płatności o tych samych ID). Kontynuować?')) {
      plikImportu.value = '';
      return;
    }
    const MAX_ROZMIAR_KOPII_MB = 50;
    if (plik.size > MAX_ROZMIAR_KOPII_MB * 1024 * 1024) {
      alert(`Plik jest za duży (max ${MAX_ROZMIAR_KOPII_MB} MB) - to nie wygląda na kopię zapasową O!Majster.`);
      plikImportu.value = '';
      return;
    }
    try {
      const tekst = await plik.text();
      const kopia = JSON.parse(tekst);
      const wynik = await importujCalaBaze(kopia);
      const podsumowanie = Object.entries(wynik)
        .filter(([, liczba]) => liczba > 0)
        .map(([nazwa, liczba]) => `${nazwa}: ${liczba}`)
        .join(', ');
      alert(`Zaimportowano:\n${podsumowanie || 'plik nie zawierał żadnych danych'}`);
      renderUstawienia();
    } catch (err) {
      alert(`Nie udało się zaimportować pliku: ${err.message}`);
    } finally {
      plikImportu.value = '';
    }
  });
}

function odmienPozycje(n) {
  return odmien(n, 'pozycję', 'pozycje', 'pozycji');
}

// ---------- Dialog (generyczny) ----------

// `[data-url]` znaczy element trzymający URL.createObjectURL() (miniatury zdjęć) -
// trzeba go jawnie zwolnić, inaczej blob zostaje w pamięci mimo usunięcia z DOM.
function sprzatnijUrleObiektow() {
  dialog.querySelectorAll('[data-url]').forEach((el) => URL.revokeObjectURL(el.dataset.url));
}
function otworzDialog(html) {
  sprzatnijUrleObiektow();
  dialog.classList.remove('zamykanie');
  dialog.innerHTML = `<div class="dialog-tresc">${html}</div>`;
  // Dialog może być już otwarty (np. dogranie/skasowanie zdjęcia odświeża
  // zawartość w miejscu) - showModal() na już otwartym dialogu rzuca wyjątkiem.
  if (!dialog.open) dialog.showModal();
}
function zamknijDialog() {
  if (dialog.classList.contains('zamykanie')) return;
  dialog.classList.add('zamykanie');
  let zrobione = false;
  const zakoncz = () => {
    if (zrobione) return;
    zrobione = true;
    dialog.close();
    sprzatnijUrleObiektow();
    dialog.innerHTML = '';
    dialog.classList.remove('zamykanie');
  };
  // transitionend jako główny sygnał końca animacji, setTimeout jako zabezpieczenie
  // (np. prefers-reduced-motion skraca czas trwania do prawie zera, ale zdarzenie
  // wciąż powinno się odpalić - timeout to tylko siatka bezpieczeństwa).
  dialog.addEventListener('transitionend', zakoncz, { once: true });
  setTimeout(zakoncz, 200);
}
// ---------- Toast "Cofnij" (siatka bezpieczeństwa po usunięciu) ----------
// Usuwanie kasuje z bazy OD RAZU (nie ma "kosza" ani odroczonego kasowania) -
// to `akcjaCofnij` przywraca dokładnie ten sam rekord z powrotem, gdyby ktoś
// się rozmyślił w ciągu kilku sekund. Jeden toast na raz - kolejne usunięcie
// podmienia poprzedni, zamiast je stertować.
let cofnijTimeout = null;
function pokazCofnij(tekst, akcjaCofnij) {
  clearTimeout(cofnijTimeout);
  let toast = document.getElementById('toast-cofnij');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-cofnij';
    toast.className = 'toast-cofnij';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${esc(tekst)}</span><button class="toast-cofnij-btn">Cofnij</button>`;
  // Restart animacji wjazdu nawet jeśli poprzedni toast był jeszcze widoczny.
  toast.classList.remove('widoczny');
  void toast.offsetWidth;
  toast.classList.add('widoczny');
  toast.querySelector('.toast-cofnij-btn').addEventListener('click', async () => {
    clearTimeout(cofnijTimeout);
    toast.classList.remove('widoczny');
    await akcjaCofnij();
    render();
  });
  cofnijTimeout = setTimeout(() => toast.classList.remove('widoczny'), 6000);
}

// ---------- Onboarding (pokazany raz, przy pierwszym uruchomieniu) ----------

const KLUCZ_ONBOARDINGU = 'o-majster-onboarding-widziany';
function pokazOnboardingJesliPotrzebny() {
  let widziany = true;
  try {
    widziany = localStorage.getItem(KLUCZ_ONBOARDINGU) === '1';
  } catch {
    return; // brak localStorage (tryb prywatny) - nie blokujemy appki onboardingiem
  }
  if (!widziany) pokazOnboarding();
}
// Wydzielone z pokazOnboardingJesliPotrzebny(), żeby dało się to samo okno
// odpalić ręcznie z Ustawień (np. żeby komuś pokazać appkę jeszcze raz) -
// bez tego jedyny sposób ponownego zobaczenia banera to czyszczenie localStorage.
function pokazOnboarding() {
  otworzDialog(`
    ${htmlBanerPelny()}
    ${htmlNotatkaPrywatnosci()}
    <p>Cennik (60 typowych czynności) ma już wpisane <strong>orientacyjne stawki rynkowe</strong> — to punkt startowy, nie Twoje realne ceny. Warto je poprawić na swoje w zakładce <strong>Cennik</strong> (stuknij pozycję, żeby zmienić stawkę na stałe).</p>
    <p>W kosztorysie każdą pozycję też edytujesz stuknięciem — ilość, stawkę, pomieszczenie.</p>
    <div class="dialog-akcje">
      <button class="btn" id="btn-rozumiem">Rozumiem, zaczynam</button>
    </div>
  `);
  document.getElementById('btn-rozumiem').addEventListener('click', () => {
    try { localStorage.setItem(KLUCZ_ONBOARDINGU, '1'); } catch { /* trudno, pokaże się znowu */ }
    zamknijDialog();
  });
}

// ---------- Powiadomienia (w aplikacji - appka nie wysyła nic na zewnątrz) ----------
// Sprawdzane raz przy starcie appki: dla każdego aktywnego (nie zakończonego)
// projektu z ustawioną datą rozpoczęcia liczy różnicę dni do dziś i - jeśli
// akurat wypada 5, 2 lub 0 dni - tworzy powiadomienie (istniejePowiadomienie
// pilnuje, żeby nie dublować przy kolejnym otwarciu appki tego samego dnia).

const KOMUNIKATY_STARTOWE = [
  (nazwa, kwota) => `Dziś ruszasz z "${nazwa}"! Do zarobienia ${formatujKwote(kwota)} 💪`,
  (nazwa, kwota) => `Dzień dobry, Majster! "${nazwa}" startuje dziś. Na koncie może wylądować ${formatujKwote(kwota)}.`,
  (nazwa, kwota) => `To dziś: "${nazwa}". Ekipa gotowa, kwota kosztorysu to ${formatujKwote(kwota)} - do dowiezienia.`,
  (nazwa, kwota) => `Startujemy! "${nazwa}" wchodzi dziś na plac budowy. Cel: ${formatujKwote(kwota)}.`,
  (nazwa, kwota) => `Nowy dzień, nowa robota: "${nazwa}" rusza dziś. ${formatujKwote(kwota)} do zainkasowania po drodze.`,
  (nazwa, kwota) => `Pobudka! Dziś zaczynasz "${nazwa}" - ${formatujKwote(kwota)} czeka na koniec prac.`,
];

async function sprawdzPowiadomieniaProjektow() {
  let projekty;
  try {
    projekty = await pobierzProjekty();
  } catch {
    return; // brak dostępu do bazy - nic nie sprawdzamy, appka i tak dalej działa
  }
  const dzis = new Date();
  dzis.setHours(0, 0, 0, 0);

  for (const p of projekty) {
    if (!p.data_rozpoczecia || statusProjektu(p) === 'zakonczony') continue;
    const start = new Date(p.data_rozpoczecia + 'T00:00:00');
    if (Number.isNaN(start.getTime())) continue;
    const roznicaDni = Math.round((start - dzis) / 86400000);

    if (roznicaDni === 5 && !(await istniejePowiadomienie(p.id, '5dni'))) {
      await dodajPowiadomienie({ projektId: p.id, typ: '5dni', tresc: `Za 5 dni startuje projekt "${p.nazwa}" - czas dopiąć ostatnie szczegóły.` });
    } else if (roznicaDni === 2 && !(await istniejePowiadomienie(p.id, '2dni'))) {
      await dodajPowiadomienie({ projektId: p.id, typ: '2dni', tresc: `Za 2 dni zaczynasz "${p.nazwa}". Przygotuj sprzęt i materiały.` });
    } else if (roznicaDni === 0 && !(await istniejePowiadomienie(p.id, 'start'))) {
      const suma = sumaCalkowita(await pobierzPozycjeProjektu(p.id));
      const komunikat = KOMUNIKATY_STARTOWE[Math.floor(Math.random() * KOMUNIKATY_STARTOWE.length)](p.nazwa, suma);
      await dodajPowiadomienie({ projektId: p.id, typ: 'start', tresc: komunikat });
    }
  }
  await odswiezOdznakePowiadomien();
}

// Przypomnienie o kopii zapasowej - dane siedzą TYLKO na tym telefonie, więc
// brak świeżego eksportu = ryzyko utraty wszystkiego przy zgubieniu/wymianie
// urządzenia. `projektId: ID_POWIADOMIEN_SYSTEMOWYCH` (nie prawdziwy projekt) -
// `pokazPowiadomienia()` i tak nie zależy od projekt_id przy wyświetlaniu.
const ID_POWIADOMIEN_SYSTEMOWYCH = 'system';
const DNI_DO_PRZYPOMNIENIA_KOPII = 14;
async function sprawdzPrzypomnienieKopii() {
  let projekty, powiadomienia;
  try {
    [projekty, powiadomienia] = await Promise.all([pobierzProjekty(), pobierzPowiadomienia()]);
  } catch {
    return; // brak dostępu do bazy - nic nie sprawdzamy, appka i tak dalej działa
  }
  if (projekty.length === 0) return; // nic jeszcze do zabezpieczenia

  let ostatniEksport = null;
  try { ostatniEksport = localStorage.getItem(KLUCZ_OSTATNIEGO_EKSPORTU); } catch {}
  const dzis = new Date(dzisiajYMD() + 'T00:00:00');
  const dniOdEksportu = ostatniEksport ? Math.round((dzis - new Date(ostatniEksport + 'T00:00:00')) / 86400000) : Infinity;
  if (dniOdEksportu < DNI_DO_PRZYPOMNIENIA_KOPII) return; // kopia świeża

  // Nie duplikuj przypomnienia codziennie - tylko jeśli poprzednie (jeśli
  // istnieje) samo jest starsze niż próg.
  const ostatniePrzypomnienie = powiadomienia
    .filter((p) => p.projekt_id === ID_POWIADOMIEN_SYSTEMOWYCH && p.typ === 'kopia-zapasowa')
    .sort((a, b) => b.data_utworzenia.localeCompare(a.data_utworzenia))[0];
  const dniOdPrzypomnienia = ostatniePrzypomnienie
    ? Math.round((dzis - new Date(ostatniePrzypomnienie.data_utworzenia)) / 86400000)
    : Infinity;
  if (dniOdPrzypomnienia < DNI_DO_PRZYPOMNIENIA_KOPII) return;

  const tresc = ostatniEksport
    ? `Minęło ${dniOdEksportu} dni od ostatniej kopii zapasowej - zrób nową w Ustawieniach, żeby nie stracić danych.`
    : 'Nie masz jeszcze kopii zapasowej danych - zrób ją w Ustawieniach (Kopia zapasowa), żeby nic nie przepadło przy zgubieniu/wymianie telefonu.';
  await dodajPowiadomienie({ projektId: ID_POWIADOMIEN_SYSTEMOWYCH, typ: 'kopia-zapasowa', tresc });
  await odswiezOdznakePowiadomien();
}

// Poprzednia liczba nieprzeczytanych - do wykrycia "przybyło nowe
// powiadomienie" (a nie np. odświeżenia po oznaczeniu jako przeczytane, gdzie
// liczba spada - puls ma sygnalizować coś NOWEGO, nie każdą zmianę).
let poprzedniaLiczbaPowiadomien = 0;
async function odswiezOdznakePowiadomien() {
  const liczba = await pobierzLiczbeNieprzeczytanychPowiadomien();
  if (liczba > 0) {
    odznakaPowiadomien.textContent = liczba > 9 ? '9+' : String(liczba);
    odznakaPowiadomien.hidden = false;
  } else {
    odznakaPowiadomien.hidden = true;
  }
  if (liczba > poprzedniaLiczbaPowiadomien) {
    btnPowiadomienia.classList.remove('puls');
    void btnPowiadomienia.offsetWidth; // wymusza reflow - pozwala odpalić animację ponownie, gdyby liczba rosła kilka razy pod rząd
    btnPowiadomienia.classList.add('puls');
  }
  poprzedniaLiczbaPowiadomien = liczba;
}

async function pokazPowiadomienia() {
  const powiadomienia = await pobierzPowiadomienia();
  otworzDialog(`
    <h2>Powiadomienia</h2>
    ${powiadomienia.length === 0
      ? '<div class="pusty-stan">Brak powiadomień.<br>Pojawią się tu przypomnienia o zbliżających się projektach.</div>'
      : powiadomienia.map((p) => `
        <div class="wiersz-powiadomienia ${p.przeczytane ? '' : 'nieprzeczytane'}">
          <div class="tresc-powiadomienia">${esc(p.tresc)}</div>
          <div class="data-powiadomienia">${new Date(p.data_utworzenia).toLocaleDateString('pl-PL')}</div>
        </div>
      `).join('')}
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-zamknij-powiadomienia">Zamknij</button>
    </div>
  `);
  document.getElementById('btn-zamknij-powiadomienia').addEventListener('click', zamknijDialog);
  if (powiadomienia.some((p) => !p.przeczytane)) {
    await oznaczPowiadomieniaJakoPrzeczytane();
    await odswiezOdznakePowiadomien();
  }
}
btnPowiadomienia.addEventListener('click', pokazPowiadomienia);

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

odswiezKolorPaskaStatusu();
render();
pokazOnboardingJesliPotrzebny();
// Baza pulsu dzwonka MUSI być ustawiona PRZED sprawdzPowiadomieniaProjektow/
// sprawdzPrzypomnienieKopii (obie mogą same dopisać nowe powiadomienia) -
// inaczej pierwsze porównanie widziałoby już powiększoną liczbę i albo
// fałszywie pulsowałoby przy starych, nieprzeczytanych powiadomieniach z
// poprzedniej sesji (poprzedniaLiczbaPowiadomien startowe 0 < cokolwiek),
// albo nie zauważyłoby świeżo dodanych. Najpierw cichy odczyt ustawia bazę
// i pokazuje aktualną odznakę bez pulsu, dopiero potem lecą sprawdzenia,
// które mogą realnie coś nowego dopisać.
pobierzLiczbeNieprzeczytanychPowiadomien().then(async (n) => {
  poprzedniaLiczbaPowiadomien = n;
  await odswiezOdznakePowiadomien();
  sprawdzPowiadomieniaProjektow();
  sprawdzPrzypomnienieKopii();
});

// Kurczący się nagłówek przy przewijaniu - `requestAnimationFrame` jako
// throttle (bez tego `scroll` potrafi odpalić się kilkadziesiąt razy na
// sekundę i niepotrzebnie przełączać tę samą klasę w kółko).
let scrollRaf = null;
window.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    topbar.classList.toggle('zwiniety', window.scrollY > 8);
    scrollRaf = null;
  });
}, { passive: true });
