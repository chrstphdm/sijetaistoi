/** Un manquement releve par le lint de contenu. */
export type Violation = {
  readonly rule: string
  readonly severity: 'blocking' | 'warning'
  readonly where: string
  readonly message: string
}

/** Un verificateur est une fonction PURE : contenu -> manquements. */
export type Check<T> = (input: T) => readonly Violation[]
