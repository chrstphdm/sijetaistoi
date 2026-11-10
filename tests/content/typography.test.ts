import { describe, expect, it } from 'vitest'
import { frenchTypography as t, normaliseStrings, NBSP, NNBSP } from '@/content/typography.ts'
import { bundle } from '@/content/load.ts'
import { walkStrings } from '@/quality/lexicon.ts'

describe('typographie française', () => {
  it('remplace l’apostrophe droite d’élision', () => {
    expect(t("l'État n'a pas d'avis")).toBe('l’État n’a pas d’avis')
    expect(t('aujourd’hui')).toBe('aujourd’hui')
  })

  it('laisse une apostrophe qui n’est pas entre deux lettres', () => {
    expect(t("'citation'")).toBe("'citation'")
    expect(t("les 80's")).toBe("les 80's")
  })

  it('pose une espace fine insécable devant ; ? !', () => {
    expect(t('Pourquoi ? Parce que ; voilà !')).toBe(`Pourquoi${NNBSP}? Parce que${NNBSP}; voilà${NNBSP}!`)
  })

  it('pose une espace insécable devant le deux-points', () => {
    expect(t('Repères : Insee')).toBe(`Repères${NBSP}: Insee`)
  })

  it('n’invente pas d’espace là où il n’y en avait pas', () => {
    expect(t('https://insee.fr/x?a=1')).toBe('https://insee.fr/x?a=1')
    expect(t('à 14:30, (?)')).toBe('à 14:30, (?)')
  })

  it('met des espaces insécables à l’intérieur des guillemets', () => {
    expect(t('« payer en une fois »')).toBe(`«${NBSP}payer en une fois${NBSP}»`)
    expect(t('«oui»')).toBe(`«${NBSP}oui${NBSP}»`)
  })

  it('ne touche pas aux nombres', () => {
    expect(t('1 200 € et 3,5 %')).toBe('1 200 € et 3,5 %')
  })

  it('est idempotente', () => {
    const once = t("Qu'en penses-tu ? « l'idée » : non !")
    expect(t(once)).toBe(once)
  })

  it('laisse intacts identifiants, adresses et codes', () => {
    const raw = {
      id: "a'b", url: 'https://x.fr/?q=1 ;', code: 'x :', sourceId: "l'id", contextSourceIds: ["d'x"],
      label: "l'aide : oui",
    }
    expect(normaliseStrings(raw)).toEqual({ ...raw, label: `l’aide${NBSP}: oui` })
  })
})

describe('le paquet compilé', () => {
  it('ne contient plus d’apostrophe droite d’élision ni d’espace ordinaire devant : ; ? !', () => {
    const fautes: string[] = []
    walkStrings(bundle, (text, path) => {
      if (/(^|\.)(id|url|code)$|Id(s)?(\[\d+\])?$/.test(path)) return
      if (/\p{L}'\p{L}/u.test(text) || / [:;?!»]|« /.test(text)) fautes.push(`${path} : ${text.slice(0, 60)}`)
    })
    expect(fautes).toEqual([])
  })
})
