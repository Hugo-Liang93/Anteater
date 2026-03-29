export function isLikelyMarketClosed(input: {
  connected: boolean;
  quoteTime?: string;
  barTime?: string;
  timeframe: string;
}): boolean {
  if (!input.connected || !input.quoteTime || !input.barTime) {
    return false;
  }

  const quoteAgeMs = Date.now() - new Date(input.quoteTime).getTime();
  const barAgeMs = Date.now() - new Date(input.barTime).getTime();
  const tfMinutes = timeframeToMinutes(input.timeframe);

  if (Number.isNaN(quoteAgeMs) || Number.isNaN(barAgeMs)) {
    return false;
  }

  return quoteAgeMs >= 45 * 60 * 1000 && barAgeMs >= tfMinutes * 3 * 60 * 1000;
}

function timeframeToMinutes(timeframe: string): number {
  switch (timeframe) {
    case "M1":
      return 1;
    case "M5":
      return 5;
    case "M15":
      return 15;
    case "M30":
      return 30;
    case "H1":
      return 60;
    case "H4":
      return 240;
    case "D1":
      return 1440;
    default:
      return 15;
  }
}
