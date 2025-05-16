// backend/makeHash.js
const bcrypt = require('bcrypt');
(async () => {
  const plain = "Start123!";
  const hash  = await bcrypt.hash(plain, 10);
  console.log(plain);
  console.log(hash);

  process.exit(0);
})();

