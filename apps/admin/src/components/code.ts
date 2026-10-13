// 接入示例只需轻量着色；React 文本节点负责转义，复制仍使用原文。
export function codeTokens(source: string) {
  return source
    .split(
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|const|let|var|new|return|export|function|async|await|interface|type|void|true|false|null|undefined)\b|<\/?[a-zA-Z][\w-]*|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_$][\w$]*(?=\s*:))/g,
    )
    .map((text, index, parts) => {
      const kind =
        text.startsWith('//') || text.startsWith('/*')
          ? 'comment'
          : /^["'`]/.test(text)
            ? /^\s*:/.test(parts[index + 1] || '')
              ? 'property'
              : 'string'
            : /^<\/?[a-zA-Z]/.test(text)
              ? 'tag'
              : /^\d/.test(text)
                ? 'number'
                : /^(import|from|const|let|var|new|return|export|function|async|await|interface|type|void|true|false|null|undefined)$/.test(
                      text,
                    )
                  ? 'keyword'
                  : /^[a-zA-Z_$][\w$]*$/.test(text) &&
                      /^\s*:/.test(parts[index + 1] || '')
                    ? 'property'
                    : undefined;
      return { text, kind };
    });
}
