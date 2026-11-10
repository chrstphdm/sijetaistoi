"""
Audit des montants saisis à la main, contre le calcul réglementaire d'OpenFisca.

Pourquoi : les budgets des personnages sont des ordres de grandeur saisis à la
main. Les prestations (aides au logement, prime d'activité, prestations
familiales, minima) et l'impôt sont les montants les plus fragiles : ils
dépendent de règles précises que personne ne recalcule de tête. Ce script les
recalcule selon la loi, et signale les écarts.

Ce que ce script N'EST PAS : une source de vérité branchée au jeu. Il ne
modifie rien. Il produit un rapport, que l'auteur lit et arbitre.

Approximations déclarées (une situation OpenFisca exige des détails que les
fiches ne portent pas) :
  - Les revenus d'un couple sont sur une seule ligne de fiche. Un revenu
    indépendant est attribué au premier adulte, un salaire au second s'il y a
    aussi un revenu indépendant ; sinon un salaire de couple est réparti 60/40.
  - Le salaire imposable est estimé à 1,03 fois le net (CSG non déductible
    et CRDS) ; le revenu indépendant est pris comme bénéfice imposable.
  - Les revenus du patrimoine entrent dans les ressources des minima, mais
    pas dans l'impôt : l'impôt calculé d'un rentier est donc sous-estimé.
  - L'âge des enfants n'est pas toujours connu : 8 ans par défaut.
  - La commune est celle de l'histoire du personnage (table ci-dessous), et
    le loyer est la ligne « logement », charges comprises.
  - Les revenus sont supposés stables sur les trois années précédentes.

Usage :
    python3 -m venv .venv && .venv/bin/pip install -r scripts/openfisca/requirements.txt
    .venv/bin/python scripts/openfisca/audit.py > audit-openfisca.md
"""

import glob
import json
import os
import sys

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_france import FranceTaxBenefitSystem

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
YEAR = 2025
MONTH = f'{YEAR}-06'

# Commune de chaque personnage, d'après son histoire (code officiel géographique).
COMMUNE = {
    'berangere': '33063',   # Bordeaux
    'claire': '80021',      # Amiens
    'helene': '31555',      # Toulouse
    'lucie': '63113',       # Clermont-Ferrand
    'malik': '69259',       # Vénissieux
    'marc-anne': '35238',   # Rennes
    'michele': '19272',     # Tulle (Corrèze)
    'nadia': '93008',       # Bobigny
    'patrick': '02691',     # Saint-Quentin
    'rachid': '93048',      # Montreuil
    'sophie': '54395',      # Nancy
    'thomas': '44109',      # Nantes
    'yanis': '69123',       # Lyon
    'agnes': '25462',       # Pontarlier (Doubs)
    'fabrice': '97407',     # Le Port (La Réunion)
    'imane': '13001',       # Aix-en-Provence
}

# Âges des enfants quand l'histoire les donne.
CHILD_AGES = {'rachid': [4, 7], 'claire': [6], 'marc-anne': [15, 17], 'agnes': [17, 12]}

TENURE = {
    'owner_outright': 'proprietaire',
    'owner_with_loan': 'primo_accedant',
    'tenant_social': 'locataire_hlm',
    'tenant_private': 'locataire_vide',
    'housed': 'loge_gratuitement',
}

# Trois années : les prestations familiales se calculent sur les revenus de N-2.
MONTHS = [f'{y}-{m:02d}' for y in (YEAR - 2, YEAR - 1, YEAR) for m in range(1, 13)]


def monthly(value):
    return {m: value for m in MONTHS}


def situation(c):
    t = c['traits']
    lines = {l['code']: l['value']['amount'] for l in c['budget']['lines']}
    adults = t['householdSize'] - t['childCount']
    persons = [f'adulte{i + 1}' for i in range(adults)]
    kids = [f'enfant{i + 1}' for i in range(t['childCount'])]
    ages = CHILD_AGES.get(c['id'], [8] * t['childCount'])

    sal = lines.get('salaire-net', 0)
    ind = lines.get('revenu-independant', 0)
    individus = {p: {'date_naissance': {'ETERNITY': f'{YEAR - c["identity"]["age"]}-01-01'}} for p in persons}

    # Répartition des revenus d'activité entre adultes (approximation déclarée).
    shares = {}
    if adults == 1:
        shares = {persons[0]: (sal, ind)}
    elif ind and sal:
        shares = {persons[0]: (0, ind), persons[1]: (sal, 0)}
    else:
        shares = {persons[0]: (sal * 0.6, ind), persons[1]: (sal * 0.4, 0)}
    for p, (s, i) in shares.items():
        if s:
            individus[p]['salaire_net'] = monthly(s)
            individus[p]['salaire_imposable'] = monthly(round(s * 1.03, 2))
        if i:
            # Deux entrées pour un même revenu : l'impôt lit le bénéfice
            # imposable, la prime d'activité et le RSA lisent les « derniers
            # revenus non salariés connus ». N'en renseigner qu'une faisait
            # verser le RSA à une dirigeante du dernier décile.
            # Trois années : les aides au logement d'un indépendant se calculent
            # sur ses revenus de l'avant-dernière année.
            years = {str(YEAR - k): i * 12 for k in (0, 1, 2)}
            individus[p]['rpns_imposables'] = dict(years)
            individus[p]['rpns_autres_revenus'] = dict(years)

    p0 = individus[persons[0]]
    if lines.get('pension-alimentaire'):
        p0['pensions_alimentaires_percues'] = monthly(lines['pension-alimentaire'])
    if lines.get('revenu-capital'):
        # Loyers et intérêts : pris en compte dans les ressources des minima.
        p0['revenus_locatifs'] = monthly(lines['revenu-capital'])
    if lines.get('pension-retraite'):
        p0['retraite_nette'] = monthly(lines['pension-retraite'])
        p0['retraite_imposable'] = monthly(round(lines['pension-retraite'] * 1.08, 2))
    if lines.get('allocation-chomage'):
        p0['chomage_net'] = monthly(lines['allocation-chomage'])
        p0['chomage_imposable'] = monthly(round(lines['allocation-chomage'] * 1.03, 2))
    if t.get('recognisedDisability'):
        p0['handicap'] = monthly(True)
        p0['taux_incapacite'] = monthly(0.8)
        p0['taux_capacite_travail'] = monthly(0.0)
    if 'student' in t['activities']:
        p0['activite'] = monthly('etudiant')

    for k, a in zip(kids, ages):
        individus[k] = {'date_naissance': {'ETERNITY': f'{YEAR - a}-06-01'}}

    rent = lines.get('logement', 0) if t['tenure'].startswith('tenant') else 0
    return {
        'individus': individus,
        'familles': {'f': {'parents': persons[:2], 'enfants': kids}},
        'foyers_fiscaux': {'ff': {'declarants': persons[:2], 'personnes_a_charge': kids}},
        'menages': {'m': {
            'personne_de_reference': [persons[0]],
            **({'conjoint': [persons[1]]} if adults > 1 else {}),
            'enfants': kids,
            'depcom': monthly(COMMUNE[c['id']]),
            'statut_occupation_logement': monthly(TENURE[t['tenure']]),
            'loyer': monthly(rent),
        }},
    }


def compute(tbs, c):
    sim = SimulationBuilder().build_from_entities(tbs, situation(c))
    def fam(v):
        try:
            return float(sim.calculate(v, MONTH)[0])
        except Exception as e:  # une variable qui échoue est signalée, pas tue
            return f'erreur : {type(e).__name__}'
    out = {
        'aide_logement': fam('aide_logement'),
        'prime_activite': fam('ppa'),
        'allocations_familiales': fam('af'),
        'complement_familial': fam('cf'),
        'soutien_familial': fam('asf'),
        'rsa': fam('rsa'),
    }
    try:
        out['aah'] = float(sim.calculate('aah', MONTH).sum())
    except Exception as e:
        out['aah'] = f'erreur : {type(e).__name__}'
    try:
        out['impot_mensuel'] = -float(sim.calculate('impot_revenu_restant_a_payer', str(YEAR))[0]) / 12
    except Exception as e:
        out['impot_mensuel'] = f'erreur : {type(e).__name__}'
    return out


# Écarts connus, et pourquoi : ce n'est pas une erreur de la fiche, c'est une
# limite de ce que le calcul reçoit. Un écart nouveau, lui, fait échouer --check.
KNOWN = {
    ('yanis', 'prestations'): "la bourse sur critères sociaux n'est pas calculée par OpenFisca",
    ('berangere', 'impots'): "la ligne comprend les prélèvements sociaux et l'impôt sur les revenus du "
                             "patrimoine, qui ne sont pas transmis au calcul",
    ('thomas', 'impots'): "la ligne porte ses cotisations sociales provisionnelles, pas l'impôt sur le revenu",
    ('nadia', 'prestations'): "elle ne demande pas l'allocation de soutien familial à laquelle elle aurait droit : "
                              "ce non-recours est déclaré dans sa fiche",
}

TOLERANCE_EUROS = 20
TOLERANCE_SHARE = 0.15


def off(fiche, calcul):
    return abs(calcul - fiche) > max(TOLERANCE_EUROS, TOLERANCE_SHARE * max(abs(fiche), abs(calcul)))


def main():
    check = '--check' in sys.argv
    tbs = FranceTaxBenefitSystem()
    rows = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'content', 'characters', '*.json'))):
        c = json.load(open(path, encoding='utf-8'))
        lines = {l['code']: l['value']['amount'] for l in c['budget']['lines']}
        try:
            r = compute(tbs, c)
        except Exception as e:
            print(f'| {c["id"]} | échec de la simulation : {e} |', file=sys.stderr)
            continue
        benefits = sum(v for k, v in r.items() if k not in ('impot_mensuel',) and isinstance(v, float))
        rows.append((c, lines, r, benefits))

    print(f'# Audit OpenFisca — législation {MONTH}\n')
    print('Montants mensuels en euros. « Fiche » : saisi à la main ; « OpenFisca » : calculé selon la loi.\n')
    print('| Personnage | Prestations (fiche) | Prestations (OpenFisca) | Écart | Impôt (fiche) | Impôt (OpenFisca) | Détail OpenFisca |')
    print('|---|---:|---:|---:|---:|---:|---|')
    for c, lines, r, benefits in rows:
        fiche = lines.get('prestations', 0)
        detail = ', '.join(f'{k} {v:.0f}' if isinstance(v, float) else f'{k} {v}'
                           for k, v in r.items() if k != 'impot_mensuel' and (not isinstance(v, float) or v > 0.5))
        imp = r['impot_mensuel']
        imp_s = f'{imp:.0f}' if isinstance(imp, float) else imp
        print(f'| {c["identity"]["firstName"]} | {fiche:.0f} | {benefits:.0f} | {benefits - fiche:+.0f} | '
              f'{lines.get("impots", 0):.0f} | {imp_s} | {detail or "—"} |')

    failures = []
    for c, lines, r, benefits in rows:
        pairs = [('prestations', lines.get('prestations', 0), benefits)]
        if isinstance(r['impot_mensuel'], float):
            pairs.append(('impots', lines.get('impots', 0), r['impot_mensuel']))
        for what, fiche, calcul in pairs:
            if not off(fiche, calcul):
                continue
            reason = KNOWN.get((c['id'], what))
            if reason:
                print(f'\n- {c["identity"]["firstName"]}, {what} : écart connu — {reason}.')
            else:
                failures.append(f'{c["identity"]["firstName"]}, {what} : fiche {fiche:.0f} €, calcul {calcul:.0f} €')
    if failures:
        print('\n## Écarts non expliqués\n')
        for f in failures:
            print(f'- {f}')
    if check and failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
