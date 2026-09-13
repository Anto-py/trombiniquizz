# 👩🏾‍🎓 Trombiquiz — édition Cabanga

Un outil pour apprendre rapidement les prénoms de ses élèves à partir du trombinoscope en ligne de Cabanga.

## Mode d'emploi

### 1. Installer le favori

Affichez la barre de favoris de votre navigateur, puis glissez-déposez ce lien dedans :

<a href="javascript:(function(){const script=document.createElement('script');script.src='https://trombiquiz.forge.apps.education.fr/trombiquiz.min.js?'+Date.now();document.body.appendChild(script);})();">Trombiquiz</a>

> Ce lien pointe vers la version officielle, qui ne connaît pas Cabanga. Pour installer la version qui le reconnaît : ouvrez `trombiquizBookmarklet.js`, copiez tout son contenu, et collez-le comme adresse d'un nouveau favori. Le script est contenu en entier dans le lien, rien n'est hébergé ailleurs.

### 2. Afficher le trombinoscope de sa classe sur Cabanga

Ouvrez la page qui affiche les photos de vos élèves, et faites défiler jusqu'en bas de la page avant de continuer : une photo que le navigateur n'a pas encore chargée reste invisible pour Trombiquiz.

### 3. Lancer Trombiquiz et vérifier la liste

Cliquez sur votre favori « Trombiquiz ». Cabanga étant une application fermée dont la structure interne n'est pas publique, l'outil repère les photos à leur apparence (image au format portrait, hors barres de navigation) plutôt qu'à un emplacement connu, et prend pour nom le texte qui les accompagne.

Comme cette reconnaissance est une supposition, une page de vérification s'ouvre avant le quiz : chaque nom y est corrigeable, et tout ce qui n'est pas un élève se retire d'un clic. Le quiz ne démarre qu'une fois la liste validée, par un bouton qui choisit aussi l'ordre de présentation (aléatoire ou alphabétique).

### 4. S'entraîner à mémoriser les prénoms

Une page s'ouvre et affiche une photo à la fois.

![](img/studentPhoto.png)

Quand vous pensez avoir retrouvé le prénom et le nom de l'élève, cliquez sur « Montrer la réponse » (ou appuyez sur Entrée).

![](img/interface.png)

- Si c'était facile, cliquez sur « Facile » (ou flèche droite) : la photo sort de la liste.
- Si c'était difficile, cliquez sur « Difficile » (ou flèche gauche) : la photo reste dans la liste.

L'outil reprend la liste jusqu'à ce que vous ayez retrouvé tous les prénoms.

![](img/endMessage.png)

## Historique

Trombiquiz est un outil de [Cédric Eyssette](https://github.com/eyssette/trombiquiz). Cette version y ajoute la compatibilité avec Cabanga.

## Licence

Trombiquiz est diffusé sous licence libre, voir [`LICENSE`](LICENSE). Pour signaler un problème ou proposer une évolution propre à cette version : [tickets sur GitHub](https://github.com/Anto-py/trombiniquizz/issues).
