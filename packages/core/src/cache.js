/**
 * LRU (Least Recently Used) 缓存实现
 * 用于缓存图表渲染结果等计算密集型操作的结果
 */
/**
 * LRU 缓存类
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string>({ maxSize: 100, ttl: 60000 });
 *
 * // 存入缓存
 * cache.set('key1', 'value1');
 *
 * // 读取缓存
 * const value = cache.get('key1'); // 'value1'
 *
 * // 检查是否存在
 * const exists = cache.has('key1'); // true
 *
 * // 清除缓存
 * cache.clear();
 * ```
 */
export class LRUCache {
    constructor(options = {}) {
        let _a, _b;
        this.totalSize = 0;
        this.cache = new Map();
        this.maxSize = (_a = options.maxSize) !== null && _a !== void 0 ? _a : 100;
        this.ttl = options.ttl;
        this.sizeCalculator =
            (_b = options.sizeCalculator) !== null && _b !== void 0 ? _b : (value => {
                try {
                    return JSON.stringify(value).length;
                }
                catch {
                    return 1;
                }
            });
    }
    /**
     * 获取缓存项
     * @param key 缓存键
     * @returns 缓存值，如果不存在或已过期则返回 undefined
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // 检查是否过期
        if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.totalSize -= entry.size;
            return undefined;
        }
        // LRU: 将访问的项移到最后（Map 的插入顺序）
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    /**
     * 设置缓存项
     * @param key 缓存键
     * @param value 缓存值
     */
    set(key, value) {
        // 如果已存在，先删除旧值
        const existingEntry = this.cache.get(key);
        if (existingEntry) {
            this.totalSize -= existingEntry.size;
            this.cache.delete(key);
        }
        const size = this.sizeCalculator(value);
        const entry = {
            value,
            timestamp: Date.now(),
            size,
        };
        // 添加新条目
        this.cache.set(key, entry);
        this.totalSize += size;
        // 如果超过最大容量，删除最旧的条目（Map 的第一个）
        while (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                const firstEntry = this.cache.get(firstKey);
                if (firstEntry) {
                    this.totalSize -= firstEntry.size;
                }
                this.cache.delete(firstKey);
            }
        }
    }
    /**
     * 检查缓存中是否存在指定键
     * @param key 缓存键
     * @returns 是否存在且未过期
     */
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * 删除缓存项
     * @param key 缓存键
     * @returns 是否成功删除
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.totalSize -= entry.size;
        }
        return this.cache.delete(key);
    }
    /**
     * 清空所有缓存
     */
    clear() {
        this.cache.clear();
        this.totalSize = 0;
    }
    /**
     * 获取当前缓存的条目数量
     */
    get size() {
        return this.cache.size;
    }
    /**
     * 获取所有缓存键
     */
    keys() {
        return this.cache.keys();
    }
    /**
     * 获取缓存统计信息
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            totalSize: this.totalSize,
            ttl: this.ttl,
        };
    }
    /**
     * 清理过期的缓存项
     * @returns 清理的条目数量
     */
    purgeExpired() {
        if (!this.ttl) {
            return 0;
        }
        let count = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.totalSize -= entry.size;
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
}
/**
 * 生成缓存键的辅助函数
 * @param parts 键的组成部分
 * @returns 缓存键
 */
export function createCacheKey(...parts) {
    return parts
        .filter(part => part !== null && part !== undefined)
        .map(part => String(part))
        .join(':');
}
/**
 * 简单的哈希函数（用于生成短缓存键）
 * @param str 输入字符串
 * @returns 哈希值
 */
export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
//# sourceMappingURL=cache.js.map