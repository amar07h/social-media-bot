import fs from 'fs';

export function getRandomName() {
  const data = fs.readFileSync('data/names.txt', 'utf-8');
  const names = data.split('\n').filter(Boolean);
  const index = Math.floor(Math.random() * names.length);
  return names[index];
}
