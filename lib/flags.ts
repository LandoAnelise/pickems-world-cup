const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷', Australia: '🇦🇺', Belgium: '🇧🇪', Bolivia: '🇧🇴',
  Brazil: '🇧🇷', Cameroon: '🇨🇲', Canada: '🇨🇦', Chile: '🇨🇱',
  Colombia: '🇨🇴', Costa_Rica: '🇨🇷', Croatia: '🇭🇷', Ecuador: '🇪🇨',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', France: '🇫🇷', Germany: '🇩🇪', Ghana: '🇬🇭',
  Greece: '🇬🇷', Guatemala: '🇬🇹', Honduras: '🇭🇳', Hungary: '🇭🇺',
  Indonesia: '🇮🇩', Iran: '🇮🇷', Italy: '🇮🇹', Jamaica: '🇯🇲',
  Japan: '🇯🇵', Korea_Republic: '🇰🇷', Kuwait: '🇰🇼', Mali: '🇲🇱',
  Mexico: '🇲🇽', Morocco: '🇲🇦', Netherlands: '🇳🇱', New_Zealand: '🇳🇿',
  Nigeria: '🇳🇬', Panama: '🇵🇦', Paraguay: '🇵🇾', Peru: '🇵🇪',
  Poland: '🇵🇱', Portugal: '🇵🇹', Qatar: '🇶🇦', Romania: '🇷🇴',
  Saudi_Arabia: '🇸🇦', Senegal: '🇸🇳', Serbia: '🇷🇸', Slovakia: '🇸🇰',
  Slovenia: '🇸🇮', South_Africa: '🇿🇦', Spain: '🇪🇸', Switzerland: '🇨🇭',
  Turkey: '🇹🇷', Ukraine: '🇺🇦', United_States: '🇺🇸', Uruguay: '🇺🇾',
  Venezuela: '🇻🇪', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ivory Coast': '🇨🇮',
  'South Korea': '🇰🇷', 'Costa Rica': '🇨🇷', 'Saudi Arabia': '🇸🇦',
  'New Zealand': '🇳🇿', 'United States': '🇺🇸', 'South Africa': '🇿🇦',
  'Korea Republic': '🇰🇷',
}

export function getFlag(teamName: string): string {
  return FLAGS[teamName] ?? FLAGS[teamName.replace(' ', '_')] ?? '🏳️'
}
