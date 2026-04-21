import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { isDiagramFenceLanguage } from './syntax/fence.js';
const processor = unified().use(remarkParse).use(remarkGfm);
function createRoot() {
    return {
        type: 'root',
        children: [],
    };
}
function mapMdastNode(node) {
    let _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    switch (node.type) {
        case 'paragraph': {
            const paragraph = {
                type: 'paragraph',
                children: [],
            };
            paragraph.children = ((_a = node.children) !== null && _a !== void 0 ? _a : [])
                .map(mapMdastInline)
                .flat()
                .filter(Boolean);
            return paragraph;
        }
        case 'heading': {
            const depth = (_b = node.depth) !== null && _b !== void 0 ? _b : 1;
            const heading = {
                type: 'heading',
                depth: (depth >= 1 && depth <= 6 ? depth : 1),
                children: [],
            };
            heading.children = ((_c = node.children) !== null && _c !== void 0 ? _c : [])
                .map(mapMdastInline)
                .flat()
                .filter(Boolean);
            return heading;
        }
        case 'text': {
            const text = {
                type: 'text',
                value: (_d = node.value) !== null && _d !== void 0 ? _d : '',
            };
            return text;
        }
        case 'inlineCode': {
            const code = {
                type: 'code',
                value: (_e = node.value) !== null && _e !== void 0 ? _e : '',
            };
            return code;
        }
        case 'code': {
            const lang = (_f = node.lang) !== null && _f !== void 0 ? _f : undefined;
            const meta = (_g = node.meta) !== null && _g !== void 0 ? _g : undefined;
            if (isDiagramFenceLanguage(lang)) {
                const diagram = {
                    type: 'diagram',
                    engine: lang.toLowerCase(),
                    code: (_h = node.value) !== null && _h !== void 0 ? _h : '',
                    meta: meta ? { raw: meta } : undefined,
                };
                return diagram;
            }
            const codeBlock = {
                type: 'code',
                value: (_j = node.value) !== null && _j !== void 0 ? _j : '',
                lang,
                meta,
            };
            return codeBlock;
        }
        case 'list': {
            const list = {
                type: 'list',
                ordered: !!node.ordered,
                start: typeof node.start === 'number' ? node.start : null,
                tight: node.spread === undefined ? undefined : !node.spread,
                children: [],
            };
            list.children = (_k = node.children) === null || _k === void 0 ? void 0 : _k.map(item => mapMdastNode(item)).filter(Boolean);
            return list;
        }
        case 'listItem': {
            const listItem = {
                type: 'list_item',
                checked: node.checked === undefined ? undefined : !!node.checked,
                children: [],
            };
            listItem.children = (_l = node.children) === null || _l === void 0 ? void 0 : _l.map(child => mapMdastNode(child)).filter(Boolean);
            return listItem;
        }
        default: {
            const anyNode = node;
            if (anyNode.children && anyNode.children.length > 0) {
                const flattened = anyNode.children
                    .map(child => mapMdastNode(child))
                    .filter(Boolean);
                if (flattened.length === 1) {
                    return flattened[0];
                }
                const paragraph = {
                    type: 'paragraph',
                    children: flattened,
                };
                return paragraph;
            }
            return null;
        }
    }
}
function mapMdastInline(node) {
    if (node.type === 'text' || node.type === 'inlineCode') {
        const mapped = mapMdastNode(node);
        return mapped ? [mapped] : [];
    }
    const anyNode = node;
    if (anyNode.children && anyNode.children.length > 0) {
        return anyNode.children.map(mapMdastInline).flat();
    }
    const mapped = mapMdastNode(node);
    return mapped ? [mapped] : [];
}
export async function parseMarkdownWithRemark(markdown, options = {}) {
    let _a, _b;
    const mdast = processor.parse(markdown);
    const root = createRoot();
    root.children = (_a = mdast.children) === null || _a === void 0 ? void 0 : _a.map(child => mapMdastNode(child)).filter(Boolean);
    // 初始化插件上下文
    const context = {
        source: markdown,
        data: {}, // 插件共享数据存储
    };
    // 执行插件（注意：remark 暂不支持依赖排序，按顺序执行）
    // TODO: 将 sortPluginsByDependencies 移到独立文件并在这里使用
    const plugins = (_b = options.plugins) !== null && _b !== void 0 ? _b : [];
    for (const plugin of plugins) {
        if (plugin.transform) {
            await plugin.transform(root, context);
        }
    }
    return root;
}
//# sourceMappingURL=remark.js.map