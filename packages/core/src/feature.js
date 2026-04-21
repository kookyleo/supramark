/**
 * Supramark Feature Interface System
 *
 * 为每个 Supramark 功能定义顶层接口，递归逐层展开子接口
 *
 * ## 接口定位与演进路径
 *
 * **当前阶段（v0.x）**：
 * - 主要用于**文档、规范、类型定义**层面
 * - 不要求立即接入运行时解析/渲染流程
 * - 是"理想目标架构"，而非"必须立即实现"
 *
 * **核心设计原则**：
 * 1. **渐进式实现**：先定义接口，再逐步接入运行时
 * 2. **规范与实现分离**：Feature 描述"应该是什么"，不强制"如何实现"
 * 3. **向后兼容**：现有 parseMarkdown/render 流程优先，Feature 慢慢替换
 *
 * **关键限制**：
 * - core 包是**纯 TypeScript 类型定义**，不依赖 React/RN
 * - 渲染器的 `render` 函数应该是**类型引用**，不包含 JSX 实现
 * - 真实的 React 组件实现应该在 `@supramark/rn` 和 `@supramark/web` 包中
 *
 * **Feature vs AST 粒度问题**：
 * - 某些场景下，多个 Feature 可能共享同一个 AST 节点类型
 * - 例如：Vega-Lite、Mermaid、PlantUML 都使用 `type: 'diagram'`，通过 `engine` 字段区分
 * - Feature 接口支持通过 `selector` 函数来匹配节点子集
 *
 * @example
 * @example
 * // Feature 定义示例（包括解析器、渲染器、测试）
 * const myFeature: SupramarkFeature<MyNode> = {
 *   metadata: { ... },
 *   syntax: { ast: { ... }, parser: { ... } },
 *   renderers: { rn: { ... }, web: { ... } },
 *   testing: { ... },
 *   documentation: { ... }
 * };
 *
 * @license Apache-2.0
 */
import { warnIfUnknownDiagramEngine } from './ast';
// ============================================================================
// 最小化 Feature 接口
// ============================================================================
/**
 * 最小化 Feature 定义
// ============================================================================
// Feature 注册与发现机制
// ============================================================================

/**
 * Feature 注册表
 *
 * 用于收集和管理所有已定义的 Feature
 */
export class FeatureRegistry {
    /**
     * 注册一个 Feature
     *
     * @param feature - Feature 定义
     * @throws 如果 Feature ID 已存在
     */
    static register(feature) {
        const id = feature.metadata.id;
        if (this.features.has(id)) {
            throw new Error(`Feature "${id}" is already registered`);
        }
        this.features.set(id, feature);
    }
    /**
     * 获取指定 ID 的 Feature
     *
     * @param id - Feature ID
     * @returns Feature 定义，如果不存在则返回 undefined
     */
    static get(id) {
        return this.features.get(id);
    }
    /**
     * 列出所有已注册的 Feature
     *
     * @returns Feature 列表
     */
    static list() {
        return Array.from(this.features.values());
    }
    /**
     * 按标签查找 Feature
     *
     * @param tag - 标签名
     * @returns 包含该标签的所有 Feature
     */
    static findByTag(tag) {
        return this.list().filter(feature => { let _a; return 'tags' in feature.metadata && ((_a = feature.metadata.tags) === null || _a === void 0 ? void 0 : _a.includes(tag)); });
    }
    /**
     * 查找匹配指定 AST 节点的 Feature
     *
     * @param node - AST 节点
     * @returns 匹配的 Feature 列表
     */
    static findByNode(node) {
        return this.list().filter(feature => {
            const ast = feature.syntax.ast;
            // 检查节点类型
            if (ast.type !== node.type) {
                return false;
            }
            // 如果有 selector，使用 selector 进一步过滤
            if (ast.selector) {
                return ast.selector(node);
            }
            return true;
        });
    }
    /**
     * 清空注册表（主要用于测试）
     */
    static clear() {
        this.features.clear();
    }
}
// 注册表内部使用 any，避免对节点类型做过度约束。
// 这样既可以注册针对特定节点子集的 Feature（如 SupramarkDiagramNode），
// 也不会影响外部通过 SupramarkNode 做统一查询。
FeatureRegistry.features = new Map();
// ============================================================================
// 辅助函数
// ============================================================================
/**
 * 创建一个完整 Feature
 *
 * 辅助函数，提供更好的类型推导
 *
 * @param feature - Feature 定义
 * @returns 类型化的 SupramarkFeature
 */
export function defineFeature(feature) {
    return feature;
}
/**
 * 验证 Feature 定义的完整性
 *
 * 对齐 Feature Linter 的规则，提供运行时验证
 *
 * @param feature - Feature 定义
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateFeature(feature, options = {}) {
    let _a, _b, _c;
    const errors = [];
    const metadata = (_a = feature.metadata) !== null && _a !== void 0 ? _a : {};
    const syntax = (_b = feature.syntax) !== null && _b !== void 0 ? _b : {};
    const ast = (_c = syntax.ast) !== null && _c !== void 0 ? _c : {};
    // ============================================================================
    // Critical Rules（错误级别）- 必须通过
    // ============================================================================
    // metadata-id-format
    if (!metadata.id) {
        errors.push({
            code: 'metadata-id-required',
            message: 'Feature must have an id',
            severity: 'error',
        });
    }
    else if (!/^@[\w-]+\/feature-[\w-]+$/.test(metadata.id)) {
        errors.push({
            code: 'metadata-id-format',
            message: 'Feature ID 必须符合 @scope/feature-name 格式（如 @supramark/feature-math）',
            severity: 'error',
        });
    }
    // metadata-version-semver
    if (!metadata.version) {
        errors.push({
            code: 'metadata-version-required',
            message: 'Feature must have a version',
            severity: 'error',
        });
    }
    else if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
        errors.push({
            code: 'metadata-version-semver',
            message: '版本号必须符合语义化版本格式 x.y.z（如 1.0.0）',
            severity: 'error',
        });
    }
    // metadata-name-required
    if (!metadata.name || metadata.name.trim().length === 0) {
        errors.push({
            code: 'metadata-name-required',
            message: 'Feature name 不能为空',
            severity: 'error',
        });
    }
    // ast-type-required
    if (!ast.type || String(ast.type).trim().length === 0) {
        errors.push({
            code: 'ast-type-required',
            message: 'Feature 必须定义 AST 节点 type',
            severity: 'error',
        });
    }
    // ============================================================================
    // Warning Rules（警告级别）- 强烈建议通过
    // ============================================================================
    // metadata-description-required
    if (!metadata.description || metadata.description.trim().length === 0) {
        errors.push({
            code: 'metadata-description-required',
            message: 'Feature description 不能为空',
            severity: 'warning',
        });
    }
    // metadata-author-required
    if (!metadata.author || metadata.author.trim().length === 0) {
        errors.push({
            code: 'metadata-author-required',
            message: 'Feature author 建议填写',
            severity: 'warning',
        });
    }
    // metadata-license-required
    if (!metadata.license) {
        errors.push({
            code: 'metadata-license-required',
            message: 'Feature license 应该设置',
            severity: 'warning',
        });
    }
    else if (metadata.license !== 'Apache-2.0') {
        errors.push({
            code: 'metadata-license-apache',
            message: 'Feature license 应该设置为 Apache-2.0（Supramark 统一许可证）',
            severity: 'info',
        });
    }
    // ast-interface-required-nonempty
    if (ast.interface) {
        const required = ast.interface.required;
        if (!Array.isArray(required) || required.length <= 1) {
            errors.push({
                code: 'ast-interface-required-nonempty',
                message: 'AST interface.required 不应只包含 type，应该包含节点的关键字段',
                severity: 'warning',
            });
        }
    }
    // ast-interface-fields-defined
    if (ast.interface) {
        const required = ast.interface.required || [];
        const fields = ast.interface.fields || {};
        const missingFields = required.filter(field => !(String(field) in fields));
        if (missingFields.length > 0) {
            errors.push({
                code: 'ast-interface-fields-defined',
                message: `AST interface.fields 应该定义所有 required 字段，缺失: ${missingFields.join(', ')}`,
                severity: 'warning',
            });
        }
    }
    // selector-multi-node-with-function
    if (ast.multiNodeNote && !ast.selector) {
        errors.push({
            code: 'selector-multi-node-with-function',
            message: '如果 Feature 处理多节点类型（有 multiNodeNote），应该提供 selector 函数',
            severity: 'warning',
        });
    }
    // ============================================================================
    // Info Rules（建议级别）- 最佳实践
    // ============================================================================
    // metadata-tags-nonempty
    if (!metadata.tags || metadata.tags.length === 0) {
        errors.push({
            code: 'metadata-tags-nonempty',
            message: 'Feature tags 建议添加至少一个标签，用于分类和搜索',
            severity: 'info',
        });
    }
    // ast-examples-provided
    if (!ast.examples || ast.examples.length === 0) {
        errors.push({
            code: 'ast-examples-provided',
            message: 'AST examples 建议提供至少一个示例节点，用于文档和测试',
            severity: 'info',
        });
    }
    // ============================================================================
    // Production Mode Extra Checks
    // ============================================================================
    if (options.production) {
        // 生产模式下，interface 应该是必需的
        if (!ast.interface) {
            errors.push({
                code: 'ast-interface-required-production',
                message: '生产环境的 Feature 必须定义完整的 AST interface',
                severity: 'error',
            });
        }
        // 生产模式下，至少应该有一个渲染器
        if ('renderers' in feature) {
            const renderers = feature.renderers;
            const hasRenderer = renderers && (renderers.rn || renderers.web || renderers.cli);
            if (!hasRenderer) {
                errors.push({
                    code: 'renderers-required-production',
                    message: '生产环境的 Feature 必须定义至少一个平台的渲染器（rn, web, 或 cli）',
                    severity: 'error',
                });
            }
        }
        // 生产模式下，建议有测试
        if (!('testing' in feature) || !feature.testing) {
            errors.push({
                code: 'testing-recommended-production',
                message: '生产环境的 Feature 强烈建议提供测试定义',
                severity: 'warning',
            });
        }
    }
    // ============================================================================
    // 计算最终结果
    // ============================================================================
    // 严格模式下，警告也算错误
    const criticalErrors = errors.filter(e => options.strict ? e.severity !== 'info' : e.severity === 'error');
    return {
        valid: criticalErrors.length === 0,
        errors,
    };
}
/**
 * 从 FeatureRegistry 生成默认配置
 *
 * @param enabledByDefault - 默认是否启用所有 Feature（默认为 true）
 * @returns Supramark 配置对象
 */
export function createConfigFromRegistry(enabledByDefault = true) {
    const features = FeatureRegistry.list().map(feature => ({
        id: feature.metadata.id,
        enabled: enabledByDefault,
    }));
    return {
        features,
        options: {
            cache: true,
            strict: false,
        },
    };
}
/**
 * 从配置中获取启用的 Feature ID 列表
 *
 * @param config - Supramark 配置
 * @returns 启用的 Feature ID 数组
 */
export function getEnabledFeatureIds(config) {
    return (config.features || []).filter(f => f.enabled).map(f => f.id);
}
/**
 * 获取启用的 Feature 定义列表
 *
 * @param config - Supramark 配置
 * @returns 启用的 Feature 定义数组
 */
export function getEnabledFeatures(config) {
    const enabledIds = getEnabledFeatureIds(config);
    return enabledIds
        .map(id => FeatureRegistry.get(id))
        .filter((f) => f !== undefined);
}
/**
 * 检查特定 Feature 是否已启用
 *
 * @param config - Supramark 配置
 * @param featureId - Feature ID
 * @returns 是否启用
 */
export function isFeatureEnabled(config, featureId) {
    let _a, _b;
    const featureConfig = (_a = config.features) === null || _a === void 0 ? void 0 : _a.find(f => f.id === featureId);
    return (_b = featureConfig === null || featureConfig === void 0 ? void 0 : featureConfig.enabled) !== null && _b !== void 0 ? _b : false;
}
const DIAGRAM_FEATURE_IDS_BY_FAMILY = {
    mermaid: ['@supramark/feature-mermaid'],
    plantuml: ['@supramark/feature-diagram-plantuml'],
    'vega-family': ['@supramark/feature-diagram-vega-lite'],
    echarts: ['@supramark/feature-diagram-echarts'],
    'graphviz-family': ['@supramark/feature-diagram-dot'],
};
/**
 * 将 diagram engine 归类到当前支持的 feature family。
 *
 * 当前约定：
 * - mermaid
 * - plantuml
 * - vega-family（vega / vega-lite / chart / chartjs）
 * - echarts
 * - graphviz-family（dot / graphviz）
 */
export function getDiagramFeatureFamily(engine) {
    const normalized = String(engine).toLowerCase();
    if (normalized === 'mermaid') {
        return 'mermaid';
    }
    if (normalized === 'plantuml') {
        return 'plantuml';
    }
    if (normalized === 'vega' ||
        normalized === 'vega-lite' ||
        normalized === 'chart' ||
        normalized === 'chartjs') {
        return 'vega-family';
    }
    if (normalized === 'echarts') {
        return 'echarts';
    }
    if (normalized === 'dot' || normalized === 'graphviz') {
        return 'graphviz-family';
    }
    return null;
}
/**
 * 将 diagram engine 映射到对应的 feature id 列表。
 */
export function getDiagramFeatureIdsForEngine(engine) {
    const family = getDiagramFeatureFamily(engine);
    if (!family) {
        return [];
    }
    return [...DIAGRAM_FEATURE_IDS_BY_FAMILY[family]];
}
/**
 * 判断一组 Feature ID 是否被启用。
 *
 * 约定：
 * - 未提供 config 或 config.features 为空 → 视为全部启用；
 * - 如果 config 中根本没有提到这些 ID → 视为使用默认行为（启用）；
 * - 一旦显式配置了其中任意一个 ID，则以配置为准，只要有一个 enabled:true 就认为启用。
 */
export function isFeatureGroupEnabled(config, ids) {
    if (!config || !config.features || config.features.length === 0) {
        return true;
    }
    const hasAny = ids.some(id => config.features.some(f => f.id === id));
    if (!hasAny) {
        return true;
    }
    return ids.some(id => isFeatureEnabled(config, id));
}
/**
 * 根据配置判断某个 diagram engine 是否被启用。
 */
export function isDiagramFeatureEnabled(config, engine, context) {
    const ids = getDiagramFeatureIdsForEngine(engine);
    if (!ids.length) {
        warnIfUnknownDiagramEngine(engine, context);
        return true;
    }
    return isFeatureGroupEnabled(config, ids);
}
/**
 * 获取 Feature 的配置选项
 *
 * @param config - Supramark 配置
 * @param featureId - Feature ID
 * @returns Feature 配置选项，如果未配置则返回空对象
 */
export function getFeatureOptions(config, featureId) {
    let _a;
    const featureConfig = (_a = config.features) === null || _a === void 0 ? void 0 : _a.find(f => f.id === featureId);
    const raw = featureConfig === null || featureConfig === void 0 ? void 0 : featureConfig.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    return raw;
}
/**
 * 以强类型方式获取 Feature 配置选项。
 *
 * - 返回值类型由调用方通过泛型参数决定；
 * - 如果未配置对应 Feature，返回 undefined。
 */
export function getFeatureOptionsAs(config, featureId) {
    let _a;
    if (!config || !config.features || config.features.length === 0) {
        return undefined;
    }
    const featureConfig = config.features.find(f => f.id === featureId);
    return ((_a = featureConfig === null || featureConfig === void 0 ? void 0 : featureConfig.options) !== null && _a !== void 0 ? _a : undefined);
}
//# sourceMappingURL=feature.js.map