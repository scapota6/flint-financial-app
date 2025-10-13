import { hashPassword } from './server/lib/argon2-utils';

async function main() {
  const password = 'RomaniaArad1!';
  const hash = await hashPassword(password);
  console.log('Password hash:', hash);
}

main();
