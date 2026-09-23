import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import type { ViewUpdate } from '@codemirror/view'
import type { SyntaxMode, ThemeMode } from '@shared/types'
import { createEditorTheme, createHighlightStyle, promptTags } from './promptSyntax'

interface EditorPaneProps {
  value: string
  theme: ThemeMode
  syntaxMode: SyntaxMode
  onChange: (value: string) => void
  onActivity: () => void
}

export function EditorPane({
  value,
  theme,
  syntaxMode,
  onChange,
  onActivity
}: EditorPaneProps): React.JSX.Element {
  const editorTheme = useMemo(() => createEditorTheme(theme), [theme])
  const highlightStyle = useMemo(() => createHighlightStyle(theme), [theme])
  const languageExtension = useMemo(() => {
    switch (syntaxMode) {
      case 'markdown':
        return [markdown(), promptTags]
      case 'json':
        return [json()]
      case 'javascript':
        return [javascript({ jsx: true, typescript: true })]
      case 'prompt':
        return [promptTags]
      default:
        return []
    }
  }, [syntaxMode])

  const extensions = useMemo(
    () => [editorTheme, highlightStyle, ...languageExtension],
    [editorTheme, highlightStyle, languageExtension]
  )

  return (
    <CodeMirror
      className="editor-pane"
      value={value}
      height="100%"
      theme="none"
      extensions={extensions}
      onChange={onChange}
      onUpdate={(update: ViewUpdate) => {
        if (update.docChanged) {
          onActivity()
        }
      }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: false,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true
      }}
    />
  )
}
