import { useState } from "react";
import { Clipboard, ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";

type Props = { data: unknown; defaultOpen?: boolean };

export default function JSONPreview({ data, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(data ?? null, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // noop
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-xs uppercase tracking-wide">Detalles (JSON)</span>
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {open && (
        <pre className="p-3 text-xs text-slate-200 overflow-x-auto">
{json}
        </pre>
      )}
    </div>
  );
}