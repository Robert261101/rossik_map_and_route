// getAllTenders.js
// Node.js helper to fetch ALL tenders (quote requests) from Transporeon
// Requires Node 18+ (native fetch). If using older, install node-fetch.

const BASE_URL = "https://api.transporeon.com"; // adjust if different in your portal

// ---- STEP 1: Get OAuth token (stubbed, update with your creds) ----
async function getTransporeonToken() {
  const clientId = process.env.TP_CLIENT_ID;
  const clientSecret = process.env.TP_CLIENT_SECRET;

  const resp = await fetch(`${BASE_URL}/auth/realms/transporeon/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Auth failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.access_token;
}

// ---- STEP 2: Fetch all tenders with pagination ----
async function fetchAllTenders(token) {
  const tenders = [];
  let page = 0;
  const pageSize = 100; // adjust if API allows larger

  while (true) {
    const url = `${BASE_URL}/freight-procurement/v1/tenders?page=${page}&size=${pageSize}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      throw new Error(`Failed fetching tenders: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();

    if (data.content && data.content.length > 0) {
      tenders.push(...data.content);
      page++;
    } else {
      break; // no more pages
    }
  }

  return tenders;
}

// ---- STEP 3: Exported helper ----
async function getAllTenders() {
  try {
    const token = await getTransporeonToken();
    const allTenders = await fetchAllTenders(token);
    return allTenders;
  } catch (err) {
    console.error("Error in getAllTenders:", err);
    throw err;
  }
}

// Example usage (uncomment to run directly):
// getAllTenders().then(data => console.log(JSON.stringify(data, null, 2)));

module.exports = { getAllTenders };
