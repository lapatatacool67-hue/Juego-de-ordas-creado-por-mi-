import type { UpgradeId, UpgradeOption } from './types';

export const UPGRADE_CATALOG: Record<UpgradeId, UpgradeOption> = {
  ap_ammo: {
    id: 'ap_ammo',
    category: 'weapon',
    name: 'Munición Perforante',
    subtitle: 'Mejora de arma',
    description: 'Proyectiles con núcleo de tungsteno que atraviesan blindaje y cráneos.',
    bonusLabel: '+32% daño de bala',
  },
  extended_mags: {
    id: 'extended_mags',
    category: 'weapon',
    name: 'Cargadores Ampliados',
    subtitle: 'Mejora de arma',
    description: 'Mayor capacidad de munición en todas las armas y recarga táctica veloz.',
    bonusLabel: '+50% cargador · +30% recarga',
  },
  thermobaric_grenades: {
    id: 'thermobaric_grenades',
    category: 'weapon',
    name: 'Granadas Termobáricas',
    subtitle: 'Mejora de explosivos',
    description: 'Cargas de alto poder expansivo con mayor radio de detonación.',
    bonusLabel: '+2 granadas · +45% daño y radio',
  },
  stabilized_barrel: {
    id: 'stabilized_barrel',
    category: 'weapon',
    name: 'Cañón Estabilizado',
    subtitle: 'Mejora de arma',
    description: 'Compensador de gases que acelera la cadencia y reduce el retroceso.',
    bonusLabel: '+22% cadencia · -35% retroceso',
  },
  hollow_point: {
    id: 'hollow_point',
    category: 'weapon',
    name: 'Punta Hueca Crítica',
    subtitle: 'Mejora de arma',
    description: 'Munición expansiva calibrada para destrozar puntos débiles y cabezas.',
    bonusLabel: '+40% daño en cabeza',
  },
  steady_grip: {
    id: 'steady_grip',
    category: 'weapon',
    name: 'Empuñadura Táctica',
    subtitle: 'Mejora de arma',
    description: 'Agarre ergonómico de precisión que cierra la mira y estabiliza ráfagas.',
    bonusLabel: '-40% dispersión · -30% retroceso',
  },
  cluster_grenades: {
    id: 'cluster_grenades',
    category: 'weapon',
    name: 'Granada de Choque',
    subtitle: 'Mejora de explosivos',
    description: 'Ondas expansivas aturdidoras que paralizan a los enemigos alcanzados.',
    bonusLabel: '+1 granada · Aturde enemigos 2s',
  },
  tactical_boots: {
    id: 'tactical_boots',
    category: 'skill',
    name: 'Botas de Asalto',
    subtitle: 'Mejora de habilidad',
    description: 'Aumenta tu velocidad de carrera, esprint y potencia de salto.',
    bonusLabel: '+24% velocidad · +15% salto',
  },
  reinforced_armor: {
    id: 'reinforced_armor',
    category: 'skill',
    name: 'Chaleco Balístico',
    subtitle: 'Mejora de habilidad',
    description: 'Placas cerámicas del Coronel que amplían tu salud máxima y curan al máximo.',
    bonusLabel: '+45 salud máx. · Curación total',
  },
  combat_vampirism: {
    id: 'combat_vampirism',
    category: 'skill',
    name: 'Adrenalina de Combate',
    subtitle: 'Mejora de habilidad',
    description: 'Cada enemigo eliminado restaura salud y otorga +1 granada inmediata.',
    bonusLabel: '+10 salud por baja · +1 granada',
  },
  rapid_dash: {
    id: 'rapid_dash',
    category: 'skill',
    name: 'Propulsores de Dash',
    subtitle: 'Mejora de habilidad',
    description: 'Sobrecarga tu esquiva lateral con Ctrl para encadenar maniobras evasivas.',
    bonusLabel: '-45% recarga dash · +25% impulso',
  },
  regen_serum: {
    id: 'regen_serum',
    category: 'skill',
    name: 'Suero Regenerador',
    subtitle: 'Mejora de habilidad',
    description: 'Nanofibras médicas que regeneran tu salud tras evitar daño durante 3 segundos.',
    bonusLabel: '+4 PS/seg tras 3s sin daño',
  },
};

const ALL_UPGRADE_IDS: UpgradeId[] = Object.keys(UPGRADE_CATALOG) as UpgradeId[];

export const CORONEL_TENT_GREETINGS: Record<number, string> = {
  1: '¡Bienvenido a mi carpa, recluta! Elige tu primera mejora antes de que avance la primera horda.',
  2: '¡Magnífica resistencia! Atención: empiezan a llegar enemigos mejorados (Mini-Jefes). Equípate bien.',
  3: '¡Buen trabajo! La tercera oleada trae más Mini-Jefes blindados. Toma nuevos suministros de la carpa.',
  4: '¡Resiste un asalto más! Penúltima horda con escuadrones pesados antes del Jefe Final.',
  5: '¡Alerta máxima! Horda 5: se acerca el Jefe final de la zona y su guardia de Mini-Jefes. Equípate al máximo.',
};

export function pickTentUpgradeOptions(ownedIds: UpgradeId[], wave: number): UpgradeOption[] {
  const unownedWeapons = ALL_UPGRADE_IDS.filter(
    (id) => UPGRADE_CATALOG[id].category === 'weapon' && !ownedIds.includes(id)
  );
  const unownedSkills = ALL_UPGRADE_IDS.filter(
    (id) => UPGRADE_CATALOG[id].category === 'skill' && !ownedIds.includes(id)
  );

  const chosen: UpgradeId[] = [];
  if (unownedWeapons.length > 0) {
    const idx = (wave * 3 + ownedIds.length) % unownedWeapons.length;
    chosen.push(unownedWeapons[idx]);
  }
  if (unownedSkills.length > 0) {
    const idx = (wave * 2 + ownedIds.length) % unownedSkills.length;
    chosen.push(unownedSkills[idx]);
  }

  const remaining = ALL_UPGRADE_IDS.filter(
    (id) => !ownedIds.includes(id) && !chosen.includes(id)
  );
  while (chosen.length < 3 && remaining.length > 0) {
    const pickIdx = (wave * 5 + chosen.length + ownedIds.length) % remaining.length;
    chosen.push(remaining.splice(pickIdx, 1)[0]);
  }

  while (chosen.length < 3) {
    const fallback = ALL_UPGRADE_IDS[chosen.length % ALL_UPGRADE_IDS.length];
    if (!chosen.includes(fallback)) chosen.push(fallback);
    else break;
  }

  return chosen.map((id) => UPGRADE_CATALOG[id]);
}
