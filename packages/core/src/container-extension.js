/**
 * 解析 :::name 后面的参数字符串。
 *
 * 规则：
 * - 支持多个键："a=1 b=two flag" -> { a: "1", b: "two", flag: true }
 * - 支持引号：title="Hello World" / title='Hello World'
 * - true/false（大小写不敏感）会转换成 boolean
 * - 不做 number coercion（"1" 保持 string）
 */
export function parseContainerParams(raw) {
    const text = (raw !== null && raw !== void 0 ? raw : '').trim();
    const values = {};
    if (!text)
        return { raw: '', values };
    // 简单 tokenizer：支持双引号/单引号包裹的 value
    const tokens = [];
    let cur = '';
    let quote = null;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (ch === quote) {
                quote = null;
            }
            else {
                cur += ch;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (/\s/.test(ch)) {
            if (cur) {
                tokens.push(cur);
                cur = '';
            }
            continue;
        }
        cur += ch;
    }
    if (cur)
        tokens.push(cur);
    for (const t of tokens) {
        const eq = t.indexOf('=');
        if (eq === -1) {
            values[t] = true;
            continue;
        }
        const k = t.slice(0, eq);
        const v = t.slice(eq + 1);
        const lower = v.toLowerCase();
        if (lower === 'true')
            values[k] = true;
        else if (lower === 'false')
            values[k] = false;
        else
            values[k] = v;
    }
    return { raw: text, values };
}
//# sourceMappingURL=container-extension.js.map