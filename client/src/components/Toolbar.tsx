import { Fragment } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { altKey as alt, modKey as mod } from '../lib/platform';

interface ToolbarButton {
  key: string;
  group: 'text' | 'heading' | 'list';
  label: string;
  text: string;
  shortcut: string;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

const buttons: ToolbarButton[] = [
  { key: 'bold', group: 'text', label: 'Bold', text: 'B', shortcut: `${mod}+B`, isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { key: 'italic', group: 'text', label: 'Italic', text: 'I', shortcut: `${mod}+I`, isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { key: 'underline', group: 'text', label: 'Underline', text: 'U', shortcut: `${mod}+U`, isActive: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run() },
  ...([1, 2, 3] as const).map((level) => ({
    key: `h${level}`,
    group: 'heading' as const,
    label: `Heading ${level}`,
    text: `H${level}`,
    shortcut: `${mod}+${alt}+${level}`,
    isActive: (e: Editor) => e.isActive('heading', { level }),
    run: (e: Editor) => e.chain().focus().toggleHeading({ level }).run(),
  })),
  { key: 'bullet', group: 'list', label: 'Bulleted list', text: '• List', shortcut: `${mod}+Shift+8`, isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { key: 'ordered', group: 'list', label: 'Numbered list', text: '1. List', shortcut: `${mod}+Shift+7`, isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
];

export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render only when the set of active formats changes, not on every keystroke.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => buttons.map((b) => b.isActive(e)).join(','),
  }).split(',');

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {buttons.map((b, i) => (
        <Fragment key={b.key}>
          {i > 0 && buttons[i - 1]!.group !== b.group && <span className="tool-sep" aria-hidden="true" />}
          <button
            type="button"
            className={`tool tool-${b.key}`}
            aria-label={b.label}
            aria-pressed={active[i] === 'true'}
            title={`${b.label} (${b.shortcut})`}
            onClick={() => b.run(editor)}
          >
            {b.text}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
