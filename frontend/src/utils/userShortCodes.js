// Email -> abreviere (ER1, JB1, AIM1 etc.)

// TODO: add this into database and take the short codes from there, not here
export const USER_SHORT_CODES = {
  "erwin.rossik@rossik.eu": "ER1",
  "jessika.birsan@rossik.eu": "JB1",
  "laura.demian@rossik.eu": "LD2",
  "dragana.petra@rossik.eu": "DP1",
  "catalin.ivan@rossik.eu": "CI1",
  "mihaela.balogh@rossik.eu": "MB1",
  "claudiu.negura@rossik.eu": "CN1",
  "aleksandar.misic@rossik.eu": "AM2",
  "alexandru.moldovan@rossik.eu": "AIM1",
  "marius.gagiu@rossik.eu": "MG2",
  "sebastian.appesbacher@rossik.eu": "SA1",
  "mario.tudosa@rossik.eu": "MT1",
  "lukas.dolezal@rossik.eu": "LD1",          // LD2 e deja Laura Demian
  "philipp.kollersberger@rossik.eu": "PK1",
  "petr.vagner@rossik.eu": "PV1",
  "gabriel.deac@rossik.eu": "GD1",
  "patrik.szilagyi@rossik.eu": "PS1",
  "almir.causevic@rossik.eu": "AC1",
  "mert.aksoy@rossik.eu": "MA1",
  "dan.calciu@rossik.eu": "DC1",
  "vanessa.redl@rossik.eu": "VR1",         // al doilea „VR”
  "filip.lukic@rossik.eu": "FL1",
  "bogdan.ilies@rossik.eu": "BI1",
  "gordana.domaneant@rossik.eu": "GD2",
  "sorina.stroia@rossik.eu": "SS1",
  "sebastian.adam@rossik.eu": "SA2"
  // adaugi restul aici...
};

// helper fallback: ia inițialele + '0' dacă nu găsește
export function shortCodeFor(email) {
  const key = (email || "").trim().toLowerCase();
  if (USER_SHORT_CODES[key]) return USER_SHORT_CODES[key];
  const local = key.split("@")[0] || "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "XX";
  return `${initials}1`;
}

const inverseMap = Object.entries(USER_SHORT_CODES)
  .reduce((acc, [email, code]) => {
    const name = email.split("@")[0]
      .split(".")
      .map(p => p[0]?.toUpperCase() + p.slice(1))
      .join(" ");
    acc[code] = name;
    return acc;
  }, {});

export function fullNameForShortCode(code) {
  return inverseMap[code] || code; // fallback: return codul dacă nu găsește
}
