import { AI_ML_MODELS, AI_ML_CATEGORIES } from '../src/constants/aiMl';
import { AI_ML_LANGUAGES, AI_ML_STAGES } from '../src/constants/aiMl/types';

let missing = 0, present = 0;
for (const m of AI_ML_MODELS) {
  for (const l of AI_ML_LANGUAGES) {
    for (const s of AI_ML_STAGES) {
      const sample = m.implementations[l.id]?.[s.id];
      if (!sample || !sample.code.trim()) { missing++; console.log(`  MISSING ${m.slug} ${l.id}/${s.id}`); }
      else present++;
    }
  }
}
console.log(`\nCode samples: ${present} present, ${missing} missing (${AI_ML_MODELS.length} models x 9)`);
console.log(`\nPer category (authored / planned):`);
const planned: Record<string, number> = {
  'classical-ml': 22, 'deep-learning': 22, 'generative-ai': 14, 'reinforcement-learning': 15,
};
for (const c of AI_ML_CATEGORIES) {
  const n = AI_ML_MODELS.filter(m => m.category === c.id).length;
  console.log(`  ${String(n).padStart(2)} / ${planned[c.id]}   ${c.label}`);
}
console.log(`\nTOTAL: ${AI_ML_MODELS.length} / 73 models`);
console.log(`\nGroups with no models yet:`);
for (const c of AI_ML_CATEGORIES) {
  for (const g of c.groups) {
    const n = AI_ML_MODELS.filter(m => m.category === c.id && m.group === g.id).length;
    if (n === 0) console.log(`  ${c.id}/${g.id}`);
  }
}
