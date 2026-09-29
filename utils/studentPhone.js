// Aceita celular com DDD, com ou sem +55, e salva sempre no mesmo formato.
const areaCodes = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87',
  '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

function normalizeStudentPhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d\s()-]+$/.test(value.trim())) return value;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (value.trim().startsWith('+') && value.replace(/\D/g, '').length !== 13) return value;
  if (!/^\d{2}9\d{8}$/.test(digits) || !areaCodes.has(digits.slice(0, 2))) return value;
  return `+55${digits}`;
}

function isStudentPhone(value) {
  return typeof value === 'string' && /^\+55\d{2}9\d{8}$/.test(value)
    && areaCodes.has(value.slice(3, 5));
}

module.exports = { normalizeStudentPhone, isStudentPhone };
