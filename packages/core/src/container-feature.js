/**
 * Container Feature 统一接口
 *
 * 为 :::xxx 容器类型的 Feature 定义精简、实用的接口规范。
 * 合并了原来分散在 feature.ts / extension.ts / syntax.ts 中的定义。
 *
 * ## 设计原则
 * - 每个字段都有明确的消费方
 * - 没有冗余，没有废话
 * - containerNames 全局唯一，由 feature:lint 检查
 *
 * @packageDocumentation
 */
// ============================================================================
// 验证函数
// ============================================================================
/**
 * 验证 ContainerFeature 实现的完整性
 *
 * @param feature - Feature 定义
 * @returns 验证结果
 */
export function validateContainerFeature(feature) {
    const errors = [];
    // 必填字段检查
    if (!feature.id) {
        errors.push({ code: 'id-required', message: 'Feature must have an id' });
    }
    else if (!/^@[\w-]+\/feature-[\w-]+$/.test(feature.id)) {
        errors.push({
            code: 'id-format',
            message: 'Feature id must match @scope/feature-name format',
        });
    }
    if (!feature.name || feature.name.trim().length === 0) {
        errors.push({ code: 'name-required', message: 'Feature must have a name' });
    }
    if (!feature.version) {
        errors.push({ code: 'version-required', message: 'Feature must have a version' });
    }
    else if (!/^\d+\.\d+\.\d+$/.test(feature.version)) {
        errors.push({
            code: 'version-format',
            message: 'Feature version must be semver format (x.y.z)',
        });
    }
    if (!feature.containerNames || feature.containerNames.length === 0) {
        errors.push({
            code: 'containerNames-required',
            message: 'Feature must define at least one containerName',
        });
    }
    if (typeof feature.registerParser !== 'function') {
        errors.push({
            code: 'registerParser-required',
            message: 'Feature must have a registerParser function',
        });
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=container-feature.js.map