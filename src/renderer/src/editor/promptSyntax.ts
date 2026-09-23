import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { tags as syntaxTags } from '@lezer/highlight'
import type { ThemeMode } from '@shared/types'

const promptTagMark = Decoration.mark({ class: 'cm-prompt-tag' })
const variableMark = Decoration.mark({ class: 'cm-prompt-variable' })

function buildPromptDecorations(view: EditorView): DecorationSet {
  const ranges: Array<ReturnType<Decoration['range']>> = []

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    const tagPattern = /\[[^\]\n]{1,100}\]/g
    const variablePattern = /\{\{[^}\n]{1,80}\}\}/g
    let match: RegExpExecArray | null

    while ((match = tagPattern.exec(text))) {
      const start = from + match.index
      ranges.push(promptTagMark.range(start, start + match[0].length))
    }

    while ((match = variablePattern.exec(text))) {
      const start = from + match.index
      ranges.push(variableMark.range(start, start + match[0].length))
    }
  }

  return Decoration.set(ranges, true)
}

class PromptTagDecorator {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = buildPromptDecorations(view)
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildPromptDecorations(update.view)
    }
  }
}

export const promptTags = ViewPlugin.fromClass(PromptTagDecorator, {
  decorations: (value) => value.decorations
})

export function createEditorTheme(theme: ThemeMode): Extension {
  const dark = theme === 'dark'
  const colors = dark
    ? {
        background: 'transparent',
        text: '#edf0f2',
        muted: '#77808b',
        gutter: '#12151a',
        activeLine: '#ffffff08',
        selection: '#2f6fed55',
        cursor: '#89d185'
      }
    : {
        background: 'transparent',
        text: '#171a1f',
        muted: '#6b7280',
        gutter: '#edf0f3',
        activeLine: '#0f172a08',
        selection: '#2563eb26',
        cursor: '#157a3b'
      }

  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: colors.background,
        color: colors.text
      },
      '.cm-content': {
        caretColor: colors.cursor,
        padding: '14px 0 48px',
        fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
        fontSize: '13px',
        lineHeight: '1.68'
      },
      '.cm-line': {
        padding: '0 18px 0 10px'
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.cursor,
        borderLeftWidth: '2px'
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: colors.selection
      },
      '.cm-gutters': {
        backgroundColor: colors.gutter,
        color: colors.muted,
        borderRight: '1px solid var(--line-soft)',
        fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
        fontSize: '11px',
        paddingLeft: '2px'
      },
      '.cm-activeLine': {
        backgroundColor: colors.activeLine
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.activeLine,
        color: colors.text
      },
      '.cm-scroller': {
        overflow: 'auto'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: colors.muted
      },
      '.cm-tooltip': {
        border: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        color: 'var(--ink)'
      }
    },
    { dark }
  )
}

export function createHighlightStyle(theme: ThemeMode): Extension {
  const dark = theme === 'dark'
  const palette = dark
    ? {
        keyword: '#c586c0',
        string: '#ce9178',
        number: '#b5cea8',
        comment: '#6a9955',
        variable: '#9cdcfe',
        heading: '#dcdcaa',
        link: '#4fc1ff'
      }
    : {
        keyword: '#af00db',
        string: '#a31515',
        number: '#098658',
        comment: '#008000',
        variable: '#001080',
        heading: '#795e26',
        link: '#0451a5'
      }

  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: syntaxTags.keyword, color: palette.keyword },
      { tag: syntaxTags.controlKeyword, color: palette.keyword },
      { tag: syntaxTags.moduleKeyword, color: palette.keyword },
      { tag: syntaxTags.string, color: palette.string },
      { tag: syntaxTags.special(syntaxTags.string), color: palette.string },
      { tag: syntaxTags.number, color: palette.number },
      { tag: syntaxTags.bool, color: palette.number },
      { tag: syntaxTags.null, color: palette.number },
      { tag: syntaxTags.comment, color: palette.comment, fontStyle: 'italic' },
      { tag: syntaxTags.lineComment, color: palette.comment, fontStyle: 'italic' },
      { tag: syntaxTags.blockComment, color: palette.comment, fontStyle: 'italic' },
      { tag: syntaxTags.variableName, color: palette.variable },
      { tag: syntaxTags.propertyName, color: palette.variable },
      { tag: syntaxTags.definition(syntaxTags.variableName), color: palette.variable },
      { tag: syntaxTags.heading, color: palette.heading, fontWeight: '600' },
      { tag: syntaxTags.heading1, color: palette.heading, fontWeight: '600' },
      { tag: syntaxTags.heading2, color: palette.heading, fontWeight: '600' },
      { tag: syntaxTags.link, color: palette.link },
      { tag: syntaxTags.url, color: palette.link }
    ])
  )
}
