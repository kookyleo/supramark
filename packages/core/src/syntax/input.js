const customInputHooks = [];
export function registerInputHook(hook) {
    customInputHooks.push(hook);
}
function findInputHook(name) {
    return customInputHooks.find(hook => hook.name === name);
}
/**
 * 在 MarkdownIt 实例上注册 %%% input 块语法。
 *
 * 语法格式：
 * ```
 * %%%name params
 * content
 * %%%
 * ```
 */
export function registerInputSyntax(md, _config) {
    // 自定义 block rule 来解析 %%% 语法
    md.block.ruler.before('fence', 'input_block', (state, startLine, endLine, silent) => {
        const startPos = state.bMarks[startLine] + state.tShift[startLine];
        const maxPos = state.eMarks[startLine];
        const lineText = state.src.slice(startPos, maxPos);
        // 检查是否以 %%% 开头
        if (!lineText.startsWith('%%%')) {
            return false;
        }
        // 提取 name 和 params
        const match = lineText.match(/^%%%(\w+)(?:\s+(.*))?$/);
        if (!match) {
            return false;
        }
        if (silent) {
            return true;
        }
        const name = match[1];
        const params = match[2] || '';
        // 查找结束标记 %%%
        let nextLine = startLine + 1;
        let found = false;
        while (nextLine < endLine) {
            const nextLineStart = state.bMarks[nextLine] + state.tShift[nextLine];
            const nextLineEnd = state.eMarks[nextLine];
            const nextLineText = state.src.slice(nextLineStart, nextLineEnd);
            if (nextLineText.trim() === '%%%') {
                found = true;
                break;
            }
            nextLine++;
        }
        if (!found) {
            return false;
        }
        // 创建 tokens
        const tokenOpen = state.push('input_open', 'div', 1);
        tokenOpen.info = `${name} ${params}`.trim();
        tokenOpen.map = [startLine, nextLine + 1];
        tokenOpen.block = true;
        tokenOpen.meta = { name, params };
        const tokenClose = state.push('input_close', 'div', -1);
        tokenClose.block = true;
        state.line = nextLine + 1;
        return true;
    });
}
/**
 * 创建 input 语法的 AST 处理器。
 *
 * 返回一个函数，用于在 parseMarkdown 的 token 遍历中处理 input_open / input_close。
 */
export function createInputProcessor(ctx) {
    const { sourceLines, stack } = ctx;
    const opaqueInputStack = [];
    return (token) => {
        const tokenType = token.type;
        // input_open / input_close
        if (tokenType === 'input_open' || tokenType === 'input_close') {
            const phase = tokenType === 'input_open' ? 'open' : 'close';
            const meta = token.meta || {};
            const name = meta.name || '';
            // 查找自定义 hook
            const hook = findInputHook(name);
            if (hook) {
                const hookCtx = {
                    ...ctx,
                    token,
                    name,
                    phase,
                };
                if (phase === 'open') {
                    hook.onOpen(hookCtx);
                    if (hook.opaque) {
                        opaqueInputStack.push(name);
                    }
                }
                else {
                    if (hook.onClose) {
                        hook.onClose(hookCtx);
                    }
                    if (hook.opaque && opaqueInputStack[opaqueInputStack.length - 1] === name) {
                        opaqueInputStack.pop();
                    }
                }
                return true;
            }
            // 默认处理：创建通用 input 节点
            if (phase === 'open') {
                const params = meta.params || '';
                const innerText = extractInputInnerText(token, sourceLines);
                // 解析内容为简单的 key: value 格式
                const data = {};
                for (const line of innerText.split('\n')) {
                    const kvMatch = line.match(/^([\w-]+):\s*(.*)$/);
                    if (kvMatch) {
                        const [, key, value] = kvMatch;
                        // 尝试解析为 number 或 boolean
                        if (value === 'true')
                            data[key] = true;
                        else if (value === 'false')
                            data[key] = false;
                        else if (/^-?\d+(\.\d+)?$/.test(value))
                            data[key] = parseFloat(value);
                        else
                            data[key] = value;
                    }
                }
                const inputNode = {
                    type: 'input',
                    name,
                    params: params || undefined,
                    data,
                    children: [],
                };
                const parent = stack[stack.length - 1];
                parent.children.push(inputNode);
                // Input 块默认是 opaque，不需要 push 到 stack
            }
            return true;
        }
        // 处于不透明 input 块内部时，跳过所有 token
        if (opaqueInputStack.length > 0) {
            return true;
        }
        return false;
    };
}
/**
 * 从 input_open token 的信息中提取内部原始文本。
 */
export function extractInputInnerText(token, sourceLines) {
    if (!token.map || token.map.length !== 2)
        return '';
    const [start, end] = token.map;
    const innerStart = start + 1;
    const innerEnd = end - 1 > innerStart ? end - 1 : end;
    return sourceLines.slice(innerStart, innerEnd).join('\n');
}
//# sourceMappingURL=input.js.map