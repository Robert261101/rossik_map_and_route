import React, { useEffect, useState } from "react";

// Caching for vignette prices
let rovinietaPricesCache = null;

// Function to fetch vignette prices from an external endpoint.
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

// 1. Country-specific calculation functions
const countryCalculators = {
  // Romania – Fixed daily vignette
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

  // Netherlands – Fixed daily vignette
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

  // Luxembourg – Fixed daily vignette
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

  // Germany – Toll per km
  DEU: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Hungary – Toll per km
  HUN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Austria – Fixed toll
  AUT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "fixed" };
  },

  // France – Fixed toll
  FRA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "fixed" };
  },

  // Italy – Toll per km 
  ITA: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Slovenia
  SVN: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Slovakia
  SVK: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Portugal
  PRT: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },
  
  // Spain
  ESP: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Belgium
  BEL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Poland
  POL: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Czechia
  CZE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  // Switzerland
  CHE: async (tollData) => {
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  }
};

// 2. Utility functions
const exchangeRates = async () => {
  const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
  const data = await response.json();
  return data.rates || {};
};

const convertToEuro = async (amount, currency) => {
  const rates = await exchangeRates();
  if (!rates[currency]) {
    console.error(`Exchange rate for ${currency} is not available.`);
    return amount;
  }
  return currency === "EUR" ? amount : amount / rates[currency];
};

// 3. Main TollCalculator Component
const TollCalculator = ({ startCoordinates, endCoordinates, intermediatePoints = [], vehicleType, rawDistance, rawDuration, onTollUpdate }) => {
  const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });

  useEffect(() => {
    if (startCoordinates && endCoordinates) {
      fetchTollData(startCoordinates, intermediatePoints, endCoordinates, vehicleType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      console.log("API response: ", data);

      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found");
        return;
      }

      const totalDuration = rawDuration && rawDuration > 0 ? rawDuration : 1;
      // Determine durations for specific vignette countries.
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
      // For countries with a vignette, set number of days to 1.
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
        // Aggregate toll systems from different sections.
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
                  // For France we expect duplicate entries – average them instead of replacing.
                  if (countryCode === "FRA" && aggregatedSystems[countryCode]) {
                    aggregatedSystems[countryCode].cost = (aggregatedSystems[countryCode].cost + result.cost) / 2;
                  } else {
                    aggregatedSystems[countryCode] = {
                      operator: countryCode,
                      cost: result.cost,
                      type: result.type,
                      tollCollectionLocations: system.tollCollectionLocations || [],
                      ...((countryCode === "ROU" || countryCode === "NLD" || countryCode === "LUX") && { vignietaValidity: result.vignietaValidity })
                    };
                  }
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
        // For vignette countries use the cost per day
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
                (["DEU","HUN","AUT","FRA","ITA","SVN","PRT","ESP","BEL","POL","CZE","SVK","CHE"].includes(countryCode))
                  ? (section.summary?.length || 0)
                  : rawDuration;
              const result = await countryCalculators[countryCode](fare, sectionMetric);
              const key = `${countryCode}-${fare.name}`;
              if (tollMap[key]) {
                if (
                  ["DEU","HUN","AUT","FRA","ITA","SVN","PRT","ESP","BEL","POL","CZE","SVK","CHE"].includes(countryCode)
                ) {
                  tollMap[key].cost += result.cost;
                } else if (["ROU", "NLD", "LUX"].includes(countryCode)) {
                  // For vignette countries, take the minimum cost.
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
