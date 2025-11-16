import { useCallback, useEffect, useRef, useState } from 'react';
import type { editor as MEditor, IDisposable } from 'monaco-editor';
import type { OnMount, Monaco } from '@monaco-editor/react';

export type UseReviewArgs = {
  classes: {
    reviewLineIcon: string;
    reviewLineHighlight: string;
    reviewLineMargin: string;
    focusedCommentHighlight: string;
    commentedLineHint: string;
  };
  /** All comments of the CURRENT file only */
  fileComments: Array<{ _id: string; startLine: number; endLine: number }>;
};

type ActiveWidget = { start: number; end: number; top: number } | null;

export default function useReviewInteractions({
  classes,
  fileComments,
}: UseReviewArgs) {
  const editorRef = useRef<MEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const listenerDisposablesRef = useRef<IDisposable[]>([]);

  const hoverDecoRef = useRef<string[]>([]);
  const iconDecoRef = useRef<string[]>([]);
  const dragDecosRef = useRef<string[]>([]);
  const focusedDecosRef = useRef<string[]>([]);
  const staticDecosRef = useRef<string[]>([]);

  const [focusedCommentIds, setFocusedCommentIds] = useState<string[]>([]);
  const [activeWidget, setActiveWidget] = useState<ActiveWidget>(null);

  const clearCommentDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
    dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, []);
    iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
    setActiveWidget(null);
  }, []);

  const renderFocusedAndStaticDecos = useCallback(
    (focusedIds: string[]) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      setFocusedCommentIds(focusedIds);
      const focusedSet = new Set(focusedIds);

      const focusDecos = fileComments
        .filter(c => focusedSet.has(c._id))
        .map(c => ({
          range: new monaco.Range(c.startLine, 1, c.endLine, 1),
          options: {
            isWholeLine: true,
            className: classes.focusedCommentHighlight,
          },
        }));

      const staticDecos = fileComments
        .filter(c => !focusedSet.has(c._id))
        .map(c => ({
          range: new monaco.Range(c.startLine, 1, c.endLine, 1),
          options: { isWholeLine: true, className: classes.commentedLineHint },
        }));

      focusedDecosRef.current = editor.deltaDecorations(
        focusedDecosRef.current,
        focusDecos
      );
      staticDecosRef.current = editor.deltaDecorations(
        staticDecosRef.current,
        staticDecos
      );
    },
    [classes.focusedCommentHighlight, classes.commentedLineHint]
  );

  const resetDecosForNewFile = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    focusedDecosRef.current = editor.deltaDecorations(
      focusedDecosRef.current,
      []
    );
    staticDecosRef.current = editor.deltaDecorations(
      staticDecosRef.current,
      []
    );
    renderFocusedAndStaticDecos([]);
  }, [renderFocusedAndStaticDecos]);

  // Mount handler (wire all listeners)
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    focusedDecosRef.current = [];
    staticDecosRef.current = [];
    renderFocusedAndStaticDecos([]);

    // Dispose old listeners
    listenerDisposablesRef.current.forEach(d => d?.dispose?.());
    listenerDisposablesRef.current = [];

    let startLine: number | null = null;

    const onMouseDown = editor.onMouseDown(e => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        startLine = e.target.position.lineNumber;

        renderFocusedAndStaticDecos([]);
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          []
        );
        iconDecoRef.current = editor.deltaDecorations([], [
          {
            range: new monaco.Range(startLine, 1, startLine, 1),
            options: {
              isWholeLine: true,
              glyphMarginClassName: classes.reviewLineIcon,
            },
          },
        ]);
        return;
      }

      if (
        e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT &&
        e.target.position
      ) {
        const line = e.target.position.lineNumber;
        const clicked = fileComments.filter(
          c => c.startLine <= line && c.endLine >= line
        );
        renderFocusedAndStaticDecos(clicked.map(c => c._id));
        return;
      }

      renderFocusedAndStaticDecos([]);
    });

    const onMouseUp = editor.onMouseUp(e => {
      if (startLine === null) return;

      if (!e.target?.position) {
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          []
        );
        iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
        startLine = null;
        return;
      }

      const endLine = e.target.position.lineNumber;
      const start = Math.min(startLine, endLine);
      const finish = Math.max(startLine, endLine);

      const decos = [];
      for (let l = start; l <= finish; l++) {
        decos.push({
          range: new monaco.Range(l, 1, l, 1),
          options: {
            isWholeLine: true,
            className: classes.reviewLineHighlight,
            linesDecorationsClassName: classes.reviewLineMargin,
          },
        });
      }
      dragDecosRef.current = editor.deltaDecorations(
        dragDecosRef.current,
        decos
      );

      const top = editor.getTopForLineNumber(finish);
      setActiveWidget({ start, end: finish, top });
      startLine = null;
    });

    const onMouseMove = editor.onMouseMove(e => {
      // If dragging selection, don't show hover highlight
      if (activeWidget) {
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
        return;
      }

      if (startLine !== null && e.target?.position) {
        const line = e.target.position.lineNumber;
        const start = Math.min(startLine, line);
        const finish = Math.max(startLine, line);
        const decos = [];
        for (let l = start; l <= finish; l++) {
          decos.push({
            range: new monaco.Range(l, 1, l, 1),
            options: {
              isWholeLine: true,
              className: classes.reviewLineHighlight,
              linesDecorationsClassName: classes.reviewLineMargin,
            },
          });
        }
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          decos
        );
        return;
      }

      if (e.target?.position) {
        const line = e.target.position.lineNumber;
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: classes.reviewLineHighlight,
              glyphMarginClassName: classes.reviewLineIcon,
            },
          },
        ]);
      } else {
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
      }
    });

    listenerDisposablesRef.current.push(onMouseDown, onMouseUp, onMouseMove);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => listenerDisposablesRef.current.forEach(d => d?.dispose?.());
  }, []);

  return {
    editorRef,
    monacoRef,
    focusedCommentIds,
    activeWidget,
    onMount: handleEditorMount,
    clearCommentDecorations,
    renderFocusedAndStaticDecos,
    resetDecosForNewFile,
  };
}
