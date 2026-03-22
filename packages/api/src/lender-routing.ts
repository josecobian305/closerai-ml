// Which LLC application to use per lender
// CHC = CHC Capital Group application
// WOTR = Way of the Road application

export const LENDER_APP_ROUTING: Record<string, 'CHC' | 'WOTR'> = {
  'alternative-funding-group': 'WOTR',
  'credibly': 'WOTR',
  'rapid-finance': 'WOTR',
  'fox-business-funding': 'WOTR',
  'barclays-guidelines-1-1': 'WOTR',
  'fintap': 'WOTR',
  'dependance-program': 'WOTR',
  'regium-funding': 'WOTR',
  'reliance-financial': 'WOTR',
  'lending-valley': 'WOTR',
  'vader-mountain-capital': 'WOTR',
  'smarter': 'WOTR',
  'reliancef': 'WOTR',
  'everest-business-funding': 'WOTR',
  'green-note-capital': 'WOTR',
  'cfg': 'WOTR',
  'cfg-guidelines-1': 'WOTR',
};

export function getApplicationType(lender_id: string, lender_name: string, notes?: string): 'CHC' | 'WOTR' {
  if (LENDER_APP_ROUTING[lender_id]) return LENDER_APP_ROUTING[lender_id];
  if (notes && (notes.toLowerCase().includes('wotr') || notes.toLowerCase().includes('way of the road'))) return 'WOTR';
  return 'CHC';
}
