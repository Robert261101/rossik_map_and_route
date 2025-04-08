import React, { useEffect, useState } from "react";

// Caching pentru prețurile rovinietelor
let rovinietaPricesCache = null;

// Funcție care preia prețurile dintr-un endpoint extern.
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

// 1. Funcții de calcul specifice fiecărei țări
const countryCalculators = {
  // România - Vignietă fixă pe o zi
  ROU: async (tollData, duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    const vehiclePrices = pricesData && pricesData.ROU && pricesData.ROU["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice, type: "fixed" };
  },

  // Olanda - Vignietă fixă pe o zi
  NLD: async (tollData, duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    const vehiclePrices = pricesData && pricesData.NLD && pricesData.NLD["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice, type: "fixed" };
  },

  // Luxemburg - Vignietă fixă pe o zi
  LUX: async (tollData, duration, vehicleAxles) => {
    const pricesData = await fetchRovinietaPrices();
    const vehiclePrices = pricesData && pricesData.LUX && pricesData.LUX["5"];
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }
    const ticketPrice = vehiclePrices["1"];
    return { cost: ticketPrice, type: "fixed" };
  },


  // Germania - Taxă pe km
  DEU: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Ungaria - Taxă pe km
  HUN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Austria - Taxă fixă
  AUT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "fixed" };
  },

  // Franța - Taxă fixă
  FRA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "fixed" };
  },

  // Italia - Taxă pe km 
  ITA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Slovenia
  SVN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Slovacia
  SVK: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Portugalia
  PRT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },
  
  // Spania
  ESP: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Belgia
  BEL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Polonia
  POL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Cehia
  CZE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Elveția
  CHE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  }
};

// 2. Funcții utilitare
const exchangeRates = async () => {
  const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
  const data = await response.json();
  return data.rates || {};
};

const convertToEuro = async (amount, currency) => {
  const rates = await exchangeRates();
  if (!rates[currency]) {
    console.error(`Rata de schimb pentru ${currency} nu este disponibilă.`);
    return amount;
  }
  return currency === "EUR" ? amount : amount / rates[currency];
};

// 3. Componenta principală
const TollCalculator = ({ startCoordinates, endCoordinates, intermediatePoints = [], vehicleType, rawDistance, rawDuration, onTollUpdate }) => {
  const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });

  useEffect(() => {
    if (startCoordinates && endCoordinates) {
      fetchTollData(startCoordinates, intermediatePoints, endCoordinates, vehicleType);
    }
  }, [startCoordinates, endCoordinates, intermediatePoints, vehicleType, rawDuration]);

  const fetchTollData = async (start, intermediateList, end, vehicle) => {
    try {
      let url = `https://router.hereapi.com/v8/routes?origin=${start.lat},${start.lng}`;
      intermediateList.forEach((point) => {
        url += `&via=${point.lat},${point.lng}`;
      });
      url += `&destination=${end.lat},${end.lng}`;
      url += `&return=polyline,summary,actions,instructions,tolls`;
      url += `&transportMode=truck`;
      url += `&vehicle[height]=400`;
      url += `&vehicle[width]=255`;
      url += `&vehicle[length]=1600`;
      url += `&truck[axleCount]=${vehicleType.axles}`;
      url += `&vehicle[grossWeight]=${vehicleType.weight}`;
      url += `&tolls[emissionType]=euro6`;
      url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

      const response = await fetch(url);
      const data = await response.json();

      console.log("Raspuns API: ", data);

      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found");
        return;
      }

      const totalDuration = rawDuration && rawDuration > 0 ? rawDuration : 1;

      // Calculăm durata petrecută în fiecare țară țintă din secțiunile rutei.
      const targetCountries = ["LUX", "ROU", "NLD"];
      const countryDurations = {};
      data.routes[0].sections.forEach(section => {
        if (section.tollSystems && section.tollSystems.length > 0 && section.summary) {
          section.tollSystems.forEach(system => {
            const cc = system.countryCode;
            if (targetCountries.includes(cc)) {
              countryDurations[cc] = Math.max(countryDurations[cc] || 0, section.summary.duration);
            }
          });
        }
      });
      // Setăm numărul de zile pentru țările cu vignietă la 1 zi
      const countryDays = {};
      targetCountries.forEach(cc => {
        countryDays[cc] = 1;
      });


      
      let tollList = [];
      const route = data.routes[0];
      const useTollSystems = route.sections.some(
        (section) => section.tollSystems && section.tollSystems.length > 0
      );

      if (useTollSystems) {
        let aggregatedSystems = {};
        for (const section of route.sections) {
          if (section.tollSystems && section.tollSystems.length > 0) {
            for (const system of section.tollSystems) {
              if (system.price && system.price.value !== undefined && system.price.currency) {
                const countryCode = system.countryCode;
                if (countryCode && countryCalculators[countryCode]) {
                  const durationForCountry = targetCountries.includes(countryCode)
                  ? (countryDurations[countryCode] || 1)
                  : totalDuration;
                const result = await countryCalculators[countryCode](
                  system,
                  durationForCountry,
                  vehicle.axles
                );
                  aggregatedSystems[countryCode] = {
                    operator: countryCode,
                    cost: result.cost,
                    type: result.type,
                    tollCollectionLocations: system.tollCollectionLocations || [],
                    ...((countryCode === "ROU" || countryCode === "NLD" || countryCode === "LUX") && { vignietaValidity: result.vignietaValidity })
                  };
                } else {
                  const costInEuro = await convertToEuro(system.price.value, system.price.currency);
                  const key = system.tollSystem;
                  if (aggregatedSystems[key]) {
                    aggregatedSystems[key].cost = Math.max(aggregatedSystems[key].cost, costInEuro);
                  } else {
                    aggregatedSystems[key] = {
                      operator: key,
                      cost: costInEuro,
                      currency: system.price.currency,
                      tollCollectionLocations: system.tollCollectionLocations || []
                    };
                  }
                }
              } else {
                console.warn("Missing price information in tollSystem:", system);
              }
            }
          }
        }

        if (Object.keys(aggregatedSystems).length > 0) {
          tollList = Object.values(aggregatedSystems);
        } else {
          tollList = await processTollsFallback(data);
        }
      } else {
        tollList = await processTollsFallback(data);
      }

      let totalCost = 0;
      tollList.forEach(toll => {
        if (targetCountries.includes(toll.country)) {
          totalCost += toll.cost * (countryDays[toll.country] || 1);
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
      setTollDetails(newTollDetails);
      onTollUpdate(newTollDetails);
    } catch (error) {
      console.error("Error fetching toll data:", error);
    }
  };

  const processTollsFallback = async (data) => {
    let tollMap = {};
    for (const section of data.routes[0].sections) {
      if (section.tolls && section.tolls.length > 0) {
        for (const toll of section.tolls) {
          const countryCode = toll.countryCode;
          for (const fare of toll.fares) {
            if (countryCode && countryCalculators[countryCode]) {
              const sectionMetric = 
                (countryCode === "DEU" || countryCode === "HUN" || countryCode === "AUT" ||
                 countryCode === "FRA" || countryCode === "ITA" || countryCode === "SVN" ||
                 countryCode === "PRT" || countryCode === "ESP" || countryCode === "BEL" ||
                 countryCode === "POL" || countryCode === "CZE" || countryCode === "SVK" ||
                 countryCode === "CHE")
                  ? (section.summary?.length || 0)
                  : rawDuration;
              const result = await countryCalculators[countryCode](fare, sectionMetric);
              const key = `${countryCode}-${fare.name}`;
              if (tollMap[key]) {
                if (
                  countryCode === "DEU" ||
                  countryCode === "HUN" ||
                  countryCode === "AUT" ||
                  countryCode === "FRA" ||
                  countryCode === "ITA" ||
                  countryCode === "SVN" ||
                  countryCode === "PRT" ||
                  countryCode === "ESP" ||
                  countryCode === "BEL" ||
                  countryCode === "POL" ||
                  countryCode === "CZE" ||
                  countryCode === "SVK" ||
                  countryCode === "CHE"
                ) {
                  tollMap[key].cost += result.cost;
                } else if (["ROU", "NLD", "LUX"].includes(countryCode)) {
                  // Pentru țările cu vignietă, nu adunăm costurile, ci luăm costul minim
                  tollMap[key].cost = Math.min(tollMap[key].cost, result.cost);
                }
              } else {
                tollMap[key] = {
                  name: fare.name,
                  country: countryCode,
                  cost: result.cost,
                  type: result.type,
                  tollCollectionLocations: toll.tollCollectionLocations || []
                };
              }
            } else {
              const locKey = (toll.tollCollectionLocations && toll.tollCollectionLocations.length > 0)
                ? toll.tollCollectionLocations.map(loc => loc.name).join("_")
                : "";
              const key = `${toll.countryCode}-${fare.name}-${locKey}`;
              const costInEuro = await convertToEuro(fare.price.value, fare.price.currency);
              if (tollMap[key]) {
                tollMap[key].cost = Math.min(tollMap[key].cost, costInEuro);
              } else {
                tollMap[key] = {
                  name: fare.name,
                  country: toll.countryCode,
                  cost: costInEuro,
                  currency: fare.price.currency,
                  tollCollectionLocations: toll.tollCollectionLocations || []
                };
              }
            }
          }
        }
      }
    }
    return Object.values(tollMap);
  };

  return null;
};

export default TollCalculator;

