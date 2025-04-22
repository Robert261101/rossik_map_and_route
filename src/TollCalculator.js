import React, { useEffect, useState, useRef } from "react";

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

const detectCountriesFromRoute = (route) => {
  const countries = new Set();
  if (route.sections) {
    route.sections.forEach((section) => {
      if (section.tollSystems) {
        section.tollSystems.forEach((system) => {
          if (system.countryCode) {
            countries.add(system.countryCode);
          }
        });
      }
      if (section.tolls) {
        section.tolls.forEach((toll) => {
          if (toll.countryCode) {
            countries.add(toll.countryCode);
          }
        });
      }
    });
  }
  return Array.from(countries);
};

const TollCalculator = ({
  startCoordinates,
  endCoordinates,
  intermediatePoints = [],
  vehicleType,
  rawDuration,
  rawDistance,
  onTollUpdate,
  selectedRoute, // Dacă este transmis, folosim această rută pentru calculul taxelor
}) => {
  const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });
  // Folosim un useRef pentru a reține id-urile rutelor deja procesate
  const processedRoutes = useRef(new Set());

  // Funcția ta processTollData rămâne aceeași
  const processTollData = async (route) => {
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
      
      if (hasTolls) {
        // Procesare din array-ul "tolls"
        tollList = await processTollsFallback(route);
      } else {
        tollList = [];
      }
      
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
      
      // console.log("Final toll list:", tollList);
      // console.log("Total toll cost:", totalCost);
      
      const newTollDetails = {
        totalCost,
        tollList,
        duration: formattedDuration,
      };
      setTollDetails(newTollDetails);
      onTollUpdate(newTollDetails);
    } catch (error) {
      console.error("Error processing toll data:", error);
    }
  };

  // Fallback pentru procesarea taxelor din array-ul "tolls"
  const processTollsFallback = async (route) => {
    let tollMap = {};
    if (!route.sections) return [];
    
    for (const section of route.sections) {
      if (section.tolls && section.tolls.length > 0) {
        for (const toll of section.tolls) {
          const countryCode = toll.countryCode;
          
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
  };

  useEffect(() => {
    // console.log("TollCalculator - Dependencies updated", {
    //   rawDuration,
    //   rawDistance,
    //   hasSelectedRoute: !!selectedRoute,
    //   hasStartCoords: !!startCoordinates,
    //   hasEndCoords: !!endCoordinates,
    //   vehicleAxles: vehicleType?.axles
    // });

    if (selectedRoute && selectedRoute.id) {
      // Dacă ruta deja a fost procesată, nu o mai procesăm
      if (processedRoutes.current.has(selectedRoute.id)) return;
      processedRoutes.current.add(selectedRoute.id);
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
          url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

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
    selectedRoute?.id
  ]);

  return null;
};

export default TollCalculator;


















// import React, { useEffect, useState } from "react";

// // Caching pentru prețurile de rovinietă
// let rovinietaPricesCache = null;

// const fetchRovinietaPrices = async () => {
//   if (rovinietaPricesCache) return rovinietaPricesCache;
//   try {
//     const response = await fetch("/rovinieta-prices.json");
//     rovinietaPricesCache = await response.json();
//     return rovinietaPricesCache;
//   } catch (error) {
//     console.error("Error fetching rovinieta prices:", error);
//     return null;
//   }
// };

// const countryCalculators = {
//   ROU: async (tollData, duration, vehicleAxles) => {
//     const pricesData = await fetchRovinietaPrices();
//     const vehiclePrices = pricesData && pricesData.ROU && pricesData.ROU["5"];
//     if (!vehiclePrices) {
//       console.warn("No pricing data for vehicle with 5 axles.");
//       return { cost: 0, type: "fixed" };
//     }
//     const ticketPrice = vehiclePrices["1"];
//     return { cost: ticketPrice, type: "fixed" };
//   },
//   NLD: async (tollData, duration, vehicleAxles) => {
//     const pricesData = await fetchRovinietaPrices();
//     const vehiclePrices = pricesData && pricesData.NLD && pricesData.NLD["5"];
//     if (!vehiclePrices) {
//       console.warn("No pricing data for vehicle with 5 axles.");
//       return { cost: 0, type: "fixed" };
//     }
//     const ticketPrice = vehiclePrices["1"];
//     return { cost: ticketPrice, type: "fixed" };
//   },
//   LUX: async (tollData, duration, vehicleAxles) => {
//     const pricesData = await fetchRovinietaPrices();
//     const vehiclePrices = pricesData && pricesData.LUX && pricesData.LUX["5"];
//     if (!vehiclePrices) {
//       console.warn("No pricing data for vehicle with 5 axles.");
//       return { cost: 0, type: "fixed" };
//     }
//     const ticketPrice = vehiclePrices["1"];
//     return { cost: ticketPrice, type: "fixed" };
//   },
//   DEU: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   HUN: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   AUT: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "fixed" };
//   },
//   FRA: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "fixed" };
//   },
//   ITA: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   SVN: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   SVK: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   PRT: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   ESP: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   BEL: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   POL: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   CZE: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   },
//   CHE: async (tollData) => {
//     const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
//     return { cost, type: "perKm" };
//   }
// };

// const exchangeRates = async () => {
//   const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
//   const data = await response.json();
//   return data.rates || {};
// };

// const convertToEuro = async (amount, currency) => {
//   const rates = await exchangeRates();
//   if (!rates[currency]) {
//     console.error(`Exchange rate for ${currency} is not available.`);
//     return amount;
//   }
//   return currency === "EUR" ? amount : amount / rates[currency];
// };

// const TollCalculator = ({
//   startCoordinates,
//   endCoordinates,
//   intermediatePoints = [],
//   vehicleType,
//   rawDuration,
//   rawDistance,
//   onTollUpdate,
//   selectedRoute, // Dacă este transmis, folosim această rută pentru calculul taxelor
// }) => {
//   const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });

//   // Funcție de procesare a datelor de taxare dintr-o rută
//   const processTollData = async (route) => {
//     try {
//       // Folosim rawDuration, dacă este 0 setăm 1 pentru a evita diviziunea cu 0
//       const totalDuration = rawDuration && rawDuration > 0 ? rawDuration : 1;
//       const targetCountries = ["LUX", "ROU", "NLD"];
//       const countryDurations = {};
      
//       // Calculăm durata maximă pentru țările cu vignietă
//       route.sections.forEach((section) => {
//         if (section.tollSystems && section.tollSystems.length > 0 && section.summary) {
//           section.tollSystems.forEach((system) => {
//             const cc = system.countryCode;
//             if (targetCountries.includes(cc)) {
//               countryDurations[cc] = Math.max(countryDurations[cc] || 0, section.summary.duration);
//             }
//           });
//         }
//       });

//       // Setăm numărul de zile pentru vigniete (se poate adapta)
//       const countryDays = {};
//       targetCountries.forEach((cc) => {
//         countryDays[cc] = 1;
//       });
      
//       let tollList = [];

//       // Dacă există date în tollSystems cu preț, le procesăm
//       const hasTollSystems = route.sections.some(
//         (section) => section.tollSystems && section.tollSystems.length > 0
//       );
      
//       // Dacă tollSystems nu conțin prețuri utile, folosim fallback-ul prin tolls
//       if (hasTollSystems) {
//         let aggregatedSystems = {};
//         for (const section of route.sections) {
//           if (section.tollSystems && section.tollSystems.length > 0) {
//             for (const system of section.tollSystems) {
//               if (system.price && system.price.value !== undefined && system.price.currency) {
//                 // Folosim calculatoarele specifice de țară
//                 const countryCode = system.countryCode;
//                 if (countryCode && countryCalculators[countryCode]) {
//                   const durationForCountry = targetCountries.includes(countryCode)
//                     ? (countryDurations[countryCode] || 1)
//                     : totalDuration;
//                   const result = await countryCalculators[countryCode](
//                     system,
//                     durationForCountry,
//                     vehicleType.axles
//                   );
//                   if (countryCode === "FRA" && aggregatedSystems[countryCode]) {
//                     aggregatedSystems[countryCode].cost = (aggregatedSystems[countryCode].cost + result.cost) / 2;
//                   } else {
//                     aggregatedSystems[countryCode] = {
//                       operator: countryCode,
//                       cost: result.cost,
//                       type: result.type,
//                       tollCollectionLocations: system.tollCollectionLocations || [],
//                     };
//                   }
//                 } else {
//                   const costInEuro = await convertToEuro(system.price.value, system.price.currency);
//                   const key = system.tollSystem;
//                   if (aggregatedSystems[key]) {
//                     aggregatedSystems[key].cost = Math.max(aggregatedSystems[key].cost, costInEuro);
//                   } else {
//                     aggregatedSystems[key] = {
//                       operator: key,
//                       cost: costInEuro,
//                       currency: system.price.currency,
//                       tollCollectionLocations: system.tollCollectionLocations || [],
//                     };
//                   }
//                 }
//               } else {
//                 console.warn("Missing price information in tollSystem:", system);
//               }
//             }
//           }
//         }
//         // Filtrăm doar operatorii pentru țările traversate
//         const traversedCountries = new Set();
//         route.sections.forEach((section) => {
//           if (section.tollSystems) {
//             section.tollSystems.forEach((system) => {
//               if (system.countryCode) {
//                 traversedCountries.add(system.countryCode);
//               }
//             });
//           }
//         });
//         if (Object.keys(aggregatedSystems).length > 0) {
//           tollList = Object.values(aggregatedSystems).filter((toll) =>
//             traversedCountries.has(toll.operator)
//           );
//         }
//       } else {
//         // Folosim fallback-ul: procesăm direct array-ul "tolls"
//         tollList = await processTollsFallback(route);
//       }

//       // Calculăm costul total pe baza tarifului din tollList
//       let totalCost = 0;
//       tollList.forEach((toll) => {
//         // Dacă țara este una cu vignietă, se aplică costul per zi
//         if (targetCountries.includes(toll.country)) {
//           totalCost += toll.cost * (countryDays[toll.country] || 1);
//         } else {
//           totalCost += toll.cost;
//         }
//       });

//       const hours = Math.floor(totalDuration / 3600);
//       const minutes = Math.floor((totalDuration % 3600) / 60);
//       const formattedDuration = `${hours}h ${minutes}m`;

//       const newTollDetails = {
//         totalCost,
//         tollList,
//         duration: formattedDuration,
//       };
//       setTollDetails(newTollDetails);
//       onTollUpdate(newTollDetails);
//     } catch (error) {
//       console.error("Error processing toll data:", error);
//     }
//   };

//   // Fallback pentru procesarea taxelor din array‑ul "tolls"
//   const processTollsFallback = async (route) => {
//     let tollMap = {};
//     for (const section of route.sections) {
//       if (section.tolls && section.tolls.length > 0) {
//         // Parcurgem fiecare obiect toll din array
//         for (const toll of section.tolls) {
//           const countryCode = toll.countryCode;
//           // Parcurgem fiecare tarif din array-ul fares
//           if (toll.fares && toll.fares.length > 0) {
//             for (const fare of toll.fares) {
//               // Dacă există un calculator specific pentru țară, îl folosim
//               if (countryCode && countryCalculators[countryCode]) {
//                 const sectionMetric =
//                   (["DEU", "HUN", "AUT", "FRA", "ITA", "SVN", "PRT", "ESP", "BEL", "POL", "CZE", "SVK", "CHE"].includes(countryCode))
//                     ? (section.summary?.length || 0)
//                     : rawDuration;
//                 const result = await countryCalculators[countryCode](fare, sectionMetric);
//                 const key = `${countryCode}-${fare.name}`;
//                 if (tollMap[key]) {
//                   // Pentru anumite țări, cum ar fi VIGNETTE, putem lua minimul
//                   if (["ROU", "NLD", "LUX"].includes(countryCode)) {
//                     tollMap[key].cost = Math.min(tollMap[key].cost, result.cost);
//                   } else {
//                     tollMap[key].cost += result.cost;
//                   }
//                 } else {
//                   tollMap[key] = {
//                     name: fare.name,
//                     country: countryCode,
//                     cost: result.cost,
//                     type: result.type,
//                     tollCollectionLocations: toll.tollCollectionLocations || [],
//                   };
//                 }
//               } else {
//                 // Dacă nu avem un calculator pentru țară, încercăm să folosim direct prețul din fare
//                 const locKey = (toll.tollCollectionLocations && toll.tollCollectionLocations.length > 0)
//                   ? toll.tollCollectionLocations.map((loc) => loc.name).join("_")
//                   : "";
//                 const key = `${toll.countryCode}-${fare.name}-${locKey}`;
//                 const costInEuro = await convertToEuro(fare.price.value, fare.price.currency);
//                 if (tollMap[key]) {
//                   tollMap[key].cost = Math.min(tollMap[key].cost, costInEuro);
//                 } else {
//                   tollMap[key] = {
//                     name: fare.name,
//                     country: toll.countryCode,
//                     cost: costInEuro,
//                     currency: fare.price.currency,
//                     tollCollectionLocations: toll.tollCollectionLocations || [],
//                   };
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//     return Object.values(tollMap);
//   };

//   // Efectul se declanșează atunci când sunt disponibile rawDuration și rawDistance 
//   // și când se schimbă selectedRoute sau alte dependențe.
//   useEffect(() => {
//     if (!rawDuration || !rawDistance) return;
//     // Pentru debug, poți activa log-ul de mai jos:
//     // console.log("TollCalculator - selectedRoute:", selectedRoute);
//     if (selectedRoute) {
//       processTollData(selectedRoute);
//     } else if (startCoordinates && endCoordinates) {
//       const fetchTollData = async () => {
//         try {
//           let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
//           intermediatePoints.forEach((point) => {
//             url += `&via=${point.lat},${point.lng}`;
//           });
//           url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
//           url += `&return=polyline,summary,actions,instructions,tolls`;
//           url += `&transportMode=truck`;
//           url += `&vehicle[height]=400`;
//           url += `&vehicle[width]=255`;
//           url += `&vehicle[length]=1600`;
//           url += `&truck[axleCount]=${vehicleType.axles}`;
//           url += `&vehicle[grossWeight]=${vehicleType.weight}`;
//           url += `&tolls[emissionType]=euro6`;
//           url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

//           const response = await fetch(url);
//           const data = await response.json();
//           if (!data.routes || data.routes.length === 0) {
//             console.error("No routes found");
//             return;
//           }
//           processTollData(data.routes[0]);
//         } catch (error) {
//           console.error("Error fetching toll data:", error);
//         }
//       };
//       fetchTollData();
//     }
//   }, [startCoordinates, endCoordinates, intermediatePoints, vehicleType, rawDuration, rawDistance, selectedRoute]);

//   return null;
// };


// export default TollCalculator;
