import {
  pobierzProjekty, dodajProjekt, usunProjekt,
  pobierzKategorie, dodajKategorie,
  pobierzCennik, dodajPozycjeCennika, aktualizujPozycjeCennika, usunPozycjeCennika,
  pobierzPozycjeProjektu, dodajPozycjeKosztorysu, aktualizujPozycjeKosztorysu, usunPozycjeKosztorysu,
} from './db.js';
import { kwotaPozycji, sumyKategorii, sumaCalkowita, formatujKwote } from './calc.js';

const app = document.getElementById('app');
const topbarTitle = document.getElementById('topbar-title');
const dialog = document.getElementById('dialog');
const tabButtons = document.querySelectorAll('.tab-btn');

const state = { widok: 'projekty', projektId: null };

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

// ---------- Nawigacja ----------

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => ustawWidok(btn.dataset.widok));
});

function ustawWidok(widok, projektId = null) {
  state.widok = widok;
  state.projektId = projektId;
  tabButtons.forEach((btn) => {
    btn.toggleAttribute('aria-current', btn.dataset.widok === widok);
    if (btn.dataset.widok === widok) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  render();
}

async function render() {
  if (state.widok === 'projekty') return renderProjekty();
  if (state.widok === 'kosztorys') return renderKosztorys(state.projektId);
  if (state.widok === 'cennik') return renderCennik();
}

// ---------- Widok: Projekty ----------

async function renderProjekty() {
  topbarTitle.textContent = 'Majster';
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

  const pozycje = await pobierzPozycjeProjektu(projektId);
  const grupy = grupujPoKategorii(pozycje);
  const suma = sumaCalkowita(pozycje);

  const grupyHtml = pozycje.length === 0
    ? '<div class="pusty-stan">Brak pozycji.<br>Dodaj pierwszą wykonaną pracę.</div>'
    : grupy.map(({ kategoria, pozycje: poz, suma: sumaKat }) => `
      <div class="kategoria-naglowek"><span>${esc(kategoria)}</span><span>${formatujKwote(sumaKat)}</span></div>
      ${poz.map((p) => `
        <div class="pozycja" data-id="${p.id}">
          <div>
            <div class="nazwa">${esc(p.nazwa)}</div>
            <div class="szczegoly">${p.ilosc} ${esc(p.jednostka)} &times; ${formatujKwote(p.stawka)}</div>
          </div>
          <div class="kwota">${formatujKwote(kwotaPozycji(p.ilosc, p.stawka))}</div>
          <button class="btn-usun" data-usun="${p.id}" aria-label="Usuń" title="Usuń">🗑</button>
        </div>
      `).join('')}
    `).join('');

  app.innerHTML = `
    ${projekt.klient ? `<div class="uwaga">Klient: ${esc(projekt.klient)}</div>` : ''}
    <div class="karta">${grupyHtml}</div>
    <button class="btn" id="btn-dodaj-pozycje">+ Dodaj pozycję</button>
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

  document.getElementById('btn-dodaj-pozycje').addEventListener('click', () => dialogNowaPozycja(projektId));
  document.getElementById('btn-drukuj').addEventListener('click', () => window.print());
  document.getElementById('btn-csv').addEventListener('click', () => eksportujCSV(projekt, pozycje));
  document.getElementById('btn-usun-projekt').addEventListener('click', async () => {
    if (!confirm(`Usunąć projekt "${projekt.nazwa}" wraz ze wszystkimi pozycjami?`)) return;
    await usunProjekt(projektId);
    ustawWidok('projekty');
  });
  app.querySelectorAll('[data-usun]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await usunPozycjeKosztorysu(btn.dataset.usun);
      renderKosztorys(projektId);
    });
  });
}

function grupujPoKategorii(pozycje) {
  const sumy = sumyKategorii(pozycje);
  return sumy.map(({ kategoria, suma }) => ({
    kategoria,
    suma,
    pozycje: pozycje.filter((p) => (p.kategoria || 'Bez kategorii') === kategoria),
  }));
}

async function dialogNowaPozycja(projektId) {
  const [kategorie, cennik] = await Promise.all([pobierzKategorie(), pobierzCennik()]);

  otworzDialog(`
    <h2>Nowa pozycja</h2>
    ${cennik.length > 0 ? `
      <div class="pole">
        <label for="pole-z-cennika">Z cennika (opcjonalnie)</label>
        <select id="pole-z-cennika">
          <option value="">— wpisz ręcznie —</option>
          ${cennik.map((c) => `<option value="${c.id}">${esc(c.nazwa)} (${formatujKwote(c.stawka)}/${esc(c.jednostka)})</option>`).join('')}
        </select>
      </div>
    ` : ''}
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria</label>
      <select id="pole-kategoria">
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}">${esc(k.nazwa)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-ilosc">Ilość</label>
      <input id="pole-ilosc" type="number" step="0.01" min="0" value="1" />
    </div>
    <div class="pole">
      <label for="pole-jednostka">Jednostka</label>
      <input id="pole-jednostka" type="text" placeholder="m2, mb, szt., kpl." value="szt." />
    </div>
    <div class="pole">
      <label for="pole-stawka">Stawka za jednostkę (zł)</label>
      <input id="pole-stawka" type="number" step="0.01" min="0" value="0" />
    </div>
    <div class="pole">
      <label>Kwota</label>
      <div id="podglad-kwoty" style="font-weight:600; font-size:16px;">0,00 zł</div>
    </div>
    <div class="dialog-akcje">
      <button class="btn wtorny" id="btn-anuluj">Anuluj</button>
      <button class="btn" id="btn-zapisz">Dodaj</button>
    </div>
  `);

  const poleNazwa = document.getElementById('pole-nazwa');
  const poleKategoria = document.getElementById('pole-kategoria');
  const poleIlosc = document.getElementById('pole-ilosc');
  const poleJednostka = document.getElementById('pole-jednostka');
  const poleStawka = document.getElementById('pole-stawka');
  const podgladKwoty = document.getElementById('podglad-kwoty');
  const poleZCennika = document.getElementById('pole-z-cennika');

  function przeliczPodglad() {
    podgladKwoty.textContent = formatujKwote(kwotaPozycji(poleIlosc.value, poleStawka.value));
  }
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

  document.getElementById('btn-anuluj').addEventListener('click', zamknijDialog);
  document.getElementById('btn-zapisz').addEventListener('click', async () => {
    const nazwa = poleNazwa.value.trim();
    if (!nazwa) return;
    await dodajPozycjeKosztorysu(projektId, {
      nazwa,
      kategoria: poleKategoria.value,
      jednostka: poleJednostka.value || 'szt.',
      ilosc: poleIlosc.value,
      stawka: poleStawka.value,
    });
    zamknijDialog();
    renderKosztorys(projektId);
  });
}

function eksportujCSV(projekt, pozycje) {
  const naglowek = ['Kategoria', 'Nazwa', 'Ilość', 'Jednostka', 'Stawka', 'Kwota'];
  const wiersze = pozycje.map((p) => [
    p.kategoria, p.nazwa, p.ilosc, p.jednostka, p.stawka, kwotaPozycji(p.ilosc, p.stawka),
  ]);
  wiersze.push([]);
  wiersze.push(['', '', '', '', 'RAZEM', sumaCalkowita(pozycje)]);

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

async function renderCennik() {
  topbarTitle.textContent = 'Cennik';
  const cennik = await pobierzCennik();

  const listaHtml = cennik.length === 0
    ? '<div class="pusty-stan">Cennik jest pusty.<br>Dodaj typowe czynności ze stawkami, żeby szybciej budować kosztorysy.</div>'
    : cennik.map((c) => `
      <div class="pozycja" data-id="${c.id}">
        <div>
          <div class="nazwa">${esc(c.nazwa)}</div>
          <div class="szczegoly">${esc(c.kategoria)} &middot; ${formatujKwote(c.stawka)} / ${esc(c.jednostka)}</div>
        </div>
        <button class="btn-usun" data-usun="${c.id}" aria-label="Usuń" title="Usuń">🗑</button>
      </div>
    `).join('');

  app.innerHTML = `
    <div class="karta">${listaHtml}</div>
    <button class="btn" id="btn-nowa-pozycja-cennika">+ Dodaj czynność do cennika</button>
  `;

  document.getElementById('btn-nowa-pozycja-cennika').addEventListener('click', dialogNowaPozycjaCennika);
  app.querySelectorAll('[data-usun]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await usunPozycjeCennika(btn.dataset.usun);
      renderCennik();
    });
  });
}

async function dialogNowaPozycjaCennika() {
  const kategorie = await pobierzKategorie();
  otworzDialog(`
    <h2>Nowa czynność w cenniku</h2>
    <div class="pole">
      <label for="pole-nazwa">Nazwa czynności</label>
      <input id="pole-nazwa" type="text" placeholder="np. Ułożenie płytek podłogowych" />
    </div>
    <div class="pole">
      <label for="pole-kategoria">Kategoria</label>
      <select id="pole-kategoria">
        ${kategorie.map((k) => `<option value="${esc(k.nazwa)}">${esc(k.nazwa)}</option>`).join('')}
      </select>
    </div>
    <div class="pole">
      <label for="pole-jednostka">Jednostka</label>
      <input id="pole-jednostka" type="text" placeholder="m2, mb, szt., kpl." value="m2" />
    </div>
    <div class="pole">
      <label for="pole-stawka">Stawka (zł za jednostkę)</label>
      <input id="pole-stawka" type="number" step="0.01" min="0" value="0" />
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
    await dodajPozycjeCennika({
      nazwa,
      kategoria: document.getElementById('pole-kategoria').value,
      jednostka: document.getElementById('pole-jednostka').value || 'szt.',
      stawka: document.getElementById('pole-stawka').value,
    });
    zamknijDialog();
    renderCennik();
  });
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.error('SW rejestracja nieudana:', err));
  });
}

render();
