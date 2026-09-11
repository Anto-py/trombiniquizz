(function () {
	let images;
	let imagesArray;
	let isPhotoStudent;
	let isPhotoStudentOK;
	let isConditionNumberPhotosOK;
	let imageSource;
	let studentNameFromImageElement;
	// Vrai quand les photos ont été trouvées par détection générique (Cabanga,
	// logiciel non reconnu) : on passe alors par un écran de vérification, car
	// les couples photo / nom sont devinés et non lus à un endroit connu du DOM.
	let modeVerification = false;

	// ---------------------------------------------------------------------
	// Détection générique : Cabanga et tout logiciel non reconnu
	// ---------------------------------------------------------------------

	const REGEX_URL_CSS = /url\(\s*["']?(.*?)["']?\s*\)/;
	const MOTIFS_IMAGE_INTERFACE = /logo|sprite|banner|banniere|icone|icon|drapeau|flag|qrcode|pictogram/i;
	const MOTIFS_PHOTO_ABSENTE = /silhouette|placeholder|default|defaut|anonyme|inconnu|no[-_]?photo|blank|vide/i;
	const MOTIFS_TEXTE_PARASITE = /^(photo|portrait|image|avatar|élève|eleve)(\s+(de|du|d'|de la))?\s*:?\s*/i;
	// « Photo de l'élève », « Avatar » : des libellés d'interface, pas des noms.
	const MOTIFS_NOM_GENERIQUE = /^(l['’]|la |le |un |une |mon |ma |cet? )?(élève|eleve|étudiant|etudiant|utilisateur|profil|avatar|portrait|photo|image|inconnu)e?s?$/i;

	function texteNettoye(texte) {
		return (texte || "").replace(/\s+/g, " ").trim();
	}

	// textContent colle les textes voisins (« DUPONT Jean6TQ ») : on assemble
	// plutôt les enfants directs en les séparant par une espace.
	function texteDesEnfants(element) {
		const parties = [];
		for (const enfant of element.childNodes) {
			const texte = texteNettoye(enfant.textContent);
			if (texte !== "") {
				parties.push(texte);
			}
		}
		return parties.join(" ");
	}

	function sourceDeLImage(element) {
		if (element.tagName === "IMG") {
			return (
				element.currentSrc ||
				element.getAttribute("src") ||
				element.dataset.src ||
				""
			);
		}
		const fond = window.getComputedStyle(element).backgroundImage;
		const trouve = fond ? fond.match(REGEX_URL_CSS) : null;
		return trouve ? trouve[1] : "";
	}

	function estDansInterface(element) {
		return (
			element.closest(
				"nav, header, footer, aside, [role='navigation'], [role='banner']"
			) !== null
		);
	}

	// Une photo d'élève est une image visible, assez grande, au format portrait
	// ou carré, hors barres de navigation, et dont l'adresse ne trahit pas un
	// élément d'interface (logo, icône…). Plancher à 0,4 et non 0,5 : Cabanga
	// sert des photos 150×324 (ratio 0,46), vérifié en direct le 2026-09-11,
	// qu'un plancher à 0,5 rejetait presque toutes sauf une.
	function ressembleAUnePhoto(element) {
		const rect = element.getBoundingClientRect();
		if (rect.width < 40 || rect.height < 40) {
			return false;
		}
		const proportion = rect.width / rect.height;
		if (proportion < 0.4 || proportion > 1.6) {
			return false;
		}
		if (estDansInterface(element)) {
			return false;
		}
		const source = sourceDeLImage(element);
		if (source === "" || source.startsWith("data:image/gif")) {
			return false;
		}
		const signature =
			source +
			" " +
			(element.getAttribute("class") || "") +
			" " +
			(element.id || "");
		return !MOTIFS_IMAGE_INTERFACE.test(signature);
	}

	function nomDepuisAttributs(element) {
		const candidats = [
			element.getAttribute("alt"),
			element.getAttribute("title"),
			element.getAttribute("aria-label"),
		];
		for (const candidat of candidats) {
			const texte = texteNettoye(candidat).replace(MOTIFS_TEXTE_PARASITE, "");
			if (
				texte.length >= 3 &&
				texte.length <= 60 &&
				!MOTIFS_NOM_GENERIQUE.test(texte)
			) {
				return texte;
			}
		}
		return "";
	}

	// À défaut d'attribut exploitable, le nom est le texte du premier ancêtre
	// qui en porte un court : la carte de l'élève, et non toute la grille.
	function nomDepuisVoisinage(element) {
		let noeud = element;
		for (let niveau = 0; niveau < 5; niveau++) {
			const parent = noeud.parentElement;
			if (!parent) {
				return "";
			}
			const texte = texteDesEnfants(parent);
			if (texte.length >= 3 && texte.length <= 80) {
				return texte.replace(MOTIFS_TEXTE_PARASITE, "");
			}
			noeud = parent;
		}
		return "";
	}

	function detecterPhotos() {
		const photos = [];
		const sourcesVues = new Set();
		const elements = document.body.querySelectorAll("*");
		for (const element of elements) {
			if (!ressembleAUnePhoto(element)) {
				continue;
			}
			const source = sourceDeLImage(element);
			// Deux élèves peuvent partager la même image d'attente : on ne
			// dédoublonne que les vraies photos.
			const estPhotoReelle = !MOTIFS_PHOTO_ABSENTE.test(source);
			if (estPhotoReelle && sourcesVues.has(source)) {
				continue;
			}
			sourcesVues.add(source);
			photos.push(element);
		}
		return photos;
	}

	function activerDetectionGenerique() {
		images = detecterPhotos();
		isPhotoStudent = () => true;
		isPhotoStudentOK = (element) => {
			const source = sourceDeLImage(element);
			return source !== "" && !MOTIFS_PHOTO_ABSENTE.test(source);
		};
		isConditionNumberPhotosOK = (tableau) => tableau.length > 0;
		imageSource = (element) => sourceDeLImage(element);
		studentNameFromImageElement = (element) => {
			return nomDepuisAttributs(element) || nomDepuisVoisinage(element);
		};
		modeVerification = true;
		return images.length > 0;
	}

	// ---------------------------------------------------------------------
	// Reconnaissance du logiciel affiché
	// ---------------------------------------------------------------------

	function checkSource() {
		const url = window.location.href;
		if (url.indexOf("pronote") > -1) {
			images = document.body.querySelectorAll('div[role="button"] img.img-portrait');
			isPhotoStudent = (image) => {
				return image.alt.includes("Photo de");
			};
			isPhotoStudentOK = (image) => {
				return !image.classList.contains("img-portrait-empty") && !image.src.includes("PortraitSilhouette.png");
			};
			isConditionNumberPhotosOK = (imagesArray) => {
				return imagesArray.length < 3 ? false : true;
			};
			imageSource = (image) => {
				return isPhotoStudentOK(image) ? image.dataset.src : image.src;
			};
			studentNameFromImageElement = (image) => {
				const imageSrc = image.dataset.src;
				const srcSansParametres = imageSrc.split("?")[0];
				const indexDerniereBarreOblique = srcSansParametres.lastIndexOf("/");
				const nomPrenom = decodeURIComponent(
					srcSansParametres
						.substring(indexDerniereBarreOblique + 1)
						.replace(".jpg", "")
				);
				const indexPremiereMinuscule = nomPrenom.search(/[a-zà-ÿ]/);
				const partiePrenom = nomPrenom.substring(indexPremiereMinuscule - 1);
				const partieNom = nomPrenom.substring(0, indexPremiereMinuscule - 1);
				const nom = partieNom.replaceAll("_", " ");
				const prenom = partiePrenom.replaceAll("_", " ");
				return prenom + " " + nom;
			};
			return true;
		}
		if (url.indexOf("moodle") > -1 || url.indexOf("magistere") > -1) {
			images = document.body.querySelectorAll("th img");
			isPhotoStudent = (image) => {
				return image.classList.contains("userpicture");
			};
			isPhotoStudentOK = (image) => {
				return true;
			};
			isConditionNumberPhotosOK = (imagesArray) => {
				return true;
			};
			imageSource = (image) => {
				// Permet d'obtenir une image de meilleure qualité sur Moodle
				const source = image.src.replace("f2?rev=", "f3?rev=");
				return source;
			};
			studentNameFromImageElement = (image) => {
				return image.parentNode.textContent;
			};
			return true;
		}
		if (url.indexOf("ecoledirecte") > -1) {
			images = document.body.querySelectorAll(".panel-eleve img");
			isPhotoStudent = (image) => {
				return image.alt.includes("élève");
			};
			isPhotoStudentOK = (image) => {
				return image.src.includes("eleve") ? false : true;
			};
			isConditionNumberPhotosOK = (imagesArray) => {
				return true;
			};
			imageSource = (image) => {
				return image.src;
			};
			studentNameFromImageElement = (image) => {
				return image.parentNode.querySelector("p").textContent;
			};
			return true;
		}
		if (url.indexOf("oneconnect") > -1) {
			images = document.body.querySelectorAll(".item.user div.top");
			isPhotoStudent = (image) => {
				return true;
			};
			isPhotoStudentOK = (image) => {
				return true;
			};
			isConditionNumberPhotosOK = (imagesArray) => {
				return true;
			};
			const regexFindImageSource = /"(?<url>.*?)"/;
			imageSource = (image) => {
				const styleStringBackgroundImage = image.style.backgroundImage
				const styleStringFindImage = styleStringBackgroundImage.match(regexFindImageSource);
				const src = styleStringFindImage.groups.url;
				return src;
			};
			studentNameFromImageElement = (image) => {
				return image.parentNode.querySelector(".bottom span.ng-binding")
					.textContent;
			};
			return true;
		}
		if (document.body.classList.contains("apprendre-prenoms")) {
			images = document.body.querySelectorAll("#image-list img");
			isPhotoStudent = (image) => {
				return true;
			};
			isPhotoStudentOK = (image) => {
				return true;
			};
			isConditionNumberPhotosOK = (imagesArray) => {
				return true;
			};
			imageSource = (image) => {
				return image.src;
			};
			studentNameFromImageElement = (image) => {
				return image.parentNode.querySelector("span[contenteditable]")
					.textContent;
			};
			return true;
		}
		// Cabanga, et tout logiciel dont la structure n'est pas connue : les
		// photos sont repérées à leur apparence, puis soumises à vérification.
		return activerDetectionGenerique();
	}

	const isSourceOK = checkSource();

	if (isSourceOK == false) {
		alert(
			"Trombiquiz n'a trouvé aucune photo d'élève sur cette page.\n\nSur Pronote : Mes données / Classes-élèves / Trombinoscope.\nSur Cabanga : ouvrez le trombinoscope d'une classe ou d'un groupe, faites défiler la page jusqu'en bas pour que toutes les photos soient chargées, puis relancez Trombiquiz."
		);
		return;
	} else {
		imagesArray = Array.from(images);
		if (!isConditionNumberPhotosOK(imagesArray)) {
			alert(
				"Pour que l'outil fonctionne, il faut aller dans Mes données / Classes-élèves / Trombinoscope, puis sélectionner une classe"
			);
			return;
		}
	}

	// ---------------------------------------------------------------------
	// Collecte des élèves et génération des pages
	// ---------------------------------------------------------------------

	function echapper(texte) {
		return (texte || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function collecterEleves(imgArray) {
		const eleves = [];
		for (const image of imgArray) {
			if (!isPhotoStudent(image)) {
				continue;
			}
			eleves.push({
				src: imageSource(image),
				nom: texteNettoye(studentNameFromImageElement(image)),
				photo: isPhotoStudentOK(image),
			});
		}
		return eleves;
	}

	function genererPageQuiz(eleves) {
		var htmlContent =
			'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0"></meta><title>Trombiquiz</title></head><style>div{margin-top:10px; text-align:center;} section, footer, div {display:none;} button {margin:10px;} footer {display: none; justify-content: center; align-items: center; height: 50%; font-size: 20px;} .noPhotos{display:block!important;} b{display:block;margin-top:2em;}img{height:350px;}</style><body>';

		for (var i = 0; i < eleves.length; i++) {
			const eleve = eleves[i];
			htmlContent += '<div class="eleve">';
			htmlContent += '<img src="' + echapper(eleve.src) + '" /><br>';
			if (eleve.photo) {
				htmlContent +=
					'<button onclick="montrerNomPrenom()">Montrer la réponse</button>';
				htmlContent +=
					'<section class="sectionReponse">' + echapper(eleve.nom) + "<br>";
			} else {
				htmlContent +=
					'<section class="sectionReponse noPhotos"><b>Pas de photo disponible !</b><br>' +
					echapper(eleve.nom) +
					"<br>";
			}
			htmlContent += '<button onclick="difficile()">Difficile</button>';
			htmlContent +=
				'<button onclick="facile()">Facile</button></section></div>';
		}
		htmlContent +=
			"<footer>Bravo, vous connaissez tous les élèves de votre classe !</footer>";
		htmlContent += `<script>
      let end = false;
      let index = 0;
      let show = false;
      let indexElevesFaciles = [];

      const eleves = document.querySelectorAll(".eleve");
      eleves[index].style.display = "block";

      const sectionsReponse = document.querySelectorAll(".sectionReponse");

      function montrerNomPrenom() {
        sectionsReponse[index].style.display = "block";
        show = true;
      }

      function eleveSuivant() {
		do {
          sectionsReponse[index].style.display = "none";
          eleves[index].style.display = "none";
          index = (index + 1) % eleves.length;
        } while (indexElevesFaciles.includes(index) && index < eleves.length);
        eleves[index].style.display = "block";
      }
      function difficile() {
        show = false;
        eleveSuivant();
      }
      function facile() {
        show = false;
        indexElevesFaciles.push(index);
        if (indexElevesFaciles.length == eleves.length) {
          end = true;
          const footer = document.querySelector("footer");
          eleves[index].style.display = "none";
          footer.style.display = "flex";
        } else {
          eleveSuivant();
        }
      }
      window.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !end) {
          montrerNomPrenom();
        }
        const isNoPhoto = eleves[index].querySelector(".noPhotos") !== null;

        if (event.key === "ArrowLeft" && (show || isNoPhoto)) {
          difficile();
        }
        if (event.key === "ArrowRight" && (show || isNoPhoto)) {
          facile();
        }
      });
    </script>`;
		htmlContent += "</body></html>";
		return htmlContent;
	}

	function generateContent(imgArray) {
		return genererPageQuiz(collecterEleves(imgArray));
	}

	// Écran de vérification : affiché quand les couples photo / nom ont été
	// devinés. Les noms y sont corrigeables et les intrus supprimables avant de
	// lancer le quiz.
	function genererPageVerification(eleves) {
		const donnees = JSON.stringify(eleves).replace(/</g, "\\u003c");
		return (
			'<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Trombiquiz : vérification</title><style>' +
			"body{font-family:system-ui,sans-serif;margin:0;padding:1.5em;line-height:1.5;}" +
			"h1{font-size:1.3em;margin:0 0 .3em;} p.aide{margin:0 0 1.5em;color:#444;max-width:45em;}" +
			"ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:1em;}" +
			"li{border:1px solid #ccc;border-radius:8px;padding:.6em;text-align:center;}" +
			"li.retire{opacity:.35;}" +
			"img{width:100%;height:150px;object-fit:contain;background:#f4f4f4;border-radius:4px;}" +
			"input{width:100%;box-sizing:border-box;margin-top:.5em;padding:.3em;font-size:1em;text-align:center;}" +
			".retirer{margin-top:.4em;background:none;border:none;color:#b00;cursor:pointer;font-size:.9em;}" +
			".actions{position:sticky;bottom:0;background:#fff;padding:1em 0;margin-top:1em;border-top:1px solid #ddd;text-align:center;}" +
			".actions button{font-size:1em;padding:.6em 1.2em;margin:0 .4em;cursor:pointer;}" +
			"</style></head><body>" +
			"<h1>Vérifiez la liste avant de commencer</h1>" +
			'<p class="aide">Trombiquiz a repéré ces photos automatiquement, car il ne connaît pas la structure de ce logiciel. Corrigez les noms erronés, retirez ce qui n\'est pas un élève, puis choisissez l\'ordre. Si des élèves manquent, fermez cette page, faites défiler tout le trombinoscope pour charger les photos, et relancez Trombiquiz.</p>' +
			'<ul id="liste"></ul>' +
			'<div class="actions"><button id="aleatoire">Commencer, ordre aléatoire</button><button id="alphabetique">Commencer, ordre alphabétique</button></div>' +
			"<script>const DONNEES = " +
			donnees +
			";" +
			`
      const liste = document.getElementById("liste");
      DONNEES.forEach(function (eleve, position) {
        const item = document.createElement("li");
        item.dataset.position = position;
        const image = document.createElement("img");
        image.src = eleve.src;
        const champ = document.createElement("input");
        champ.type = "text";
        champ.value = eleve.nom;
        champ.placeholder = "Prénom Nom";
        const retirer = document.createElement("button");
        retirer.className = "retirer";
        retirer.textContent = "Retirer";
        retirer.addEventListener("click", function () {
          item.classList.toggle("retire");
          retirer.textContent = item.classList.contains("retire")
            ? "Remettre"
            : "Retirer";
        });
        item.appendChild(image);
        item.appendChild(champ);
        item.appendChild(retirer);
        liste.appendChild(item);
      });

      function elevesValides() {
        const resultat = [];
        liste.querySelectorAll("li").forEach(function (item) {
          if (item.classList.contains("retire")) {
            return;
          }
          const eleve = DONNEES[item.dataset.position];
          resultat.push({
            src: eleve.src,
            nom: item.querySelector("input").value.trim(),
            photo: eleve.photo,
          });
        });
        return resultat;
      }

      function demarrer(aleatoire) {
        const eleves = elevesValides();
        if (eleves.length === 0) {
          alert("Il ne reste aucun élève dans la liste.");
          return;
        }
        window.opener.trombiquizDemarrer(eleves, aleatoire);
      }

      document.getElementById("aleatoire").addEventListener("click", function () {
        demarrer(true);
      });
      document
        .getElementById("alphabetique")
        .addEventListener("click", function () {
          demarrer(false);
        });
    </script></body></html>`
		);
	}

	function writeContent(w, html) {
		w.document.open();
		w.document.write(html);
		w.document.close();
	}

	function generatePage(html) {
		var newWindow = window.open();
		if (newWindow && !newWindow.closed) {
			writeContent(newWindow, html);
		} else {
			console.log("Il faut autoriser les pop-up sur ce site");
		}
	}

	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	if (modeVerification) {
		// La fenêtre est ouverte tout de suite, dans le clic sur le favori :
		// aucun dialogue avant, donc aucun blocage de pop-up.
		const fenetre = window.open();
		if (!fenetre || fenetre.closed) {
			alert(
				"Il faut autoriser les pop-up sur ce site pour que Trombiquiz puisse s'ouvrir."
			);
			return;
		}
		window.trombiquizDemarrer = function (eleves, aleatoire) {
			if (aleatoire) {
				shuffleArray(eleves);
			} else {
				eleves.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
			}
			writeContent(fenetre, genererPageQuiz(eleves));
		};
		writeContent(fenetre, genererPageVerification(collecterEleves(imagesArray)));
		return;
	}

	if (
		window.confirm(
			'Apprendre les prénoms :\n- Par ordre aléatoire → clic sur OK (ou touche "Enter").\n- Par ordre alphabétique → clic sur Annuler (ou touche "Esc")\n\nAttention, pour que l\'outil fonctionne, il faut que toutes les photos des élèves soient visibles sur la page. \n\nVotre navigateur bloquera l\'outil si vous mettez trop de temps à cliquer : relancez-le ou autorisez les pop-up'
		)
	) {
		shuffleArray(imagesArray);
	}

	const html = generateContent(imagesArray);
	generatePage(html);
})();
