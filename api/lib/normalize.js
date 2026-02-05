/**
 * 광고 문구 전처리 (Normalization) - 프론트 js/normalize.js와 동일 로직
 */
function run(text) {
  if (typeof text !== 'string') return '';
  let t = text;
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/❌|✕|×/g, ' x ');
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/[!?.,;:·\-–—]/g, ' ');
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/\s*퍼\s*센\s*트\s*/gi, '%');
  t = t.replace(/\s*%\s*/g, '%');
  t = t.trim();
  if (t.toLowerCase) t = t.toLowerCase();
  return t;
}

module.exports = { run };
