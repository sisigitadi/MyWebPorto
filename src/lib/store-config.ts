import type { BankAccountItem } from "@/lib/whatsapp-order";

export interface InternationalPaymentConfig {
  paypalUrl?: string;
  wiseInfo?: string;
  stripeUrl?: string;
  instructionsEn?: string;
}

export interface PaymentMethodsConfig {
  qris?: boolean;
  bank?: boolean;
  paypal?: boolean;
  wa_direct?: boolean;
}

export interface StoreConfig {
  adminWhatsapp: string;
  bankAccounts: BankAccountItem[];
  qrisImageUrl: string;
  qrisMerchantName?: string;
  internationalPayment: InternationalPaymentConfig;
  paymentMethods: PaymentMethodsConfig;
  storeNotice?: string;
  whatsappOnlyMode?: boolean;
  allowPaymentProofUpload?: boolean;
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  adminWhatsapp: "",
  bankAccounts: [],
  qrisImageUrl: "",
  qrisMerchantName: "",
  paymentMethods: {
    qris: true,
    bank: true,
    paypal: true,
    wa_direct: true,
  },
  internationalPayment: {
    paypalUrl: "",
    wiseInfo: "",
    stripeUrl: "",
    instructionsEn: "Please send payment via PayPal or Wise to our account, then confirm via WhatsApp chat.",
  },
  storeNotice: "",
  whatsappOnlyMode: false,
  allowPaymentProofUpload: true,
};
