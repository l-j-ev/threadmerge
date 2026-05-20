import { useState, useRef, useEffect } from 'react';
import { useCustomisation, UIRedaction } from '../lib/stores/customisation';

interface Props {
  messageId: string;
  plainText: string;
  redactions: UIRedaction[];
}

interface SelectionInfo {
  startOffset: number;
  endOffset: number;
  text: string;
  rect: { top: number; left: number };
}

export function MessageBody({ messageId, plainText, redactions }: Props) {
  const addRedaction = useCustomisation((s) => s.addRedaction);
  const removeRedaction = useCustomisation((s) => s.removeRedaction);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);

  // Detect text selection within this body
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      const offsets = computeTextOffsets(container, range);
      if (!offsets) {
        setSelection(null);
        return;
      }

      const text = sel.toString();
      if (!text.trim()) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setSelection({
        startOffset: offsets.start,
        endOffset: offsets.end,
        text,
        rect: {
          top: rect.top - containerRect.top - 30,
          left: rect.left - containerRect.left,
        },
      });
    }

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleMouseUp);
    };
  }, []);

  function handleRedact() {
    if (!selection) return;
    addRedaction(messageId, selection.startOffset, selection.endOffset, selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleClickRedaction(redaction: UIRedaction) {
    if (confirm(`Un-redact "${redaction.originalText.substring(0, 40)}..."?`)) {
      removeRedaction(messageId, redaction.id);
    }
  }

  const segments = buildSegments(plainText, redactions);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed p-3 bg-gray-50 border border-gray-200 rounded select-text"
      >
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              onClick={() => handleClickRedaction(seg.redaction)}
              className="bg-yellow-200 line-through cursor-pointer hover:bg-yellow-300"
              title="Click to un-redact"
            >
              {seg.redaction.originalText}
            </span>
          )
        )}
      </div>

      {selection && (
        <button
          onClick={handleRedact}
          className="absolute z-10 px-2 py-1 bg-amber-600 text-white text-xs rounded shadow hover:bg-amber-700"
          style={{
            top: `${selection.rect.top}px`,
            left: `${selection.rect.left}px`,
          }}
        >
          Redact selection
        </button>
      )}
    </div>
  );
}

/**
 * Walk through text nodes inside `container` to compute character offsets
 * for the given range. Returns null if the range can't be mapped.
 */
function computeTextOffsets(
  container: HTMLElement,
  range: Range
): { start: number; end: number } | null {
  let charCount = 0;
  let startOffset = -1;
  let endOffset = -1;

  function walk(node: Node) {
    if (startOffset !== -1 && endOffset !== -1) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length || 0;
      if (node === range.startContainer) {
        startOffset = charCount + range.startOffset;
      }
      if (node === range.endContainer) {
        endOffset = charCount + range.endOffset;
      }
      charCount += len;
    } else {
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  }

  walk(container);

  if (startOffset === -1 || endOffset === -1) return null;
  if (startOffset > endOffset) [startOffset, endOffset] = [endOffset, startOffset];
  return { start: startOffset, end: endOffset };
}

type Segment =
  | { type: 'text'; text: string }
  | { type: 'redaction'; redaction: UIRedaction };

function buildSegments(plainText: string, redactions: UIRedaction[]): Segment[] {
  if (redactions.length === 0) {
    return [{ type: 'text', text: plainText }];
  }

  const sorted = [...redactions].sort((a, b) => a.startOffset - b.startOffset);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const r of sorted) {
    if (r.startOffset > cursor) {
      segments.push({ type: 'text', text: plainText.slice(cursor, r.startOffset) });
    }
    segments.push({ type: 'redaction', redaction: r });
    cursor = r.endOffset;
  }
  if (cursor < plainText.length) {
    segments.push({ type: 'text', text: plainText.slice(cursor) });
  }
  return segments;
}
