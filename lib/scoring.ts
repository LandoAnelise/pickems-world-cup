export type PickValues = { home_score: number; away_score: number }
export type ResultValues = { home_score: number; away_score: number }

export function calcPoints(pick: PickValues, result: ResultValues): number {
  if (pick.home_score === result.home_score && pick.away_score === result.away_score) return 3
  const pickWinner = Math.sign(pick.home_score - pick.away_score)
  const realWinner = Math.sign(result.home_score - result.away_score)
  if (pickWinner === realWinner) return 1
  return 0
}
