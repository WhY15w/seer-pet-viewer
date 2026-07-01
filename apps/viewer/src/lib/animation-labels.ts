export const ANIMATION_LABELS: Record<string, string> = {
  standby: "待机",
  await: "待机",
  attack: "物攻",
  sa: "特攻",
  cp: "属性",
  hited: "受击",
  appear: "出场",
  transform: "变身",
  hidemove: "第五技能",
};

export function getAnimationLabel(key: string): string {
  return ANIMATION_LABELS[key] ?? key;
}
