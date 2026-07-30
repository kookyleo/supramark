/**
 * Weather 模拟数据派生（共享层）
 *
 * 仅包含与平台无关的派生逻辑（温度 / 湿度 / 风速 / condition 索引）。
 * condition 的具体表示（web 语义 key / RN emoji）由各 runtime 自行映射，
 * 不在本模块内耦合 —— 见 runtime.web.tsx 的 WEB_CONDITIONS 与
 * runtime.rn.tsx 的 RN_CONDITIONS。
 *
 * 实际应用应替换为真实天气 API 调用。
 *
 * @packageDocumentation
 */

/**
 * getMockWeather 返回结构
 */
export interface MockWeather {
  /** 温度（已按 units 换算） */
  temp: number;
  /** 温度单位标签，如 '°C' / '°F' */
  unit: string;
  /**
   * condition 索引（0..2），由 location 哈希派生。
   * 各 runtime 用自己的 conditions 数组映射为平台表示。
   */
  conditionIndex: number;
  /** 湿度（%） */
  humidity: number;
  /** 风速（已按 units 换算） */
  wind: number;
  /** 风速单位标签，如 'km/h' / 'mph' */
  windUnit: string;
}

/**
 * 根据城市名生成确定性模拟天气数据
 *
 * 同一 location 始终派生出相同结果（纯函数，无副作用）。
 */
export function getMockWeather(
  location: string,
  units: 'metric' | 'imperial' = 'metric',
): MockWeather {
  // 根据城市名生成伪随机哈希
  const hash = location.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseTemp = 15 + (hash % 20);
  const temp = units === 'imperial' ? Math.round(baseTemp * 1.8 + 32) : baseTemp;
  const unit = units === 'imperial' ? '°F' : '°C';

  const conditionIndex = hash % 3;

  const humidity = 40 + (hash % 40);
  const wind = 5 + (hash % 20);
  const windUnit = units === 'imperial' ? 'mph' : 'km/h';

  return { temp, unit, conditionIndex, humidity, wind, windUnit };
}
