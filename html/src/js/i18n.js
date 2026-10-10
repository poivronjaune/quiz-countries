(function () {
  const LANGUAGE_KEY = "atlas.language.v1";
  const CONTINENTS_FR = {
    Africa: "Afrique",
    Antarctica: "Antarctique",
    Asia: "Asie",
    Europe: "Europe",
    "North America": "Amérique du Nord",
    Oceania: "Océanie",
    "South America": "Amérique du Sud",
  };
  const french = {
    "title.continents": "ATLAS | Continents",
    "title.quiz": "ATLAS | Quiz de géographie",
    "skip.link": "Aller au contenu",
    "brand.aria": "ATLAS, continents",
    "profile.aria": "Votre profil",
    "profile.name.label": "Nom (facultatif)",
    "profile.age.label": "Âge (facultatif)",
    "profile.name.placeholder": "Votre nom",
    "profile.age.placeholder": "Âge",
    "profile.save": "Enregistrer",
    "profile.saved": "Enregistré sur cet appareil.",
    "profile.age.error": "Saisissez un âge entier positif.",
    "profile.save.error": "Impossible d’enregistrer votre profil dans ce navigateur.",
    "menu.aria": "Menu principal",
    "menu.continents": "Continents",
    "menu.quiz": "Quiz",
    "language.label": "Langue",
    "language.english": "English",
    "language.french": "Français",
    "footer.credit": "Conçu par poivronjaune",
    "footer.data": "Données UN-M49",
    "continents.slogan": "Le monde en sept parties",
    "continents.title": "Continents",
    "continents.total": "{count} pays et territoires",
    "search.label": "Rechercher un pays",
    "search.placeholder": "Saisissez le début du nom d’un pays",
    "search.suggestions": "Pays correspondants",
    "search.empty": "Aucun pays ne commence par « {query} »",
    "panel.continents": "Continents",
    "map.aria": "Carte interactive du monde",
    "map.legend.continent": "Continent",
    "map.legend.country": "Pays",
    "map.legend.aria": "Légende de la carte",
    "map.zoom": "Zoom de la carte",
    "map.zoom.value": "{amount} fois",
    "map.zoom.reset": "Réinitialiser la vue",
    "map.zoom.full.enter": "Passer en plein écran",
    "map.zoom.full.exit": "Quitter le plein écran",
    "panel.countries": "Pays et territoires",
    "country.info.title": "Pays sélectionné",
    "country.flag.alt": "Drapeau de {country}",
    "country.iso": "Code ISO alpha-3",
    "country.small": "Trop petit pour apparaître sur cette carte.",
    "country.capital": "Capitale",
    "country.capital.none": "Aucune",
    "map.data.error": "Impossible de charger les données ATLAS. Ouvrez le site avec un serveur web.",
    "map.selected.continent": "{continent} sélectionné. {country} sélectionné.",
    "map.selected.country": "{country} sélectionné en {continent}.",
    "quiz.slogan": "Testez vos connaissances du monde",
    "quiz.title": "Quiz de géographie",
    "quiz.score": "Score",
    "quiz.setup": "Paramètres du quiz",
    "quiz.question.count": "Nombre de questions",
    "quiz.questions.option": "{count} questions",
    "quiz.start": "Commencer le quiz",
    "quiz.play.again": "Rejouer",
    "quiz.prompt.find": "Trouvez {country} sur la carte.",
    "quiz.progress": "Question {index} sur {total}",
    "quiz.complete": "Quiz terminé",
    "quiz.next": "Question suivante",
    "quiz.questions": "Questions",
    "quiz.state.correct": "Correct",
    "quiz.state.wrong": "Incorrect",
    "quiz.state.current": "En cours",
    "quiz.state.upcoming": "À venir",
    "quiz.feedback.initial": "Choisissez un nombre de questions pour commencer.",
    "quiz.feedback.select": "Cliquez sur le pays sur la carte pour répondre.",
    "quiz.feedback.correct": "Correct. Vous avez trouvé {country}.",
    "quiz.feedback.wrong": "Vous avez choisi {guess}. Le pays indiqué en vert est {country}.",
    "quiz.feedback.final.prompt": "Vous avez obtenu {score} sur {total}.",
    "quiz.feedback.final.status": "Résultat final : {score} sur {total}. Il restera affiché jusqu’à ce que vous quittiez cette page.",
    "quiz.feedback.no.countries": "Aucun pays sélectionnable n’est disponible sur la carte.",
    "quiz.map.title": "Carte du monde",
    "quiz.legend.unanswered": "Sans réponse",
    "quiz.legend.correct": "Bonne réponse",
    "quiz.legend.wrong": "Mauvaise réponse",
    "quiz.map.aria": "Carte du monde. Cliquez sur le pays indiqué dans la question.",
    "quiz.map.instructions": "Cliquez sur le pays demandé pour répondre. Faites défiler la carte ou utilisez le curseur pour zoomer.",
    "quiz.noscript": "ATLAS a besoin de JavaScript pour lancer le quiz de géographie.",
    "continents.noscript": "ATLAS a besoin de JavaScript pour afficher la carte interactive.",
  };
  const english = {
    "title.continents": "ATLAS | Continents",
    "title.quiz": "ATLAS | Geography quiz",
    "skip.link": "Skip to content",
    "brand.aria": "ATLAS, continents",
    "profile.aria": "Your profile",
    "profile.name.label": "Name (optional)",
    "profile.age.label": "Age (optional)",
    "profile.name.placeholder": "Your name",
    "profile.age.placeholder": "Age",
    "profile.save": "Save",
    "profile.saved": "Saved on this device.",
    "profile.age.error": "Enter a positive whole number for age.",
    "profile.save.error": "This browser could not save your profile.",
    "menu.aria": "Main menu",
    "menu.continents": "Continents",
    "menu.quiz": "Quiz",
    "language.label": "Language",
    "language.english": "English",
    "language.french": "Français",
    "footer.credit": "Designed by poivronjaune",
    "footer.data": "UN-M49 Data",
    "continents.slogan": "The world, in seven parts",
    "continents.title": "Continents",
    "continents.total": "{count} countries and areas",
    "search.label": "Search for a country",
    "search.placeholder": "Start typing a country name",
    "search.suggestions": "Matching countries",
    "search.empty": "No country starts with “{query}”",
    "panel.continents": "Continents",
    "map.aria": "Interactive world map",
    "map.legend.continent": "Continent",
    "map.legend.country": "Country",
    "map.legend.aria": "Map legend",
    "map.zoom": "Map zoom",
    "map.zoom.value": "{amount} times",
    "map.zoom.reset": "Reset view",
    "map.zoom.full.enter": "Enter full page view",
    "map.zoom.full.exit": "Exit full page view",
    "panel.countries": "Countries & areas",
    "country.info.title": "Selected country",
    "country.flag.alt": "Flag of {country}",
    "country.iso": "ISO alpha-3",
    "country.small": "Too small to be drawn on this map.",
    "country.capital": "Capital",
    "country.capital.none": "None",
    "map.data.error": "ATLAS data could not be loaded. Open this site through a web server.",
    "map.selected.continent": "{continent} selected. {country} selected.",
    "map.selected.country": "{country} selected in {continent}.",
    "quiz.slogan": "Put your world knowledge to the test",
    "quiz.title": "Geography quiz",
    "quiz.score": "Score",
    "quiz.setup": "Quiz setup",
    "quiz.question.count": "Number of questions",
    "quiz.questions.option": "{count} questions",
    "quiz.start": "Start quiz",
    "quiz.play.again": "Play again",
    "quiz.prompt.find": "Find {country} on the map.",
    "quiz.progress": "Question {index} of {total}",
    "quiz.complete": "Quiz complete",
    "quiz.next": "Next question",
    "quiz.questions": "Questions",
    "quiz.state.correct": "Correct",
    "quiz.state.wrong": "Wrong",
    "quiz.state.current": "Current",
    "quiz.state.upcoming": "Up next",
    "quiz.feedback.initial": "Choose a question count to begin.",
    "quiz.feedback.select": "Click the country on the map to submit your answer.",
    "quiz.feedback.correct": "Correct. You found {country}.",
    "quiz.feedback.wrong": "That was {guess}. The highlighted green country is {country}.",
    "quiz.feedback.final.prompt": "You scored {score} out of {total}.",
    "quiz.feedback.final.status": "Final score: {score} of {total}. Your result will stay here until you leave this page.",
    "quiz.feedback.no.countries": "There are no selectable countries on the map.",
    "quiz.map.title": "World map",
    "quiz.legend.unanswered": "Unanswered",
    "quiz.legend.correct": "Correct country",
    "quiz.legend.wrong": "Wrong pick",
    "quiz.map.aria": "World map. Click the country named in the quiz prompt.",
    "quiz.map.instructions": "Click the named country to submit your answer. Scroll over the map or use the slider to zoom.",
    "quiz.noscript": "ATLAS needs JavaScript to run the geography quiz.",
    "continents.noscript": "ATLAS needs JavaScript to display the interactive map.",
  };

  let language = "en";

  function t(key, values = {}) {
    let text = (language === "fr" ? french : english)[key] ?? key;
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  }

  function localizedCountryName(country) {
    return language === "fr" ? country.language?.fr?.name ?? country.name : country.name;
  }

  function localizedContinentName(continent) {
    return language === "fr" ? countryContinent(continent) : continent;
  }

  function countryContinent(continent) {
    return CONTINENTS_FR[continent] ?? continent;
  }

  function localizedCapital(country) {
    if (language !== "fr") return country.capital;
    return country.language?.fr?.capital ?? country.capital;
  }

  function localizedCapitalNote(country) {
    if (language !== "fr") return country.capitalNote;
    return country.language?.fr?.capitalNote ?? country.capitalNote;
  }

  function applyStaticText() {
    document.documentElement.lang = language;
    const titleKey = document.body.dataset.titleKey;
    if (titleKey) document.title = t(titleKey);

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const values = element.dataset.i18nCount ? { count: element.dataset.i18nCount } : {};
      element.textContent = t(element.dataset.i18n, values);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
    });

    const selector = document.querySelector("[data-language-selector]");
    if (selector) {
      selector.value = language;
      selector.setAttribute("aria-label", t("language.label"));
    }
  }

  function setLanguage(value) {
    language = value === "fr" ? "fr" : "en";
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // The selected language still applies for this page if storage is unavailable.
    }
    applyStaticText();
    document.dispatchEvent(new CustomEvent("atlas:languagechange", { detail: { language } }));
  }

  function init() {
    try {
      language = localStorage.getItem(LANGUAGE_KEY) === "fr" ? "fr" : "en";
    } catch {
      language = "en";
    }
    const selector = document.querySelector("[data-language-selector]");
    selector?.addEventListener("change", () => setLanguage(selector.value));
    applyStaticText();
  }

  window.ATLAS_I18N = {
    init,
    t,
    get language() { return language; },
    countryName: localizedCountryName,
    continentName: localizedContinentName,
    capitalName: localizedCapital,
    capitalNote: localizedCapitalNote,
  };
})();
