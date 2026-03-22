import { SmsCampaignsView as SmsCampaignsViewImpl } from './SmsCampaignsView';
import { LeadsView as LeadsViewImpl } from './views/LeadsView';

// Re-export existing views
export { AgentsView } from './AgentsView';
export const SmsCampaignsView = SmsCampaignsViewImpl;
export const LeadsView = LeadsViewImpl;

// All 12 new views
export { DashboardView } from './views/DashboardView';
export { MessagesView } from './views/MessagesView';
export { EmailView } from './views/EmailView';
export { PipelineView } from './views/PipelineView';
export { DealsView } from './views/DealsView';
export { DocumentsView } from './views/DocumentsView';
export { CourtSearchView } from './views/CourtSearchView';
export { ReportsView } from './views/ReportsView';
export { NotificationsView } from './views/NotificationsView';
export { SettingsView } from './views/SettingsView';
export { DatabaseView } from './views/DatabaseView';
export { PaymentsView } from './views/PaymentsView';
export { ReviewQueueView } from './views/ReviewQueueView';
export { UnderwritingView } from './views/UnderwritingView';
export { SemiAutoView } from './views/SemiAutoView';
export { OffersView } from './views/OffersView';
export { PitchReviewView } from './views/PitchReviewView';
