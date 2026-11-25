/** Response shapes of nepse-api's account and portfolio routes (/auth, /me, /portfolios, /platform). */

export type MemberRole = 'ADMIN' | 'LEADER' | 'MEMBER';
export type PortfolioType = 'GROUP' | 'SOLO' | 'MANAGED';
export type Language = 'en' | 'ne';

export interface NotificationPrefs {
  paymentDue: boolean;
  depositUpdates: boolean;
  trades: boolean;
  exits: boolean;
}

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  platformRole: 'USER' | 'PLATFORM_ADMIN';
  isPlatformAdmin: boolean;
  adminSessionActive: boolean;
  adminUntil: string | null;
  language: Language;
  theme: 'system' | 'light' | 'dark';
  notificationPrefs: NotificationPrefs;
  memberships: { membershipId: number; portfolioId: number; portfolioName: string; portfolioType: PortfolioType; portfolioStatus: string; role: MemberRole }[];
}

export interface MemberNumbers {
  contributed: number;
  units: number;
  ownershipPercent: number;
  currentValue: number;
  returns: number;
  returnsPercent: number;
}

export interface GroupTotals {
  invested: number;
  currentValue: number;
  marketValue: number;
  cash: number;
  profit: number;
  profitPercent: number;
  navPerUnit: number;
  totalUnits: number;
  realized: number;
  income: number;
  expenses: number;
  problems: { txId: number; message: string }[];
}

export interface Notification {
  id: number;
  type: 'PAYMENT_DUE' | 'DEPOSIT_APPROVED' | 'DEPOSIT_REJECTED' | 'NEW_TRADE' | 'EXIT_UPDATE' | 'INVITATION' | 'GENERAL';
  portfolioId: number | null;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface MemberHome {
  netWorth: number;
  portfolios: {
    portfolioId: number;
    name: string;
    type: PortfolioType;
    status: string;
    role: MemberRole;
    group: { currentValue: number; profit: number; profitPercent: number; navPerUnit: number };
    mine: MemberNumbers;
  }[];
  paymentsDue: { portfolioId: number; portfolioName: string; period: string; dueDate: string; amount: number; late: boolean }[];
  notifications: Notification[];
  unreadCount: number;
  invitations: { id: number; portfolioId: number; portfolioName: string; portfolioType: PortfolioType; role: MemberRole; createdAt: string }[];
}

export interface PortfolioInfo {
  id: number;
  name: string;
  type: PortfolioType;
  status: 'ACTIVE' | 'SUSPENDED';
  startMonth: string;
  contributionAmount: number;
  dueDay: number;
  graceDays: number;
  lateFee: number;
  initialUnitPrice: number;
  membersSeeTracker: boolean;
  membersSeeShares: boolean;
  createdAt: string;
}

export interface PortfolioSummary {
  portfolio: PortfolioInfo;
  role: MemberRole;
  readOnly: boolean;
  membershipId: number | null;
  totals: GroupTotals;
  mine: MemberNumbers | null;
  holdingsCount: number;
}

export interface GrowthPoint {
  date: string;
  navPerUnit: number;
  totalValue: number;
  invested: number;
  cash: number;
  myValue: number | null;
}

export interface Breakdown {
  byAssetType: { key: string; value: number }[];
  bySector: { key: string; value: number }[];
  total: number;
}

export interface PaymentDetails {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  branch: string | null;
  esewaId: string | null;
  esewaName: string | null;
  instructions: string | null;
}

export type ContributionStatus = 'PAID' | 'PENDING' | 'DUE' | 'LATE' | 'NOT_REQUIRED';

export interface ContributionCell {
  period: string;
  status: ContributionStatus;
  dueDate: string;
  paid: number;
  outstanding: number;
  lateFee: number;
}

export interface DepositInfo {
  period: string;
  amount: number;
  dueDate: string | null;
  status: ContributionStatus | null;
  lateFee: number;
  outstanding: { period: string; amount: number; dueDate: string; late: boolean }[];
  contributionAmount: number;
  paymentDetails: PaymentDetails;
  canDeposit: boolean;
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Deposit {
  id: number;
  membershipId: number;
  memberName: string | null;
  amount: number;
  period: string;
  method: string;
  status: DepositStatus;
  reference: string | null;
  note: string | null;
  hasScreenshot: boolean;
  rejectionReason: string | null;
  receiptNo: string | null;
  navAtApproval: number | null;
  unitsIssued: number | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface Tracker {
  months: string[];
  rows: { membershipId: number; userId: number; name: string; role: MemberRole; cells: ContributionCell[]; lateCount: number; outstanding: number }[];
  contributionAmount: number;
  dueDay: number;
  graceDays: number;
  lateFee: number;
}

export interface MyContributions {
  months: string[];
  cells: ContributionCell[];
  contributionAmount: number;
  dueDay: number;
  canSeeGroup: boolean;
}

export interface Holding {
  id: number;
  assetType: string;
  symbol: string | null;
  name: string;
  sector: string | null;
  quantity: number;
  avgCost: number;
  costBasis: number;
  currentPrice: number;
  priceSource: 'MANUAL' | 'NEPSE';
  priceUpdatedAt: string | null;
  marketValue: number;
  unrealized: number;
  unrealizedPercent: number;
  realized: number;
  income: number;
  archived: boolean;
}

export interface Transaction {
  id: number;
  type: string;
  status: 'ACTIVE' | 'REVERSED';
  date: string;
  holdingId: number | null;
  holdingName: string | null;
  holdingSymbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  fees: number;
  note: string;
  linked: 'deposit' | 'exit' | null;
  reversedAt: string | null;
  reverseNote: string | null;
  createdAt: string;
}

export interface HoldingDetail extends Holding {
  notes: string | null;
  weightPercent: number;
  documents: { id: number; fileName: string; mime: string; size: number; createdAt: string }[];
  transactions: Transaction[];
}

export interface ExitRequest {
  id: number;
  membershipId: number;
  memberName: string | null;
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  navAtApproval: number | null;
  units: number | null;
  payoutAmount: number | null;
  paidReference: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

export interface ExitInfo {
  estimate: { units: number; navPerUnit: number; payout: number; asOf: string };
  requests: ExitRequest[];
  canRequest: boolean;
}

export interface MembersList {
  showShares: boolean;
  members: { membershipId: number; userId: number; name: string; role: MemberRole; joinedAt: string; isMe: boolean; units?: number; ownershipPercent?: number; value?: number }[];
}

export interface AuditEntry {
  id: string;
  portfolioId: number | null;
  actorId: number | null;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  data: unknown;
  createdAt: string;
}
