/**
 * Types & Interfaces untuk WhatsApp AI Bot MyWebPorto.
 */

export type WABotStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_READY"
  | "CONNECTED"
  | "ERROR";

export interface WABotState {
  status: WABotStatus;
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedPushName: string | null;
  lastActive: string | null;
  error: string | null;
  battery: number | null;
  messagesCount: {
    incoming: number;
    replied: number;
  };
}

export interface WAKnowledgeFAQ {
  id: string;
  question: string;
  answer: string;
  category: "umum" | "produk" | "jasa" | "pembayaran" | "garansi";
  enabled: boolean;
  updatedAt: string;
}

export interface WABotConfig {
  enabled: boolean;
  autoReply: boolean;
  botName: string;
  personaPrompt: string;
  businessSOP: string;
  adminExclusions: string[];
  delaySeconds: number;
  faqs: WAKnowledgeFAQ[];
}

export interface WAChatLogItem {
  id: string;
  senderPhone: string;
  senderName: string;
  message: string;
  reply: string | null;
  source: "cloud" | "local" | "faq" | "invoice_lookup" | "manual";
  modelUsed: string | null;
  timestamp: string;
}

export interface WABotSimulateResult {
  reply: string;
  source: "cloud" | "local" | "faq" | "invoice_lookup";
  modelUsed: string;
  contextSources: string[];
  latencyMs: number;
}
