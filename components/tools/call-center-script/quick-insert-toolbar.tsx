"use client";

import { User, Hash, Calendar, MapPin, Tag, ExternalLink } from "lucide-react";
import { EVAM_CUSTOMER_FIELDS } from "@/lib/call-center-script/constants";

interface QuickInsertToolbarProps {
  onInsertText: (text: string) => void;
  disabled?: boolean;
}

export function QuickInsertToolbar({ onInsertText, disabled = false }: QuickInsertToolbarProps) {
  const customerFields = [
    {
      label: "Müşteri Adı",
      snippet: EVAM_CUSTOMER_FIELDS.name,
      icon: User,
    },
    {
      label: "TCKN",
      snippet: EVAM_CUSTOMER_FIELDS.identificationNumber,
      icon: Hash,
    },
    {
      label: "Yaş",
      snippet: EVAM_CUSTOMER_FIELDS.age,
      icon: Calendar,
    },
    {
      label: "Cinsiyet",
      snippet: EVAM_CUSTOMER_FIELDS.gender,
      icon: Tag,
    },
    {
      label: "Doğum Yeri",
      snippet: EVAM_CUSTOMER_FIELDS.birthPlace,
      icon: MapPin,
    },
  ];

  const htmlSnippets = [
    {
      label: "Boş Satır <p> </p>",
      snippet: "<p> </p>",
    },
    {
      label: "Bağlantı <a href='...'>",
      snippet: "<a href='https://'>Bağlantı Metni</a>",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      <span className="font-medium text-ink-subtle">Hızlı Ekle:</span>
      {customerFields.map((field) => {
        const Icon = field.icon;
        return (
          <button
            key={field.label}
            type="button"
            disabled={disabled}
            onClick={() => onInsertText(field.snippet)}
            title={`İmleç konumuna '${field.snippet}' ekle`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-surface-hover text-ink border border-line text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Icon className="size-3 text-brand-600" />
            <span>{field.label}</span>
          </button>
        );
      })}
      <div className="h-4 w-px bg-line mx-1" aria-hidden="true" />
      {htmlSnippets.map((snip) => (
        <button
          key={snip.label}
          type="button"
          disabled={disabled}
          onClick={() => onInsertText(snip.snippet)}
          title={`İmleç konumuna '${snip.snippet}' ekle`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-surface-hover text-ink-muted hover:text-ink border border-line text-xs font-mono transition-colors disabled:opacity-50"
        >
          <span>{snip.label}</span>
        </button>
      ))}
    </div>
  );
}
