# Audit OpenFisca

Compare les prestations et l'impôt **saisis à la main** dans les fiches des personnages au
**calcul réglementaire** d'[OpenFisca-France](https://openfisca.org/fr/), le modèle libre de
la législation socio-fiscale française.

Ce n'est pas un moteur branché au jeu : le jeu reste sans serveur et sans Python. L'audit
produit un rapport ; l'auteur lit les écarts et décide.

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/openfisca/requirements.txt
.venv/bin/python scripts/openfisca/audit.py > scripts/openfisca/dernier-audit.md
```

Les approximations sont déclarées en tête de `audit.py` (répartition des revenus d'un couple,
âge des enfants, commune, loyer charges comprises). Ce qu'OpenFisca ne sait pas calculer
n'apparaît pas : la bourse de l'enseignement supérieur, une pension d'invalidité, l'impôt
sur les revenus du patrimoine. Un écart n'est donc pas toujours une erreur de la fiche :
il se lit avec la note de chaque ligne.
