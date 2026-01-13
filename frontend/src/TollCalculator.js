import { useEffect, useState, useRef, useCallback, useMemo } from "react";

// Caching pentru prețurile de rovinietă (dacă este necesar)
let rovinietaPricesCache = null;

const normalize = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Your “contract price” rules
const CONTRACT_TOLLS = [
  {
    id: "MONTBLANC_290",
    fixedCostEUR: 290,
    // match on any of: fare name, toll system name, collection location names
    match: ({ name, tollSystem, locations, country }) => {
      const hay = normalize([name, tollSystem, ...(locations || [])].join(" | "));

      return (
        country === "FRA" || country === "ITA" || country === "CHE" // optional: keep loose
      ) && (
        hay.includes("mont blanc") ||
        hay.includes("tunnel du mont") ||
        hay.includes("tunnel") && hay.includes("mont") ||
        hay.includes("sftrf") // ⚠️ remove this if it catches Frejus etc.
      );
    },
    popupText: "Mont Blanc contract applied: fixed price €290.",
  }
];


const fetchRovinietaPrices = async () => {
  if (rovinietaPricesCache) return rovinietaPricesCache;
  try {
    const response = await fetch("/rovinieta-prices.json");
    rovinietaPricesCache = await response.json();
    return rovinietaPricesCache;
  } catch (error) {
    console.error("Error fetching rovinieta prices:", error);
    return null;
  }
};

const countryCalculators = {
  ROU: async (tollData, _duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    // Try to use the specific axle count, but fall back to "5" if not available
    const vehiclePrices = (pricesData && pricesData.ROU && pricesData.ROU[vehicleAxles]) 
      || pricesData?.ROU?.["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with", vehicleAxles, "axles, using default for ROU.");
      return { cost: 11.0 };
    }
    // Always use the 1-day toll cost
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice };
  },
  NLD: async (tollData, _duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    const vehiclePrices = (pricesData && pricesData.NLD && pricesData.NLD[vehicleAxles])
      || pricesData?.NLD?.["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with", vehicleAxles, "axles, using default for NLD.");
      return { cost: 12.0 };
    }
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice };
  },
  LUX: async (tollData, _duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    const vehiclePrices = (pricesData && pricesData.LUX && pricesData.LUX[vehicleAxles])
      || pricesData?.LUX?.["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with", vehicleAxles, "axles, using default for LUX.");
      return { cost: 12.0 };
    }
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice };
  },
  DEU: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  HUN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  AUT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  FRA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  ITA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  SVN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  SVK: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  PRT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  ESP: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  BEL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  POL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  CZE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  },
  CHE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost };
  }
};

const exchangeRates = async () => {
  const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
  const data = await response.json();
  return data.rates || {};
};

const convertToEuro = async (amount, currency) => {
  if (typeof amount !== "number") {
    console.warn("Invalid amount for conversion:", amount);
    return 0;
  }
  const rates = await exchangeRates();
  if (!rates[currency]) {
    console.error(`Exchange rate for ${currency} is not available.`);
    return amount;
  }
  return currency === "EUR" ? amount : amount / rates[currency];
};


const TollCalculator = ({
    routeIndex = 0,
    startCoordinates,
    endCoordinates,
    intermediatePoints = [],
    vehicleType,
    rawDuration,
    rawDistance,
    onTollUpdate,
    selectedRoute, // Dacă este transmis, folosim această rută pentru calculul taxelor
  }) => {
    const [, setTollDetails] = useState({ totalCost: 0, tollList: [] });
    // Folosim un useRef pentru a reține id-urile rutelor deja procesate
    const processedRoutes = useRef(new Set());

    const applyContractOverride = ({ name, tollSystem, locations, country, cost }) => {
    for (const rule of CONTRACT_TOLLS) {
      if (rule.match({ name, tollSystem, locations, country })) {
        return { cost: rule.fixedCostEUR, contractId: rule.id, popupText: rule.popupText };
      }
    }
    return null;
  };

  // Fallback pentru procesarea taxelor din array-ul "tolls" - memoized
  const processTollsFallback = useCallback(async (route) => {
    let tollMap = {};
    if (!route.sections) return [];
    
    for (const section of route.sections) {
      if (section.tolls && section.tolls.length > 0) {
        for (const toll of section.tolls) {
          const countryCode = toll.countryCode;
          if (toll.pass?.returnJourney) continue;
          // Dacă nu există tarife în toll.fares, folosim numele din toll.tollSystem (acum cu înlocuire)
          if ((!toll.fares || toll.fares.length === 0) && countryCode && countryCalculators[countryCode]) {
            const dummyFare = {
              name: toll.tollSystem ? toll.tollSystem : `${countryCode}`,
              price: { value: 0, currency: "EUR" }
            };

            const sectionMetric = (section.summary?.length || 0);
            const result = await countryCalculators[countryCode](dummyFare, sectionMetric, vehicleType.axles);

            const key = `${countryCode}-Default`;

            const locations = (toll.tollCollectionLocations || [])
              .map(l => l?.name)
              .filter(Boolean);

            const override = applyContractOverride({
              name: dummyFare.name,              // ✅ was fare.name (doesn't exist here)
              tollSystem: toll.tollSystem || "",
              locations,
              country: countryCode,
              cost: result.cost
            });

            const finalCost = override ? override.cost : result.cost;

            // If this key somehow repeats, keep contract fixed, otherwise keep max (or sum — your choice)
            if (tollMap[key]) {
              if (tollMap[key].contractId) {
                // already fixed by contract, do nothing
              } else if (override) {
                tollMap[key].cost = finalCost;
                tollMap[key].contractId = override.contractId;
                tollMap[key].popupText = override.popupText;
              } else {
                // pick a strategy; for "default/no-fares" I'd keep the max to avoid double counting
                tollMap[key].cost = Math.max(tollMap[key].cost, finalCost);
              }
            } else {
              tollMap[key] = {
                name: dummyFare.name,            // ✅ was fare.name
                country: countryCode,
                cost: finalCost,
                currency: "EUR",
                tollCollectionLocations: toll.tollCollectionLocations || [],
                contractId: override?.contractId,
                popupText: override?.popupText,
              };
            }

            continue;
          }
                    
          if (toll.fares && toll.fares.length > 0) {
            for (const fare of toll.fares) {
              if (fare.pass?.returnJourney) continue;
              if (countryCode && countryCalculators[countryCode]) {
                const sectionMetric = (["DEU","HUN","AUT","FRA","ITA","SVN","PRT","ESP","BEL","POL","CZE","SVK","CHE"].includes(countryCode))
                  ? (section.summary?.length || 0)
                  : rawDuration;

                const result = await countryCalculators[countryCode](fare, sectionMetric, vehicleType.axles);

                const locations = (toll.tollCollectionLocations || [])
                  .map(l => l?.name)
                  .filter(Boolean);

                const override = applyContractOverride({
                  name: fare.name || "",
                  tollSystem: toll.tollSystem || "",
                  locations,
                  country: countryCode,
                  cost: result.cost
                });

                const finalCost = override ? override.cost : result.cost;

                // 🔑 IMPORTANT: your old key used fare.name -> splits the same toll into multiple rows.
                // For contracts we want ONE stable bucket, so they don't stack.
                const key = override
                  ? `${countryCode}-${override.contractId}`
                  : `${countryCode}-${fare.name || "Default"}`;

                if (tollMap[key]) {
                  // vignette rule stays
                  if (["ROU", "NLD", "LUX"].includes(countryCode)) {
                    continue;
                  }

                  // contract should NEVER be added multiple times
                  if (tollMap[key].contractId) {
                    continue;
                  }

                  // normal tolls sum
                  tollMap[key].cost += finalCost;
                } else {
                  tollMap[key] = {
                    name: override ? `CONTRACT: ${fare.name || toll.tollSystem || countryCode}` : (fare.name || (toll.tollSystem ? toll.tollSystem : `${countryCode}`)),
                    country: countryCode,
                    cost: finalCost,
                    currency: "EUR",
                    tollCollectionLocations: toll.tollCollectionLocations || [],
                    contractId: override?.contractId,
                    popupText: override?.popupText,
                  };
                }
              }
            }
          }
        }
      }
    }
    return Object.values(tollMap);
  }, [rawDuration, vehicleType?.axles]);
  // Funcția ta processTollData - memoized and depends on the fallback
  const processTollData = useCallback(async (route) => {

    try {
      // console.log("Processing toll data for route:", route);
      
      // Folosim rawDuration (sau 1 dacă nu e valid)
      const totalDuration = rawDuration && rawDuration > 0 ? rawDuration : 1;
      
      // Definim țările pentru care se aplică costuri de tip vignietă
      const targetCountries = ["LUX", "ROU", "NLD"];
      const countryDurations = {};
      if (route.sections) {
        route.sections.forEach((section) => {
          if (section.tollSystems && section.tollSystems.length > 0 && section.summary) {
            section.tollSystems.forEach((system) => {
              const cc = system.countryCode;
              if (targetCountries.includes(cc)) {
                countryDurations[cc] = Math.max(countryDurations[cc] || 0, section.summary.duration);
              }
            });
          }
        });
      }
      
      // Setăm numărul de zile pentru vigniete (în acest exemplu, 1 zi pe țară)
      const countryDays = {};
      targetCountries.forEach((cc) => {
        countryDays[cc] = 1;
      });
      
      let tollList = [];
      
      // Verificăm dacă există array-ul tolls în secțiuni
      const hasTolls = route.sections && route.sections.some(
        (section) => section.tolls && section.tolls.length > 0
      );
      
      tollList = hasTolls ? await processTollsFallback(route) : [];
      
      let totalCost = 0;
      // Deduplicare: pentru țările din targetCountries, adăugăm costul o singură dată
      const addedCountries = new Set();
      tollList.forEach((toll) => {
        if (targetCountries.includes(toll.country)) {
          if (!addedCountries.has(toll.country)) {
            totalCost += toll.cost;
            addedCountries.add(toll.country);
          }
        } else {
          totalCost += toll.cost;
        }
      });
      
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      const formattedDuration = `${hours}h ${minutes}m`;
            
      // const newTollDetails = {
      //   totalCost,
      //   tollList,
      //   duration: formattedDuration,
      // };

      console.log(`🛣️ [Route ${routeIndex+1}] Toll Breakdown:`)
      tollList.forEach(toll => {
        // use the actual booth names if provided…
        const places = toll.tollCollectionLocations
          ?.map(loc => loc.name)
          .filter(Boolean)
          .join(' → ')
          || toll.name;
        console.log(
          `[${routeIndex+1}] ${places.padEnd(25)} | ${toll.country} | €${toll.cost.toFixed(2)}`
        );

      });

      const contractHits = tollList.filter(t => t.contractId);

      const newTollDetails = {
        totalCost,
        tollList,
        duration: formattedDuration,
        contractHits: contractHits.map(t => ({
          id: t.contractId,
          name: t.name,
          msg: t.popupText || "Contract pricing applied."
        }))
      };

      setTollDetails(newTollDetails);
      onTollUpdate(newTollDetails);
    } catch (error) {
      console.error("Error processing toll data:", error);
    }
  }, [onTollUpdate, processTollsFallback, rawDuration, routeIndex, vehicleType?.axles]);

  const selectedRouteId = selectedRoute?.id;

  useEffect(() => {
    // console.log("TollCalculator - Dependencies updated", {
    //   rawDuration,
    //   rawDistance,
    //   hasSelectedRoute: !!selectedRoute,
    //   hasStartCoords: !!startCoordinates,
    //   hasEndCoords: !!endCoordinates,
    //   vehicleAxles: vehicleType?.axles
    // });

    if (selectedRouteId) {
      // Dacă ruta deja a fost procesată, nu o mai procesăm
      if (processedRoutes.current.has(selectedRouteId)) return;
      processedRoutes.current.add(selectedRouteId);
      processTollData(selectedRoute);
    } else if (startCoordinates && endCoordinates && rawDuration && rawDistance) {
      const fetchTollData = async () => {
        try {
          let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
          intermediatePoints.forEach((point) => {
            url += `&via=${point.lat},${point.lng}`;
          });
          url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
          url += `&return=polyline,summary,actions,instructions,tolls`;
          url += `&transportMode=truck`;
          url += `&vehicle[height]=400`;
          url += `&vehicle[width]=255`;
          url += `&vehicle[length]=1600`;
          url += `&truck[axleCount]=${vehicleType.axles}`;
          url += `&vehicle[grossWeight]=${vehicleType.weight}`;
          url += `&truck[limitedWeight]=7500`;
          url += `&tolls[emissionType]=euro6`;
          url += `&apikey=${process.env.REACT_APP_HERE_API_KEY}`;

          const response = await fetch(url);
          const data = await response.json();
          if (!data.routes || data.routes.length === 0) {
            console.error("No routes found");
            return;
          }
          processTollData(data.routes[0]);
        } catch (error) {
          console.error("Error fetching toll data:", error);
        }
      };
      fetchTollData();
    }
  }, [
    startCoordinates,
    endCoordinates,
    intermediatePoints,
    vehicleType,
    rawDuration,
    rawDistance,
    selectedRouteId,
    processTollData
  ]);

  return null;
};

export default TollCalculator;