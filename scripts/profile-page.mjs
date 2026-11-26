// Gör en egen kopia av appen för profillänkar (/spelare/<spelar-ID>) med egen
// titel och text i länkförhandsvisningen ("Lägg till mig på Pubgolf Links").
// Firebase Hosting skickar /spelare/** hit (firebase.json). Appen i sig är densamma.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
const title = 'Lägg till mig på Pubgolf Links';
const desc = 'Tryck på länken och lägg till mig – sen kan vi bjuda in varandra till rundor och psyka varandra i lobbyn.';

const out = src
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
  .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`);

if (out === src) throw new Error('profile-page: hittade inga metataggar att byta');
writeFileSync('dist/spelare.html', out);
console.log('profile-page: dist/spelare.html skapad');
