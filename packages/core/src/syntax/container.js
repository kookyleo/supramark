import container from 'markdown-it-container';
import { SUPRAMARK_ADMONITION_KINDS, } from '../ast.js';
import { isFeatureEnabled, getFeatureOptionsAs } from '../feature.js';
const customContainerHooks = [];
export function registerContainerHook(hook) {
    customContainerHooks.push(hook);
}
function findContainerHook(name) {
    return customContainerHooks.find(hook => hook.name === name);
}
/**
 * 根据配置，在 MarkdownIt 实例上注册所有需要的容器语法。
 *
 * 当前支持：
 * - Admonition：::: note / ::: warning 等；
 * - HTML Page：:::html；
 * - Map：:::map；
 * - 通过 registerContainerHook() 注册的自定义容器。
 */
export function registerContainerSyntax(md, config) {
    const containerConfig = resolveContainerRuntimeConfig(config);
    // Admonition 容器块
    if (containerConfig.admonitionKinds.length > 0) {
        for (const kind of containerConfig.admonitionKinds) {
            container(md, kind, {});
        }
    }
    // HTML Page 容器（:::html）
    if (containerConfig.htmlEnabled) {
        container(md, 'html', {});
    }
    // Map 容器（:::map）由 feature-map 提供语义解析，这里仅注册语法。
    if (config && isFeatureEnabled(config, '@supramark/feature-map')) {
        container(md, 'map', {});
    }
    // 自定义容器 hook（通过 registerContainerHook 注册的）
    const registeredNames = new Set([
        ...containerConfig.admonitionKinds,
        ...(containerConfig.htmlEnabled ? ['html'] : []),
    ]);
    for (const hook of customContainerHooks) {
        if (!registeredNames.has(hook.name)) {
            container(md, hook.name, {});
            registeredNames.add(hook.name);
        }
    }
}
/**
 * 创建一个容器语法 token 处理器。
 *
 * - 在 parseMarkdown 主循环中调用；
 * - 如果返回 true，表示当前 token 已被容器层消费，调用方应跳过后续处理；
 * - 支持“透明容器”（admonition）和“不透明容器”（html/map）。
 */
export function createContainerTokenProcessor(context) {
    const { config, sourceLines, stack } = context;
    const containerConfig = resolveContainerRuntimeConfig(config);
    // 记录当前是否处于“不透明容器”（例如 html / map）内部：
    // 一旦进入不透明容器，直到对应 close token 之前，所有 token 都会被跳过。
    const opaqueContainerStack = [];
    return (token) => {
        const match = /^container_(.+)_(open|close)$/.exec(token.type);
        if (match) {
            const name = match[1];
            const phase = match[2];
            // Feature 级容器 hook（允许覆盖内置行为）
            const hook = findContainerHook(name);
            if (hook) {
                const hookCtx = {
                    config,
                    sourceLines,
                    stack,
                    token,
                    name,
                    phase,
                };
                if (phase === 'open') {
                    hook.onOpen(hookCtx);
                    if (hook.opaque) {
                        opaqueContainerStack.push(name);
                    }
                }
                else {
                    if (hook.onClose) {
                        hook.onClose(hookCtx);
                    }
                    if (hook.opaque && opaqueContainerStack[opaqueContainerStack.length - 1] === name) {
                        opaqueContainerStack.pop();
                    }
                }
                return true;
            }
            // Admonition 容器块（::: note / ::: warning 等）——透明容器，内部继续按普通 Markdown 解析
            // 现在使用统一的 container 节点，通过 name 字段区分类型
            if (containerConfig.admonitionKinds.includes(name)) {
                if (phase === 'open') {
                    const info = (token.info || '').trim();
                    const parts = info.split(/\s+/);
                    // info 形如 "note 标题..."，去掉第一个单词（容器名），剩余部分作为标题
                    const titleParts = parts.length > 1 ? parts.slice(1) : [];
                    const title = titleParts.length > 0 ? titleParts.join(' ') : undefined;
                    const admonitionContainer = {
                        type: 'container',
                        name: name, // 'note', 'warning', 'tip', etc.
                        params: title,
                        data: { kind: name, title },
                        children: [],
                    };
                    const parentForAdmonition = stack[stack.length - 1];
                    parentForAdmonition.children.push(admonitionContainer);
                    stack.push(admonitionContainer);
                }
                else {
                    const maybeContainer = stack[stack.length - 1];
                    if (maybeContainer.type === 'container' && containerConfig.admonitionKinds.includes(maybeContainer.name)) {
                        stack.pop();
                    }
                }
                return true;
            }
        }
        // 处于不透明容器内部时，跳过所有非容器 token
        if (opaqueContainerStack.length > 0) {
            return true;
        }
        return false;
    };
}
// ----------------------------------------------------------------------------
// 内部工具函数
// ----------------------------------------------------------------------------
function resolveContainerRuntimeConfig(config) {
    let _a;
    const hasConfig = !!config && !!config.features && config.features.length > 0;
    const isFeatureOn = (id) => {
        if (!hasConfig)
            return true;
        return isFeatureEnabled(config, id);
    };
    const result = {
        htmlEnabled: false,
        admonitionKinds: [],
    };
    // Admonition
    if (isFeatureOn('@supramark/feature-admonition')) {
        const adOptions = (_a = getFeatureOptionsAs(config, '@supramark/feature-admonition')) !== null && _a !== void 0 ? _a : {};
        const kinds = adOptions.kinds && adOptions.kinds.length > 0 ? adOptions.kinds : SUPRAMARK_ADMONITION_KINDS;
        result.admonitionKinds = kinds.slice();
    }
    // HTML Page
    if (isFeatureOn('@supramark/feature-html-page')) {
        result.htmlEnabled = true;
    }
    return result;
}
/**
 * 从 container_open token 的信息中提取容器内部原始文本。
 *
 * markdown-it-container 约定：
 * - token.map[0] 为起始行（含 :::name）；
 * - token.map[1] 为结束行之后的行号；
 * - 因此内部内容行范围为 [start + 1, end - 1]。
 */
export function extractContainerInnerText(token, sourceLines) {
    if (!token.map || token.map.length !== 2)
        return '';
    const [start, end] = token.map;
    return sourceLines.slice(start + 1, end).join('\n');
}
//# sourceMappingURL=container.js.map