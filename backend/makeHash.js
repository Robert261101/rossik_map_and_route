// backend/makeHash.js
const bcrypt = require('bcrypt');
(async () => {
  const plain = "Start123!";
  const hash  = await bcrypt.hash(plain, 10);
  process.exit(0);
})();

