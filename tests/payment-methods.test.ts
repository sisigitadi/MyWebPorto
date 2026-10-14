import { describe, it, expect } from "vitest";
import { normalizeBankAccounts, parseLegacyBankInfo, type BankAccountItem } from "@/lib/whatsapp-order";

describe("Payment Methods & Multi-Rekening System", () => {
  it("harus menormalkan rekening bank dan mempertahankan properti isActive serta notes", () => {
    const rawAccounts: BankAccountItem[] = [
      {
        id: "bank-1",
        bankName: "bca",
        accountNumber: "123-456-7890",
        accountHolder: "Sigit Adi Irianto",
        notes: "Rekening Utama",
        isActive: true,
      },
      {
        id: "bank-2",
        bankName: "mandiri",
        accountNumber: "9876543210",
        accountHolder: "Sigit Adi",
        notes: "Khusus Non-Tunai",
        isActive: false, // Dinonaktifkan oleh admin
      },
      {
        id: "bank-3",
        bankName: "bri",
        accountNumber: "555566667777",
        accountHolder: "Sigit",
        // Tanpa isActive eksplisit -> harus default true
      },
    ];

    const normalized = normalizeBankAccounts(rawAccounts);

    expect(normalized).toHaveLength(3);
    expect(normalized[0].bankName).toBe("BCA");
    expect(normalized[0].accountNumber).toBe("123-456-7890");
    expect(normalized[0].isActive).toBe(true);
    expect(normalized[0].notes).toBe("Rekening Utama");

    expect(normalized[1].bankName).toBe("MANDIRI");
    expect(normalized[1].accountNumber).toBe("9876543210");
    expect(normalized[1].isActive).toBe(false);
    expect(normalized[1].notes).toBe("Khusus Non-Tunai");

    expect(normalized[2].bankName).toBe("BRI");
    expect(normalized[2].isActive).toBe(true); // Default true
  });

  it("harus menyaring hanya rekening aktif untuk ditampilkan ke publik", () => {
    const accounts: BankAccountItem[] = [
      {
        id: "1",
        bankName: "BCA",
        accountNumber: "111111",
        accountHolder: "Sigit",
        isActive: true,
      },
      {
        id: "2",
        bankName: "MANDIRI",
        accountNumber: "222222",
        accountHolder: "Sigit",
        isActive: false, // Nonaktif
      },
      {
        id: "3",
        bankName: "BSI",
        accountNumber: "333333",
        accountHolder: "Sigit",
        isActive: true,
      },
    ];

    const publicAccounts = accounts.filter((acc) => acc.isActive !== false);

    expect(publicAccounts).toHaveLength(2);
    expect(publicAccounts.map((a) => a.bankName)).toEqual(["BCA", "BSI"]);
    expect(publicAccounts.some((a) => a.bankName === "MANDIRI")).toBe(false);
  });

  it("harus mem-parsing string legacy profil dan memberikan status aktif default", () => {
    const legacy = "BCA 1234567890 a.n. Sigit Adi\nMandiri 9876543210 a.n. Sigit Adi";
    const parsed = parseLegacyBankInfo(legacy);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].bankName).toBe("BCA");
    expect(parsed[0].accountNumber).toBe("1234567890");
    expect(parsed[0].isActive).toBe(true);

    expect(parsed[1].bankName).toBe("MANDIRI");
    expect(parsed[1].accountNumber).toBe("9876543210");
    expect(parsed[1].isActive).toBe(true);
  });
});
