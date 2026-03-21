// Which LLC application to use per lender
// CHC = CHC Capital Group application
// WOTR = Way of the Road application

export const LENDER_APP_ROUTING: Record<string, 'CHC' | 'WOTR'> = {
  // WOTR lenders (explicit) — add as you learn which lenders prefer WOTR
  // Default is CHC for all others
};

export function getApplicationType(lender_id: string, lender_name: string, notes?: string): 'CHC' | 'WOTR' {
  if (LENDER_APP_ROUTING[lender_id]) return LENDER_APP_ROUTING[lender_id];
  if (notes && (notes.toLowerCase().includes('wotr') || notes.toLowerCase().includes('way of the road'))) return 'WOTR';
  return 'CHC';
}
