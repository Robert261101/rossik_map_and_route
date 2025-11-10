import { useEffect, useState, useRef, useCallback, useMemo } from "react";

// Caching pentru prețurile de rovinietă (dacă este necesar)
let rovinietaPricesCache = null;

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
            
            tollMap[key] = {
              name: toll.tollSystem ? toll.tollSystem : `${countryCode}`,
              country: countryCode,
              cost: result.cost,
              currency: "EUR",
              tollCollectionLocations: toll.tollCollectionLocations || [],
            };
            continue;
          }
          
          if (toll.fares && toll.fares.length > 0) {
            for (const fare of toll.fares) {
              if (fare.pass?.returnJourney) continue;
              if (countryCode && countryCalculators[countryCode]) {
                const sectionMetric = (["DEU", "HUN", "AUT", "FRA", "ITA", "SVN", "PRT", "ESP", "BEL", "POL", "CZE", "SVK", "CHE"].includes(countryCode))
                  ? (section.summary?.length || 0)
                  : rawDuration;
                const result = await countryCalculators[countryCode](fare, sectionMetric, vehicleType.axles);
                const key = `${countryCode}-${fare.name || "Default"}`;
                if (tollMap[key]) {
                  if (["ROU", "NLD", "LUX"].includes(countryCode)) {
                    // Nu facem adunare suplimentară pentru vigniete
                    continue;
                  } else {
                    tollMap[key].cost += result.cost;
                  }
                } else {
                  tollMap[key] = {
                    name: fare.name || (toll.tollSystem ? toll.tollSystem : `${countryCode}`),
                    country: countryCode,
                    cost: result.cost,
                    currency: "EUR",
                    tollCollectionLocations: toll.tollCollectionLocations || [],
                  };
                }
              } else if (fare.price && fare.price.value) {
                const locKey = (toll.tollCollectionLocations && toll.tollCollectionLocations.length > 0)
                  ? toll.tollCollectionLocations.map((loc) => loc.name).join("_")
                  : "";
                const key = `${toll.countryCode || "Unknown"}-${fare.name || "Default"}-${locKey}`;
                const costInEuro = await convertToEuro(fare.price.value, fare.price.currency || "EUR");
                if (tollMap[key]) {
                  tollMap[key].cost = Math.min(tollMap[key].cost, costInEuro);
                } else {
                  tollMap[key] = {
                    name: fare.name || (toll.tollSystem ? toll.tollSystem : `${toll.countryCode || "Unknown"}`),
                    country: toll.countryCode || "Unknown",
                    cost: costInEuro,
                    currency: "EUR",
                    tollCollectionLocations: toll.tollCollectionLocations || [],
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
            
      const newTollDetails = {
        totalCost,
        tollList,
        duration: formattedDuration,
      };

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