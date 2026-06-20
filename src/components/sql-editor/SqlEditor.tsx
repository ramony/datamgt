"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { defaultKeymap } from "@codemirror/commands";
import { sql, MySQL } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

export type SqlEditorRef = {
  getExecutableSql: () => string;
};

type Props = {
  value: string;
  onChange?: (value: string) => void;
  onExecute?: () => void;
  schema?: Record<string, string[]>;
  minHeight?: number;
};

function completionSource(schema: Record<string, string[]> = {}) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[\w$]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const options = [
      ...Object.keys(schema).map((label) => ({ label, type: "class" })),
      ...Object.values(schema)
        .flat()
        .map((label) => ({ label, type: "property" })),
      ...["SELECT", "FROM", "WHERE", "ORDER BY", "GROUP BY", "INSERT", "UPDATE", "DELETE", "LIMIT"].map((label) => ({
        label,
        type: "keyword"
      }))
    ];
    return { from: word.from, options };
  };
}

const SqlEditor = forwardRef<SqlEditorRef, Props>(function SqlEditor({ value, onChange, onExecute, schema, minHeight = 60 }, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const propsRef = useRef({ onChange, onExecute });
  propsRef.current = { onChange, onExecute };

  useImperativeHandle(ref, () => ({
    getExecutableSql() {
      const view = viewRef.current;
      if (!view) return value;
      const selection = view.state.selection.main;
      if (!selection.empty) return view.state.sliceDoc(selection.from, selection.to);
      return view.state.doc.toString();
    }
  }));

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        sql({ dialect: MySQL }),
        autocompletion({ override: [completionSource(schema)] }),
        keymap.of([
          {
            key: "Mod-Enter",
            run() {
              propsRef.current.onExecute?.();
              return true;
            }
          },
          ...defaultKeymap
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) propsRef.current.onChange?.(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { minHeight: `${minHeight}px`, fontSize: "13px", backgroundColor: "#fff" },
          ".cm-scroller": { fontFamily: "Consolas, monospace", backgroundColor: "#fff" },
          ".cm-content": { backgroundColor: "#fff" },
          ".cm-gutters": { backgroundColor: "#fff", borderRight: "1px solid var(--border)" },
          ".cm-activeLine": { backgroundColor: "#f6f8fa" },
          ".cm-activeLineGutter": { backgroundColor: "#f6f8fa" }
        })
      ]
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, [schema, minHeight]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} style={{ background: "#fff" }} />;
});

export default SqlEditor;
