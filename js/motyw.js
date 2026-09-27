// Ustawia wymuszony motyw PRZED narysowaniem strony, żeby nie mignęło złym
// kolorem (np. jasny na ułamek sekundy, mimo że wybrany jest ciemny).
// Wydzielone z inline <script> w index.html (2026-09-27) - CSP (script-src
// 'self', bez 'unsafe-inline') blokowałaby inline skrypt, a to jest jedyny
// kawałek JS, który MUSI wykonać się przed narysowaniem strony (stąd zwykły
// <script src>, nie type="module"/defer - ma zablokować renderowanie, tak
// jak poprzednio inline).
try {
  var zapisanyMotyw = localStorage.getItem('o-majster-motyw');
  if (zapisanyMotyw === 'jasny' || zapisanyMotyw === 'ciemny') {
    document.documentElement.setAttribute('data-motyw', zapisanyMotyw);
  }
} catch (e) {}
