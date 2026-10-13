import { resolveCloudAIConfig, isCloudAIConfigEnabled } from "@/lib/cloud-ai-config";
import { getApiStyle } from "@/lib/ai-providers";
import { submitToGeminiMessages, getGeminiFallbackModels } from "@/lib/ai-provider";
import { submitToOpenAI, type ChatMessage } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { queryAIEngine, detectLanguage, type EngineContext } from "@/lib/ai-engine";
import { getProfile, getServices, getProjects, getArticles } from "@/lib/actions";
import {
  buildWhatsAppBotKnowledge,
  detectAndLookupInvoice,
  findDirectFAQMatch,
} from "./wa-knowledge";
import { formatForWhatsApp } from "./wa-formatter";
import { appendWAChatLog } from "./wa-storage";
import type { WABotSimulateResult } from "./wa-types";

/**
 * Memproses pesan masuk dari WhatsApp dan menghasilkan balasan yang akurat,
 * sopan, dan solutif berbasis data portofolio dan custom knowledge admin.
 */
export async function generateWhatsAppReply(
  messageText: string,
  senderPhone: string = "unknown",
  senderName: string = "Pelanggan"
): Promise<WABotSimulateResult> {
  const startTime = Date.now();
  const trimmed = messageText.trim();

  // 1. Prioritas Utama: Deteksi Nomor Invoice / Lacak Pesanan
  const rawInvoiceReply = await detectAndLookupInvoice(trimmed);
  if (rawInvoiceReply) {
    const invoiceReply = formatForWhatsApp(rawInvoiceReply);
    await appendWAChatLog({
      senderPhone,
      senderName,
      message: trimmed,
      reply: invoiceReply,
      source: "invoice_lookup",
      modelUsed: "Order Database Lookup",
    });
    return {
      reply: invoiceReply,
      source: "invoice_lookup",
      modelUsed: "Order Database Lookup",
      contextSources: ["Tabel Pesanan & Database Pelanggan"],
      latencyMs: Date.now() - startTime,
    };
  }

  // 2. Kumpulkan Knowledge Context Live
  const { systemPrompt, config } = await buildWhatsAppBotKnowledge();

  // 3. Cek Jawaban Instan dari FAQ
  const directFAQ = findDirectFAQMatch(trimmed, config.faqs);
  if (directFAQ) {
    const formattedFaq = formatForWhatsApp(`${directFAQ}\n\n_Dijawab otomatis oleh ${config.botName}_`);
    await appendWAChatLog({
      senderPhone,
      senderName,
      message: trimmed,
      reply: formattedFaq,
      source: "faq",
      modelUsed: "FAQ Knowledge Base",
    });
    return {
      reply: formattedFaq,
      source: "faq",
      modelUsed: "FAQ Knowledge Base",
      contextSources: ["Daftar Tanya Jawab (FAQ Admin)"],
      latencyMs: Date.now() - startTime,
    };
  }

  // 4. Jalur Cloud AI (Gemini / OpenAI / Anthropic / Groq / DeepSeek)
  const cloudConfig = await resolveCloudAIConfig();
  const cloudEnabled = await isCloudAIConfigEnabled();

  if (cloudEnabled) {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Pesan dari pelanggan (${senderName}, nomor WA: ${senderPhone}):\n"${trimmed}"\n\nJawablah dengan ramah, akurat, dan format pesan WhatsApp.`,
        },
      ];

      const style = getApiStyle(cloudConfig.provider);
      let cloudText = "";
      const modelUsed = `${cloudConfig.provider} (${cloudConfig.model})`;

      if (style === "gemini") {
        const fallbacks = getGeminiFallbackModels(cloudConfig.model);
        const res = await submitToGeminiMessages(messages, {
          config: cloudConfig,
          maxOutputTokens: 600,
          maxChars: 1800,
          fallbackModels: fallbacks,
        });
        if (res.success && res.text) cloudText = res.text;
      } else if (style === "anthropic") {
        const res = await submitToAnthropic(messages, {
          config: cloudConfig,
          maxTokens: 600,
        });
        if (res.success && res.text) cloudText = res.text;
      } else {
        // OpenAI / Groq / DeepSeek / Mistral / Ollama
        const res = await submitToOpenAI(messages, {
          config: cloudConfig,
          maxTokens: 600,
          maxChars: 1800,
        });
        if (res.success && res.text) cloudText = res.text;
      }

      if (cloudText.trim()) {
        const cleanReply = formatForWhatsApp(cloudText.trim());
        await appendWAChatLog({
          senderPhone,
          senderName,
          message: trimmed,
          reply: cleanReply,
          source: "cloud",
          modelUsed,
        });
        return {
          reply: cleanReply,
          source: "cloud",
          modelUsed,
          contextSources: ["Live Katalog Produk", "Profil & Jasa", "Rekening Toko", "SOP Bisnis"],
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (cloudErr) {
      console.warn("[wa-engine] Cloud AI call failed, gracefully falling back to local NLP:", cloudErr);
    }
  }

  // 5. Fallback ke AI Lokal (TF-IDF & Template Cerdas)
  const [profile, services, projects, articles] = await Promise.all([
    getProfile(),
    getServices(),
    getProjects(),
    getArticles(),
  ]);

  const lang = detectLanguage(trimmed);
  const engineContext: EngineContext = {
    ownerName: profile.name,
    headline: profile.headline,
    bio: profile.bio,
    skills: profile.skills || [],
    services: services.map((s) => s.title),
    projects: projects.map((p) => ({ title: p.title, slug: p.slug })),
    articles: articles.map((a) => ({ title: a.title, slug: a.slug })),
    email: profile.email,
    phone: profile.phone,
    availableForHire: true,
  };

  const localMatch = queryAIEngine(trimmed, engineContext, lang);
  let localReply = "";

  if (localMatch && localMatch.confidence >= 0.5) {
    localReply = localMatch.text;
  } else {
    localReply =
      lang === "en"
        ? `Hello! Thank you for reaching out. I've received your message. You can explore my portfolio, services, and digital products at https://sigitadi.id, or track project collaboration at https://freelanceops.sigitadi.id. Mas Sigit will also get back to you shortly!`
        : `Halo! Terima kasih telah menghubungi kami. Pesan Anda telah kami terima. Anda dapat melihat katalog produk, portofolio, dan layanan kami di https://sigitadi.id, atau kolaborasi jasa di https://freelanceops.sigitadi.id. Mas Sigit juga akan segera merespons Anda kembali!`;
  }
  localReply = formatForWhatsApp(localReply);

  await appendWAChatLog({
    senderPhone,
    senderName,
    message: trimmed,
    reply: localReply,
    source: "local",
    modelUsed: "SigitOS Local NLP (TF-IDF)",
  });

  return {
    reply: localReply,
    source: "local",
    modelUsed: "SigitOS Local NLP (TF-IDF Engine)",
    contextSources: ["Katalog Portofolio Lokal", "Knowledge Engine"],
    latencyMs: Date.now() - startTime,
  };
}
