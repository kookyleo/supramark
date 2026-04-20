import MarkdownIt from 'markdown-it';
import { registerContainerSyntax, createContainerTokenProcessor } from './syntax/container.js';
import { createInputProcessor } from './syntax/input.js';
import { registerMainSyntaxPlugins } from './syntax/main.js';
import { mapFenceTokenToBlockNode } from './syntax/fence.js';
// 简单的任务列表插件（GFM task lists: - [ ] / - [x]）
function taskListPlugin(md) {
    md.core.ruler.after('inline', 'task-lists', function taskLists(state) {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === 'list_item_open') {
                // 查找下一个 inline token
                let j = i + 1;
                while (j < tokens.length && tokens[j].type !== 'inline') {
                    j++;
                }
                if (j < tokens.length) {
                    const children = tokens[j].children;
                    if (children && children.length > 0) {
                        const firstChild = children[0];
                        if (firstChild && firstChild.type === 'text') {
                            const text = firstChild.content;
                            const uncheckedMatch = text.match(/^\s*\[ \]\s+/);
                            const checkedMatch = text.match(/^\s*\[x\]\s+/i);
                            if (uncheckedMatch) {
                                token.attrSet('task-list-item', 'false');
                                firstChild.content = text.slice(uncheckedMatch[0].length);
                            }
                            else if (checkedMatch) {
                                token.attrSet('task-list-item', 'true');
                                firstChild.content = text.slice(checkedMatch[0].length);
                            }
                        }
                    }
                }
            }
        }
        return false;
    });
}
// 简单的删除线插件（GFM strikethrough: ~~text~~）
function strikethroughPlugin(md) {
    // 添加 s_open 和 s_close 规则
    md.inline.ruler.before('emphasis', 'strikethrough', function strikethrough(state, silent) {
        const start = state.pos;
        const marker = state.src.charCodeAt(start);
        if (silent)
            return false;
        if (marker !== 0x7e /* ~ */)
            return false;
        const scanned = state.scanDelims(start, true);
        let len = scanned.length;
        const ch = String.fromCharCode(marker);
        if (len < 2)
            return false;
        if (len % 2) {
            const token = state.push('text', '', 0);
            token.content = ch;
            len--;
        }
        for (let i = 0; i < len; i += 2) {
            const token = state.push('text', '', 0);
            token.content = ch + ch;
            if (!scanned.can_open && !scanned.can_close) {
                continue;
            }
            state.delimiters.push({
                marker,
                length: 0,
                token: state.tokens.length - 1,
                end: -1,
                open: scanned.can_open,
                close: scanned.can_close,
            });
        }
        state.pos += scanned.length;
        return true;
    });
    md.inline.ruler2.before('emphasis', 'strikethrough', function strikethrough(state) {
        const delimiters = state.delimiters;
        const max = delimiters.length;
        for (let i = 0; i < max; i++) {
            const startDelim = delimiters[i];
            if (startDelim.marker !== 0x7e /* ~ */)
                continue;
            if (startDelim.end === -1)
                continue;
            const endDelim = delimiters[startDelim.end];
            const token_o = state.tokens[startDelim.token];
            token_o.type = 's_open';
            token_o.tag = 's';
            token_o.nesting = 1;
            token_o.markup = '~~';
            token_o.content = '';
            const token_c = state.tokens[endDelim.token];
            token_c.type = 's_close';
            token_c.tag = 's';
            token_c.nesting = -1;
            token_c.markup = '~~';
            token_c.content = '';
            if (state.tokens[endDelim.token - 1].type === 'text' &&
                state.tokens[endDelim.token - 1].content === '~') {
                state.tokens[endDelim.token - 1].content = '';
            }
        }
        return false;
    });
}
/**
 * 根据配置创建 MarkdownIt 实例。
 *
 * 当前版本策略：
 * - 始终启用核心 Markdown 语法；
 * - 针对扩展能力（Math / Footnote / DefinitionList / Emoji / Admonition / GFM）：
 *   - 如果未提供 config 或 features 为空 → 认为全部启用；
 *   - 如果提供了 config，则根据 Feature ID 判断是否启用对应插件；
 *   - Feature ID 与插件映射关系：
 *     - `@supramark/feature-math` → texmath
 *     - `@supramark/feature-footnote` → markdown-it-footnote
 *     - `@supramark/feature-definition-list` → markdown-it-deflist
 *     - `@supramark/feature-emoji` → markdown-it-emoji
 *     - `@supramark/feature-admonition` → markdown-it-container（note/tip/info/warning/danger）
 *     - `@supramark/feature-gfm` → 表格 + 任务列表 + 删除线
 */
function createMarkdownIt(config) {
    const md = new MarkdownIt({
        html: false,
        linkify: true,
        typographer: false,
    });
    // main 家族：核心 Markdown + 行内/块级扩展（GFM / Math / Footnote / Definition / Emoji 等）
    registerMainSyntaxPlugins(md, config);
    // 所有基于 markdown-it-container 的容器语法
    // （Admonition / HTML Page / Map 等）
    registerContainerSyntax(md, config);
    return md;
}
function createRoot() {
    return {
        type: 'root',
        children: [],
    };
}
function mapInlineTokens(tokens, parent) {
    var _a;
    if (!tokens)
        return;
    const stack = [parent];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const current = stack[stack.length - 1];
        switch (token.type) {
            case 'text': {
                const textNode = {
                    type: 'text',
                    value: token.content,
                };
                current.children.push(textNode);
                break;
            }
            case 'code_inline': {
                const inlineCodeNode = {
                    type: 'inline_code',
                    value: token.content,
                };
                current.children.push(inlineCodeNode);
                break;
            }
            case 'math_inline':
            case 'math_inline_double': {
                const mathInlineNode = {
                    type: 'math_inline',
                    value: token.content,
                };
                // 对于由 $$...$$ 产生的 math_inline_double，记录 displayMode 以便上层渲染
                if (token.type === 'math_inline_double') {
                    mathInlineNode.data = { ...((_a = mathInlineNode.data) !== null && _a !== void 0 ? _a : {}), displayMode: true };
                }
                current.children.push(mathInlineNode);
                break;
            }
            case 'footnote_ref': {
                const meta = token.meta || {};
                const id = typeof meta.id === 'number' ? meta.id : 0;
                const index = id + 1;
                const refNode = {
                    type: 'footnote_reference',
                    index,
                };
                if (typeof meta.label === 'string') {
                    refNode.label = meta.label;
                }
                if (typeof meta.subId === 'number') {
                    refNode.subId = meta.subId;
                }
                current.children.push(refNode);
                break;
            }
            case 'strong_open': {
                const strongNode = {
                    type: 'strong',
                    children: [],
                };
                current.children.push(strongNode);
                stack.push(strongNode);
                break;
            }
            case 'strong_close': {
                stack.pop();
                break;
            }
            case 'em_open': {
                const emphasisNode = {
                    type: 'emphasis',
                    children: [],
                };
                current.children.push(emphasisNode);
                stack.push(emphasisNode);
                break;
            }
            case 'em_close': {
                stack.pop();
                break;
            }
            case 'link_open': {
                const href = token.attrGet('href') || '';
                const title = token.attrGet('title') || undefined;
                const linkNode = {
                    type: 'link',
                    url: href,
                    title,
                    children: [],
                };
                current.children.push(linkNode);
                stack.push(linkNode);
                break;
            }
            case 'link_close': {
                stack.pop();
                break;
            }
            case 's_open': {
                const deleteNode = {
                    type: 'delete',
                    children: [],
                };
                current.children.push(deleteNode);
                stack.push(deleteNode);
                break;
            }
            case 's_close': {
                stack.pop();
                break;
            }
            case 'image': {
                const src = token.attrGet('src') || '';
                const alt = token.content || '';
                const title = token.attrGet('title') || undefined;
                const imageNode = {
                    type: 'image',
                    url: src,
                    alt,
                    title,
                };
                current.children.push(imageNode);
                break;
            }
            case 'hardbreak': {
                const breakNode = {
                    type: 'break',
                };
                current.children.push(breakNode);
                break;
            }
            case 'emoji': {
                const textNode = {
                    type: 'text',
                    value: token.content,
                };
                current.children.push(textNode);
                break;
            }
            case 'softbreak': {
                // softbreak 通常转换为空格或换行
                const textNode = {
                    type: 'text',
                    value: '\n',
                };
                current.children.push(textNode);
                break;
            }
            default: {
                // 对于其他类型，如果有子节点则递归处理
                if (token.children && token.children.length > 0) {
                    mapInlineTokens(token.children, current);
                }
            }
        }
    }
}
/**
 * 对插件进行拓扑排序，确保依赖的插件先执行。
 *
 * @param plugins - 插件列表
 * @returns 排序后的插件列表
 * @throws 如果存在循环依赖或缺少依赖
 */
function sortPluginsByDependencies(plugins) {
    const pluginMap = new Map();
    const visited = new Set();
    const visiting = new Set();
    const sorted = [];
    // 构建插件名称到插件的映射
    for (const plugin of plugins) {
        if (pluginMap.has(plugin.name)) {
            throw new Error(`Duplicate plugin name: ${plugin.name}`);
        }
        pluginMap.set(plugin.name, plugin);
    }
    // 深度优先搜索进行拓扑排序
    function visit(pluginName, plugin) {
        if (visited.has(pluginName)) {
            return;
        }
        if (visiting.has(pluginName)) {
            throw new Error(`Circular dependency detected: ${pluginName}`);
        }
        visiting.add(pluginName);
        // 先访问依赖的插件
        if (plugin.dependencies) {
            for (const depName of plugin.dependencies) {
                const depPlugin = pluginMap.get(depName);
                if (!depPlugin) {
                    throw new Error(`Plugin "${pluginName}" depends on "${depName}", but "${depName}" is not provided`);
                }
                visit(depName, depPlugin);
            }
        }
        visiting.delete(pluginName);
        visited.add(pluginName);
        sorted.push(plugin);
    }
    // 访问所有插件
    for (const plugin of plugins) {
        visit(plugin.name, plugin);
    }
    return sorted;
}
export async function parseMarkdown(markdown, options = {}) {
    var _a, _b;
    const root = createRoot();
    const stack = [root];
    const md = createMarkdownIt(options.config);
    const tokens = md.parse(markdown, {});
    const sourceLines = markdown.split(/\r?\n/);
    const containerProcessor = createContainerTokenProcessor({
        config: options.config,
        sourceLines,
        stack,
    });
    const inputProcessor = createInputProcessor({
        config: options.config,
        sourceLines,
        stack,
    });
    // Definition list 需要在遍历过程中维护当前条目
    let currentDefList = null;
    let currentDefItem = null;
    let collectingTerm = false;
    let currentTermNodes = null;
    let currentDescriptionNodes = null;
    for (const token of tokens) {
        // 先交给容器语法层处理（Admonition / HTML Page / Map 等）
        if (containerProcessor(token)) {
            continue;
        }
        // Input 语法处理 (%%%)
        if (inputProcessor(token)) {
            continue;
        }
        const parent = stack[stack.length - 1];
        switch (token.type) {
            case 'heading_open': {
                const depth = Number.parseInt(token.tag.replace(/^h/i, ''), 10);
                const heading = {
                    type: 'heading',
                    depth: (depth >= 1 && depth <= 6 ? depth : 1),
                    children: [],
                };
                parent.children.push(heading);
                stack.push(heading);
                break;
            }
            case 'heading_close': {
                stack.pop();
                break;
            }
            case 'paragraph_open': {
                // 如果当前正在收集定义列表的 term，则暂时不创建 paragraph 节点，
                // term 内容存入临时数组，由 definition_item 承载。
                if (collectingTerm && currentTermNodes) {
                    // term 的 inline token 会在后续 inline 分支中写入 currentTermNodes
                    break;
                }
                // 定义列表描述（dd）中的段落，同样由 descriptions 数组承载，不单独创建段落节点
                if (currentDescriptionNodes) {
                    break;
                }
                const paragraph = {
                    type: 'paragraph',
                    children: [],
                };
                parent.children.push(paragraph);
                stack.push(paragraph);
                break;
            }
            case 'paragraph_close': {
                if (collectingTerm && currentTermNodes) {
                    break;
                }
                if (currentDescriptionNodes) {
                    break;
                }
                stack.pop();
                break;
            }
            case 'bullet_list_open':
            case 'ordered_list_open': {
                const ordered = token.type === 'ordered_list_open';
                const startAttr = token.attrGet ? token.attrGet('start') : null;
                const start = ordered && startAttr ? Number.parseInt(startAttr, 10) || 1 : ordered ? 1 : null;
                const list = {
                    type: 'list',
                    ordered,
                    start,
                    tight: undefined,
                    children: [],
                };
                parent.children.push(list);
                stack.push(list);
                break;
            }
            case 'bullet_list_close':
            case 'ordered_list_close': {
                stack.pop();
                break;
            }
            case 'list_item_open': {
                const taskListAttr = token.attrGet('task-list-item');
                let checked = undefined;
                if (taskListAttr !== null) {
                    checked = taskListAttr === 'true';
                }
                const item = {
                    type: 'list_item',
                    checked,
                    children: [],
                };
                parent.children.push(item);
                stack.push(item);
                break;
            }
            case 'list_item_close': {
                stack.pop();
                break;
            }
            case 'inline': {
                if (collectingTerm && currentTermNodes) {
                    // 当前 inline 属于定义列表的 term
                    const termParent = {
                        type: 'paragraph',
                        children: [],
                    };
                    mapInlineTokens(token.children, termParent);
                    currentTermNodes.push(...termParent.children);
                }
                else if (currentDescriptionNodes) {
                    // 当前 inline 属于定义列表的描述段落
                    const descParent = {
                        type: 'paragraph',
                        children: [],
                    };
                    mapInlineTokens(token.children, descParent);
                    currentDescriptionNodes.push(...descParent.children);
                }
                else {
                    const current = stack[stack.length - 1];
                    mapInlineTokens(token.children, current);
                }
                break;
            }
            case 'footnote_block_open': {
                // 脚注定义块容器，对 AST 结构来说可以视为透明，具体定义在 footnote_open/close 中处理
                break;
            }
            case 'footnote_block_close': {
                break;
            }
            case 'dl_open': {
                const listNode = {
                    type: 'definition_list',
                    children: [],
                };
                parent.children.push(listNode);
                currentDefList = listNode;
                currentDefItem = null;
                collectingTerm = false;
                currentTermNodes = null;
                currentDescriptionNodes = null;
                break;
            }
            case 'dl_close': {
                currentDefList = null;
                currentDefItem = null;
                collectingTerm = false;
                currentTermNodes = null;
                currentDescriptionNodes = null;
                break;
            }
            case 'dt_open': {
                if (!currentDefList) {
                    break;
                }
                const item = {
                    type: 'definition_item',
                    term: [],
                    descriptions: [],
                };
                currentDefList.children.push(item);
                currentDefItem = item;
                collectingTerm = true;
                currentTermNodes = item.term;
                currentDescriptionNodes = null;
                break;
            }
            case 'dt_close': {
                collectingTerm = false;
                currentTermNodes = null;
                break;
            }
            case 'dd_open': {
                if (!currentDefItem) {
                    break;
                }
                const descNodes = [];
                currentDefItem.descriptions.push(descNodes);
                currentDescriptionNodes = descNodes;
                break;
            }
            case 'dd_close': {
                currentDescriptionNodes = null;
                break;
            }
            case 'fence':
            case 'code_block': {
                mapFenceTokenToBlockNode(token, parent);
                break;
            }
            case 'math_block':
            case 'math_block_eqno': {
                const mathBlock = {
                    type: 'math_block',
                    value: token.content,
                };
                if (token.type === 'math_block_eqno' && typeof token.info === 'string' && token.info) {
                    mathBlock.data = { ...((_a = mathBlock.data) !== null && _a !== void 0 ? _a : {}), equationNumber: token.info };
                }
                parent.children.push(mathBlock);
                break;
            }
            case 'footnote_open': {
                const meta = token.meta || {};
                const id = typeof meta.id === 'number' ? meta.id : 0;
                const index = id + 1;
                const definition = {
                    type: 'footnote_definition',
                    index,
                    label: typeof meta.label === 'string' ? meta.label : undefined,
                    children: [],
                };
                parent.children.push(definition);
                stack.push(definition);
                break;
            }
            case 'footnote_close': {
                // 关闭当前脚注定义
                stack.pop();
                break;
            }
            case 'table_open': {
                // 需要提前扫描表格的 align 信息
                let alignInfo;
                // 从后续的 tokens 中查找 thead 来获取对齐信息
                for (let i = tokens.indexOf(token) + 1; i < tokens.length; i++) {
                    if (tokens[i].type === 'thead_open') {
                        // 查找 tr
                        for (let j = i + 1; j < tokens.length; j++) {
                            if (tokens[j].type === 'tr_open') {
                                // 收集 th 的对齐信息
                                const aligns = [];
                                for (let k = j + 1; k < tokens.length; k++) {
                                    if (tokens[k].type === 'tr_close')
                                        break;
                                    if (tokens[k].type === 'th_open' || tokens[k].type === 'td_open') {
                                        const style = tokens[k].attrGet('style');
                                        if (style && style.includes('text-align:left'))
                                            aligns.push('left');
                                        else if (style && style.includes('text-align:right'))
                                            aligns.push('right');
                                        else if (style && style.includes('text-align:center'))
                                            aligns.push('center');
                                        else
                                            aligns.push(null);
                                    }
                                }
                                alignInfo = aligns.length > 0 ? aligns : undefined;
                                break;
                            }
                        }
                        break;
                    }
                }
                const table = {
                    type: 'table',
                    align: alignInfo,
                    children: [],
                };
                parent.children.push(table);
                stack.push(table);
                break;
            }
            case 'table_close': {
                stack.pop();
                break;
            }
            case 'thead_open':
            case 'tbody_open': {
                // thead 和 tbody 不创建节点，直接跳过
                break;
            }
            case 'thead_close':
            case 'tbody_close': {
                break;
            }
            case 'tr_open': {
                const row = {
                    type: 'table_row',
                    children: [],
                };
                parent.children.push(row);
                stack.push(row);
                break;
            }
            case 'tr_close': {
                stack.pop();
                break;
            }
            case 'th_open':
            case 'td_open': {
                const style = token.attrGet('style');
                let align = null;
                if (style) {
                    if (style.includes('text-align:left'))
                        align = 'left';
                    else if (style.includes('text-align:right'))
                        align = 'right';
                    else if (style.includes('text-align:center'))
                        align = 'center';
                }
                const cell = {
                    type: 'table_cell',
                    align,
                    header: token.type === 'th_open',
                    children: [],
                };
                parent.children.push(cell);
                stack.push(cell);
                break;
            }
            case 'th_close':
            case 'td_close': {
                stack.pop();
                break;
            }
            default:
                break;
        }
    }
    // 初始化插件上下文
    const context = {
        source: markdown,
        data: {}, // 插件共享数据存储
    };
    // 获取插件列表并进行依赖排序
    const plugins = (_b = options.plugins) !== null && _b !== void 0 ? _b : [];
    if (plugins.length > 0) {
        const sortedPlugins = sortPluginsByDependencies(plugins);
        // 按照依赖顺序执行插件
        for (const plugin of sortedPlugins) {
            if (plugin.transform) {
                await plugin.transform(root, context);
            }
        }
    }
    return root;
}
/**
 * 默认预设。
 *
 * 包含基础 Markdown 功能和 GFM 扩展（删除线、任务列表、表格）。
 * 这是推荐的默认配置。
 *
 * @returns 解析选项
 *
 * @example
 * ```typescript
 * const ast = await parseMarkdown(markdown, presetDefault());
 * ```
 */
export function presetDefault() {
    return {
        plugins: [],
    };
}
/**
 * GFM（GitHub Flavored Markdown）预设。
 *
 * 包含 GitHub Flavored Markdown 的所有扩展功能：
 * - 删除线（strikethrough）: ~~text~~
 * - 任务列表（task lists）: - [ ] / - [x]
 * - 表格（tables）
 *
 * 注意：当前这些功能已内置启用，此预设主要用于文档和语义化目的。
 *
 * @returns 解析选项
 *
 * @example
 * ```typescript
 * const ast = await parseMarkdown(markdown, presetGFM());
 * ```
 */
export function presetGFM() {
    return {
        plugins: [],
    };
}
//# sourceMappingURL=plugin.js.map