"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  RotateCcw,
  SpellCheck,
  Shield,
  Layers,
  MessageSquare,
  Bell,
  Smartphone,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { EditorPane } from "@/components/editors/editor-pane";
import { TextEditor } from "@/components/editors/text-editor";
import { CopyButton } from "@/components/editors/copy-button";
import { StatusIndicator } from "@/components/feedback/status-indicator";
import { InlineAlert } from "@/components/feedback/inline-alert";
import { ResultPanel } from "@/components/feedback/result-panel";
import { WorkspaceToolbar } from "@/components/tools/tool-page";
import {
  correctTypography,
  TYPO_RULE_CATEGORIES,
  PROTECTED_TURKISH_CHARACTERS,
  type TypoCorrectionResult,
  type TypoChannelMode,
} from "@/lib/typo-normalizer";
import type { ToolRunState, EngineError } from "@/lib/tools/engine";
import { getTextStats, formatNumber } from "@/lib/text-stats";
import { usePrimaryShortcut } from "@/lib/hooks/use-primary-shortcut";
import { cn } from "@/lib/cn";

const SAMPLE_TYPO_TEXT = `Türkiye Finans’tan değerli müşterilerimize özel fırsat… Ali topu at. Ayşe topu tut. Mahmut topu yakala. Selam sana Selam Mustafa.
“Hızlı Finansman” kampanyamız kapsamında — masrafsız kâr payı ve Âlâ Kart avantajları sunuyoruz.`;

interface ChannelConfig {
  id: TypoChannelMode;
  title: string;
  icon: typeof MessageSquare;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "sms",
    title: "SMS",
    icon: MessageSquare,
  },
  {
    id: "push",
    title: "PUSH",
    icon: Bell,
  },
  {
    id: "mobil-sube",
    title: "Mobil Şube",
    icon: Smartphone,
  },
];

export function TypoCorrectionWorkspace() {
  const [selectedChannel, setSelectedChannel] = useState<TypoChannelMode>("sms");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [correctionResult, setCorrectionResult] = useState<TypoCorrectionResult | null>(null);
  const [runState, setRunState] = useState<ToolRunState>("idle");
  const [error, setError] = useState<EngineError | null>(null);
  const [, startTransition] = useTransition();

  const inputStats = getTextStats(input);
  const outputStats = getTextStats(output);

  // SMS length calculation: GSM 7-bit standard allows 160 chars per segment
  const smsSegments = Math.ceil(Math.max(1, outputStats.characters || inputStats.characters) / 160);

  function executeCorrection(textToProcess: string, channelMode: TypoChannelMode) {
    if (!textToProcess.trim()) {
      setRunState("error");
      setError({
        code: "EMPTY_INPUT",
        message: "Kontrol edilecek metin bulunamadı.",
        hint: "Sol panele SMS, Push bildirimi veya kampanya metnini yapıştırın.",
      });
      return;
    }

    setRunState("processing");
    setError(null);

    startTransition(() => {
      const result = correctTypography(textToProcess, channelMode);
      if (!result.ok) {
        setRunState("warning");
        setError(result.error);
        return;
      }

      setOutput(result.value.output);
      setCorrectionResult(result.value);
      setRunState("success");
    });
  }

  function handleCorrect() {
    executeCorrection(input, selectedChannel);
  }

  function handleChannelSwitch(newChannel: TypoChannelMode) {
    setSelectedChannel(newChannel);

    // If we already have precomputed outputs, switch immediately with zero lag
    if (correctionResult && correctionResult.channelOutputs) {
      const nextOutput = correctionResult.channelOutputs[newChannel];
      setOutput(nextOutput);
      // Re-evaluate changes for this channel
      const result = correctTypography(input, newChannel);
      if (result.ok) {
        setCorrectionResult(result.value);
      }
    } else if (input.trim()) {
      executeCorrection(input, newChannel);
    }
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setCorrectionResult(null);
    setError(null);
    setRunState("idle");
  }

  function handleLoadSample() {
    setInput(SAMPLE_TYPO_TEXT);
    executeCorrection(SAMPLE_TYPO_TEXT, selectedChannel);
  }

  usePrimaryShortcut(handleCorrect);

  const activeChannelConfig = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Workspace Toolbar */}
      <WorkspaceToolbar status={<StatusIndicator state={runState} />}>
        <Button variant="primary" size="md" icon={SpellCheck} onClick={handleCorrect}>
          Karakterleri Düzelt
          <Kbd inverted className="ml-1.5 hidden sm:inline-flex">Ctrl+Enter</Kbd>
        </Button>

        <Button
          variant="ghost"
          size="md"
          icon={Sparkles}
          onClick={handleLoadSample}
          title="Tüm kanal özelliklerini test eden örnek kampanya metni yükler"
        >
          Örnek Metin Yükle
        </Button>

        {input ? (
          <Button variant="ghost" size="md" icon={RotateCcw} onClick={handleClear} className="text-ink-muted">
            Temizle
          </Button>
        ) : null}
      </WorkspaceToolbar>

      {/* 3 Channel Selection Tabs */}
      <div className="rounded-lg border border-line bg-surface p-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted uppercase tracking-wider px-1">
            <Layers className="size-3.5 text-brand-700" />
            <span>Kanal Seçimi:</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleChannelSwitch(ch.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border",
                    isActive
                      ? "bg-brand-900 border-brand-950 text-white shadow-xs"
                      : "bg-surface-muted border-line-subtle text-ink-muted hover:text-ink hover:bg-canvas",
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", isActive ? "text-white" : "text-ink-muted")} />
                  <span>{ch.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persistent Inline Alert */}
      {error ? (
        <InlineAlert
          tone={error.code === "ENGINE_NOT_AVAILABLE" ? "info" : "error"}
          title={error.message}
          onDismiss={() => setError(null)}
        >
          {error.hint}
        </InlineAlert>
      ) : null}

      {/* Change Summary Feedback */}
      {correctionResult ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs">
          {correctionResult.totalChanges > 0 ? (
            <>
              <span className="font-semibold text-brand-900">
                {correctionResult.totalChanges} düzeltme uygulandı ({activeChannelConfig.title}):
              </span>
              {correctionResult.changes.map((c) => {
                const ruleLabel =
                  TYPO_RULE_CATEGORIES.find((r) => r.id === c.rule)?.label ?? c.rule;
                return (
                  <span
                    key={c.rule}
                    className="inline-flex items-center rounded bg-surface-muted px-2 py-0.5 font-medium text-ink border border-line-subtle"
                  >
                    {c.count} {ruleLabel}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="font-medium text-success flex items-center gap-1">
              <Check className="size-3.5" /> Metin temiz: Bu kanala özel düzeltme gerektiren sorunlu karakter bulunamadı.
            </span>
          )}
        </div>
      ) : null}

      {/* Two-Pane Workspace */}
      <div className="grid min-h-[340px] flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left Pane: Original Input */}
        <EditorPane
          id="typo-input-pane"
          label="Orijinal Metin"
          actions={
            input ? (
              <Button variant="ghost" size="sm" onClick={() => setInput("")}>
                Metni Sil
              </Button>
            ) : null
          }
          footer={
            <div className="flex w-full items-center justify-between">
              <span>
                {formatNumber(inputStats.characters)} karakter · {formatNumber(inputStats.words)} kelime
              </span>
              <span className="text-ink-muted">Girdi Paneli</span>
            </div>
          }
        >
          <TextEditor
            labelledBy="typo-input-pane-label"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kontrol etmek istediğiniz metni buraya yapıştırın..."
          />
        </EditorPane>

        {/* Right Pane: Normalized Output */}
        <EditorPane
          id="typo-output-pane"
          label={`Düzeltilmiş Metin (${activeChannelConfig.title})`}
          actions={
            <div className="flex items-center gap-1.5">
              {/* Quick channel tabs inside output header */}
              <div className="hidden sm:inline-flex items-center bg-canvas rounded border border-line p-0.5 mr-1">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleChannelSwitch(ch.id)}
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold rounded transition-colors",
                      selectedChannel === ch.id
                        ? "bg-brand-900 text-white"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {ch.title}
                  </button>
                ))}
              </div>
              <CopyButton text={output} ariaLabel="Düzeltilmiş metni panoya kopyala" />
            </div>
          }
          footer={
            <div className="flex w-full items-center justify-between">
              <span>
                {output
                  ? `${formatNumber(outputStats.characters)} karakter · ${formatNumber(outputStats.words)} kelime`
                  : "Düzeltilmiş metin bekleniyor"}
              </span>
              <span>
                {selectedChannel === "sms" && output ? (
                  <span className="font-semibold text-brand-900">
                    ~{smsSegments} SMS Boyu (GSM 7-bit)
                  </span>
                ) : output ? (
                  <span className="text-emerald-700 font-medium">✓ Gönderime Hazır</span>
                ) : (
                  ""
                )}
              </span>
            </div>
          }
        >
          <TextEditor
            labelledBy="typo-output-pane-label"
            value={output}
            readOnly
            placeholder="Karakterler düzeltildiğinde güvenle kopyalayabileceğiniz metin burada görüntülenecektir."
          />
        </EditorPane>
      </div>

      {/* Rule Categories and Explanations */}
      <ResultPanel
        id="typo-rules-panel"
        title="Kanal Kuralları ve Dönüşüm Kılavuzu"
        summary="SMS, PUSH ve Mobil Şube kanalları için uygulanan operasyonel standartlar"
        collapsible={true}
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-3 text-ui">
          {/* SMS Rules */}
          <div className="rounded border border-line p-3 bg-surface-muted space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-ink text-xs">
              <MessageSquare className="size-3.5 text-brand-700" />
              <span>1. SMS Kuralları (Karasal SMS)</span>
            </div>
            <p className="text-[11px] text-ink-muted">
              Türkçe karakterler kesinlikle kullanılmaz ve 7-bit ASCII eşleniklerine çevrilir:
            </p>
            <ul className="text-[11px] space-y-1 font-mono text-ink">
              <li>• Â, â → A, a</li>
              <li>• Ç, ç → C, c</li>
              <li>• Ğ, ğ → G, g</li>
              <li>• İ, ı → I, i</li>
              <li>• Ö, ö → O, o</li>
              <li>• Ş, ş → S, s</li>
              <li>• Ü, ü → U, u</li>
            </ul>
            <p className="text-[11px] text-ink-subtle">
              Tırnak ('' ''), kesme ('), tire (-) ve görünmez karakterler de standart hale getirilir.
            </p>
          </div>

          {/* PUSH Rules */}
          <div className="rounded border border-line p-3 bg-surface-muted space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-ink text-xs">
              <Bell className="size-3.5 text-brand-700" />
              <span>2. PUSH Kuralları</span>
            </div>
            <p className="text-[11px] text-ink-muted">
              Türkçe karakter desteği olduğu için Türkçe harfler <strong>asla değiştirilmez</strong>.
            </p>
            <div className="flex flex-wrap gap-1 py-1">
              {PROTECTED_TURKISH_CHARACTERS.map((char) => (
                <span
                  key={char}
                  className="inline-flex size-5 items-center justify-center rounded border border-line bg-surface font-mono text-xs font-semibold text-ink"
                >
                  {char}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-ink-subtle">
              Yalnızca Word/Outlook akıllı tırnakları, kesme işaretleri, uzun tireler ve görünmez boşluklar temizlenir.
            </p>
          </div>

          {/* Mobil Şube Rules */}
          <div className="rounded border border-line p-3 bg-surface-muted space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-ink text-xs">
              <Smartphone className="size-3.5 text-brand-700" />
              <span>3. Mobil Şube Kuralları</span>
            </div>
            <p className="text-[11px] text-ink-muted">
              Türkçe korunur, tipografi düzeltilir. Ek olarak noktadan (.) sonraki ilk kelimenin başına <strong>\n- </strong> kaçış ifadesi eklenir:
            </p>
            <div className="rounded bg-canvas p-2 border border-line font-mono text-[11px] text-ink leading-relaxed">
              Örnek:
              <br />
              Ali topu at. Ayşe topu tut.
              <br />
              ↓
              <br />
              <span className="text-brand-900 font-semibold">Ali topu at. \n- Ayşe topu tut.</span>
            </div>
            <p className="text-[11px] text-ink-subtle">
              Cümle başı veya en son nokta etkilenmez; sadece devam eden cümlelerin başına format uygulanır.
            </p>
          </div>
        </div>
      </ResultPanel>
    </div>
  );
}
