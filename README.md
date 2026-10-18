# Dashboard catalogue eSIM – MyBestSim

Petit outil qui lit les CSV produits (un fichier par fournisseur) et affiche les statistiques clés du catalogue dans une page web, sans installation côté lecteur.

Les **18 CSV du test sont embarqués directement dans le code** (`embedded-csv.js`) : le dashboard s'ouvre donc déjà rempli, sans rien télécharger. L'utilisateur peut toutefois **ajouter ses propres fichiers CSV** (glisser-déposer ou sélecteur) ; un fichier ajouté portant le même nom qu'un fichier embarqué **remplace** ce dernier.

**Lien du dashboard :** _à compléter après mise en ligne (GitHub Pages / Netlify)_

## Ce que montre le dashboard

| Indicateur | Valeur actuelle |
|---|---|
| Nombre total de cartes eSIM | 5 056 |
| Produits à plus de 100 € | 56 |
| Prix le plus bas | 5,36 € (aloSIM, Irlande 1 Go 7 jours) |
| Prix le plus haut | 154,63 € (aloSIM, Europe Illimité 30 jours) |
| Data moyenne par carte | 14,49 Go (hors illimité) |
| Prix moyen global | 29,30 € (médiane 20,70 €) |
| Répartition par fournisseur | 18 fournisseurs, de 92 (4S eSIM) à 722 cartes (Airalo) |

**Bonus :** prix moyen par fournisseur, prix médian par Go, part d'offres illimitées (12,9 %), de 5G (34,7 %) et de cartes rechargeables (54,2 %), pays les plus représentés, durées de validité, 5 cartes les plus chères.

## Fonctionnement

Au chargement, le dashboard lit les **18 CSV embarqués** dans le code (`embedded-csv.js`) et calcule immédiatement les statistiques. L'utilisateur peut ensuite **déposer ses propres fichiers CSV** (glisser-déposer ou sélecteur de fichiers) : `stats.js` les lit et recalcule tout dans le navigateur. Aucun chiffre n'est pré-calculé et **aucun fichier n'est envoyé à un serveur** : les fichiers ajoutés par l'utilisateur restent sur son ordinateur (stockés dans son navigateur via IndexedDB). Les CSV embarqués, eux, font partie du code publié.

```
index.html           structure de la page (zone de dépôt + dashboard)
style.css            mise en forme (clair/sombre automatique, responsive)
stats.js             lecture des CSV + calcul des statistiques
embedded-csv.js      les 18 CSV du test, embarqués dans le code
app.js               chargement des CSV embarqués + import utilisateur + affichage

```

## Utilisation

- À l'ouverture, les 18 CSV embarqués sont déjà chargés et le dashboard s'affiche directement.
- Ouvrir le panneau latéral avec le bouton ☰ (en haut à gauche) : il contient la zone d'ajout des CSV et la liste des fichiers chargés. On peut aussi glisser des CSV n'importe où sur la page.
- Déposer un ou plusieurs CSV : le dashboard se met à jour à chaque ajout.
- Ajouter d'autres fichiers plus tard : ils s'ajoutent aux précédents (un fichier du même nom remplace l'ancien, y compris un fichier embarqué).
- **Les 18 CSV embarqués ne peuvent pas être supprimés** (ils portent le badge « embarqué »). Seuls les fichiers que **vous** avez ajoutés peuvent être retirés, avec ✕ dans le panneau ou le bouton « Retirer mes ajouts ». Retirer un fichier ajouté qui remplaçait un fichier embarqué fait réapparaître la version embarquée.
- Un fichier dont il manque des colonnes est refusé avec un message explicite.
- Les fichiers sont conservés dans le navigateur (IndexedDB) : ils sont toujours là à la réouverture de la page. Ils disparaissent quand l'utilisateur les retire avec ✕, clique sur « Tout effacer », ou vide les données du site dans son navigateur. Le stockage est propre à chaque navigateur et appareil, et indisponible en navigation privée (le dashboard fonctionne alors sans mémorisation).

## Mise en ligne

Déposer les fichiers du site (`index.html`, `style.css`, `stats.js`, `embedded-csv.js`, `app.js`) sur Netlify Drop ou GitHub Pages. Le site fonctionne ensuite sans serveur. Les 18 CSV sont inclus dans le code, donc le dashboard est rempli dès l'ouverture.



## Format attendu des CSV

Tous les fichiers partagent les mêmes colonnes :
`sku, provider, product_name, country_code, country_name, data_gb, data_display, validity_days, price, currency, network, top_up`

## Choix et hypothèses

- **Offres illimitées :** 653 cartes n'ont pas de valeur en Go (`data_display = Illimité`). Elles sont exclues de la moyenne de data et du prix par Go, car elles fausseraient le calcul. Elles restent comptées dans tous les autres indicateurs et sont affichées à part.
- **Produits au même nom :** les 5 056 SKU sont uniques. 731 produits partagent un nom avec un autre du même fournisseur, mais 618 des 620 noms concernés ont des prix différents : ce sont des variantes, pas des doublons. Tous sont conservés.
- **Données manquantes :** 192 lignes n'ont pas de `country_code`. Ce sont toutes des offres « Amérique du Nord » (une zone, pas un pays). Les pays sont agrégés sur `country_name`, toujours renseigné.
- **Devise :** toutes les lignes sont en EUR, aucune conversion n'est faite. Le script ne gère pas encore le multi-devises.
- **Seuil des 100 € :** comparaison stricte (`price > 100`).

## Méthodologie

1. Inspection des fichiers (structure, types, valeurs manquantes, doublons, devises) avant tout calcul.
2. Calcul des statistiques en JavaScript directement dans le navigateur, à partir des CSV bruts, puis recoupement avec un script Python (pandas).
3. Page statique (HTML/CSS/JS pur, sans dépendance) pour une mise en ligne simple et sans serveur.
4. Travail réalisé avec l'aide d'un assistant IA (Claude) pour l'exploration, l'écriture du code et la mise en forme.
5. Vérification : les chiffres clés ont été recoupés avec les CSV d'origine. _(à compléter : ce que vous avez recalculé vous-même)_

## Pistes d'amélioration

- Filtres interactifs (fournisseur, pays, durée).
- Rapport de qualité des données (doublons, prix aberrants).
- Export des statistiques en PDF/CSV, partage des données entre appareils.
