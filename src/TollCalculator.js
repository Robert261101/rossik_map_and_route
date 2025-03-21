/*import React, { useEffect } from "react";

// Funcțiile din codul tău
const exchangeRates = async () => {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return {};
  }
};

const convertToEuro = async (amount, currency) => {
  const rates = await exchangeRates();
  if (rates[currency]) {
    return amount / rates[currency];
  }
  return amount;
};

// Componenta de test (use cases)
const UseCases = () => {
  useEffect(() => {
    const runUseCases = async () => {
      const sampleTollData = [
        { countryCode: "DEU", tollSystem: "TOLL COLLECT GMBH", price: { value: 42.7, currency: "EUR" } },
        { countryCode: "ROU", tollSystem: "VIGNETTE ROMANIA", fares: [ { price: { value: 34.83, currency: "RON" }, pass: { validityPeriod: { period: "days", count: 1 } } } ] },
        { countryCode: "AUT", tollSystem: "ASFINAG GO-MAUT", price: { value: 50, currency: "EUR" } },
        { countryCode: "HUN", tollSystem: "HU_GO_GYORSFORGALMI", price: { value: 100, currency: "HUF" } },
        { countryCode: "FRA", tollSystem: "SANEF", price: { value: 30.3, currency: "EUR" } },
        { countryCode: "SVN", tollSystem: "TOLL SYSTEM SVN", price: { value: 20, currency: "EUR" } },
        { countryCode: "ITA", tollSystem: "AUTOSTRADE PER L'ITALIA S.P.A.", price: { value: 3.9, currency: "EUR" } }
      ];

      for (const toll of sampleTollData) {
        if (toll.fares) {
          for (const fare of toll.fares) {
            const converted = await convertToEuro(fare.price.value, fare.price.currency);
            console.log(`UseCase - ${toll.countryCode} ${toll.tollSystem} (fare): ${converted.toFixed(2)} EUR`);
          }
        } else if (toll.price) {
          const converted = await convertToEuro(toll.price.value, toll.price.currency);
          console.log(`UseCase - ${toll.countryCode} ${toll.tollSystem}: ${converted.toFixed(2)} EUR`);
        }
      }
    };
    runUseCases();
  }, []);

  return <div>Verifică consola pentru use case-uri.</div>;
};

export default UseCases;*/





import React, { useEffect, useState } from "react";

// Caching pentru prețurile rovinietelor
let rovinietaPricesCache = null;

// Funcție care preia prețurile dintr-un endpoint extern.
// Actualizează URL-ul cu endpoint-ul real care furnizează prețurile.
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

// Funcție utilitară pentru conversia duratei (ex: "10h 30m") în secunde
const durationToSeconds = (durationStr) => {
  if (!durationStr || typeof durationStr !== "string") {
    console.warn("Duration is not valid:", durationStr);
    return 0;
  }
  // Se presupune că durationStr are formatul "10h 30m" sau "10h30m"
  const parts = durationStr.split("h");
  const hours = parseInt(parts[0].trim(), 10) || 0;
  const minutes = parts[1] ? parseInt(parts[1].replace("m", "").trim(), 10) : 0;
  return hours * 3600 + minutes * 60;
};

// 1. Funcții de calcul specifice fiecărei țări
const countryCalculators = {
  // România - Vignietă fixă
  ROU: async (tollData, duration, vehicleAxles) => {
    // Calculăm numărul de zile necesare pe baza duratei traseului (în secunde)
    const requiredDays = Math.ceil(duration / (24 * 3600));
    //console.log("duration (sec):", duration);
    //console.log("requiredDays:", requiredDays);
    
    const pricesData = await fetchRovinietaPrices();
    // Folosim doar datele pentru 5 axe
    const vehiclePrices = pricesData && pricesData.ROU && pricesData.ROU["5"];

    // Dacă nu avem date pentru numărul de axe, folosim un fallback
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }

    // Calculăm costul total pentru fiecare opțiune disponibilă.
    let bestCost = Infinity;
    let bestValidity = null;
    for (const validityStr of Object.keys(vehiclePrices)) {
      const validity = parseInt(validityStr, 10);
      const ticketPrice = vehiclePrices[validityStr];
      const ticketsNeeded = Math.ceil(requiredDays / validity);
      const totalCost = ticketsNeeded * ticketPrice;
      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestValidity = validity;
      }
    }

    return {
      cost: bestCost,
      type: "fixed"
    };
  },
  
  // Olanda - Vignietă fixă
  NLD: async (tollData, duration, vehicleAxles) => {
    // Calculăm numărul de zile necesare pe baza duratei traseului (în secunde)
    const requiredDays = Math.ceil(duration / (24 * 3600));
    //console.log("duration (sec):", duration);
    //console.log("requiredDays:", requiredDays);
    
    const pricesData = await fetchRovinietaPrices();
    // Folosim doar datele pentru 5 axe
    const vehiclePrices = pricesData && pricesData.NLD && pricesData.NLD["5"];

    // Dacă nu avem date pentru numărul de axe, folosim un fallback
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }

    // Calculăm costul total pentru fiecare opțiune disponibilă.
    let bestCost = Infinity;
    let bestValidity = null;
    for (const validityStr of Object.keys(vehiclePrices)) {
      const validity = parseInt(validityStr, 10);
      const ticketPrice = vehiclePrices[validityStr];
      const ticketsNeeded = Math.ceil(requiredDays / validity);
      const totalCost = ticketsNeeded * ticketPrice;
      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestValidity = validity;
      }
    }

    return {
      cost: bestCost,
      type: "fixed"
    };
  },

  // România - Vignietă fixă
  LUX: async (tollData, duration, vehicleAxles) => {
    // Calculăm numărul de zile necesare pe baza duratei traseului (în secunde)
    const requiredDays = Math.ceil(duration / (24 * 3600));
    //console.log("duration (sec):", duration);
    //console.log("requiredDays:", requiredDays);
    
    const pricesData = await fetchRovinietaPrices();
    // Folosim doar datele pentru 5 axe
    const vehiclePrices = pricesData && pricesData.LUX && pricesData.LUX["5"];

    // Dacă nu avem date pentru numărul de axe, folosim un fallback
    if (!vehiclePrices) {
      console.warn("No pricing data for vehicle with 5 axles.");
      return { cost: 0, type: "fixed" };
    }

    // Calculăm costul total pentru fiecare opțiune disponibilă.
    let bestCost = Infinity;
    let bestValidity = null;
    for (const validityStr of Object.keys(vehiclePrices)) {
      const validity = parseInt(validityStr, 10);
      const ticketPrice = vehiclePrices[validityStr];
      const ticketsNeeded = Math.ceil(requiredDays / validity);
      const totalCost = ticketsNeeded * ticketPrice;
      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestValidity = validity;
      }
    }

    return {
      cost: bestCost,
      type: "fixed"
    };
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

  //Slovenia
  SVN: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Slovacia
  SVK: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Portugalia
  PRT: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },
  
  //Spania
  ESP: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Belgia
  BEL: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Polonia
  POL: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Cehia
  CZE: async(tollData) =>{
    const cost = await convertToEuro(tollData.price.value, tollData.price.currency);
    return { cost, type: "perKm" };
  },

  //Elvetia
  CHE: async(tollData) =>{
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
    return amount; // Sau o altă valoare implicită
  }
  return currency === "EUR" ? amount : amount / rates[currency];
};

// 3. Componenta principală
const TollCalculator = ({ startCoordinates, endCoordinates, vehicleType, rawDistance, rawDuration, onTollUpdate }) => {
  const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });

  useEffect(() => {
    if (startCoordinates && endCoordinates && rawDuration) {
      fetchTollData(startCoordinates, endCoordinates, vehicleType);
    }
  }, [startCoordinates, endCoordinates, vehicleType, rawDuration]);

  const fetchTollData = async (start, end, vehicle) => {
    //asta e originalul
    //const url = `https://router.hereapi.com/v8/routes?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&transportMode=truck&truck[axleCount]=${vehicle.axles}&return=tolls,summary&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;
    
    //asta e ala nou
    const url = `https://router.hereapi.com/v8/routes?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&return=polyline,summary,actions,instructions,tolls&transportMode=truck&truck[axleCount]=5&vehicle[grossWeight]=40000&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;
    

    try {
      const response = await fetch(url);
      const data = await response.json();
  
      console.log("Raspuns API:", data);
      //console.log("Total duration (sec):", duration);

      const totalDuration = rawDuration; 
      if (!totalDuration || totalDuration <= 0) {
        console.error("Durata traseului (rawDuration) nu este definită corect.");
        return;
      }
  
      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found");
        return;
      }
  
      // Decizie: Folosim tollSystems dacă există în cel puțin o secțiune
      const useTollSystems = data.routes[0].sections.some(
        section => section.tollSystems && section.tollSystems.length > 0
      );
  
      let tollList = [];
  
      if (useTollSystems) {
        // Folosim datele din tollSystems
        let aggregatedSystems = {};
        for (const section of data.routes[0].sections) {
          if (section.tollSystems && section.tollSystems.length > 0) {
            for (const system of section.tollSystems) {
              if (system.price && system.price.value !== undefined && system.price.currency) {
                const countryCode = system.countryCode;
                if (countryCode && countryCalculators[countryCode]) {
                  // Transmitem totalDuration (timpul total al traseului în secunde)
                  const result = await countryCalculators[countryCode](system, totalDuration, vehicle.axles);
                  aggregatedSystems[countryCode] = {
                    operator: countryCode,
                    cost: result.cost,
                    type: result.type,
                    tollCollectionLocations: system.tollCollectionLocations || [],
                    // Dacă e România, adăugăm detaliul despre validitatea vignietei
                    ...(countryCode === "ROU" && { vignietaValidity: result.vignietaValidity })
                  };
                } else {
                  // Fallback: metoda originală
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
  
        // Dacă avem date în aggregatedSystems, folosim rezultatul
        if (Object.keys(aggregatedSystems).length > 0) {
          tollList = Object.values(aggregatedSystems);
        } else {
          // Dacă aggregatedSystems nu conține date, folosim fallback-ul cu tolls
          tollList = await processTollsFallback(data);
        }
      } else {
        // Folosim direct fallback-ul cu tolls
        tollList = await processTollsFallback(data);
      }
  
      // Calculăm costul total final.
      let totalCost = tollList.reduce((sum, toll) => sum + toll.cost, 0);
    const days = Math.ceil(totalDuration / (24 * 3600));
    if (days > 1) {
      totalCost = tollList.reduce((sum, toll) => sum + toll.cost * days, 0);
    }

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const formattedDuration = `${hours}h ${minutes}m`;

    setTollDetails({ totalCost, tollList });
    onTollUpdate({ totalCost, tollList, duration: formattedDuration });
  } catch (error) {
    console.error("Error fetching toll data:", error);
  }

    
  };
  
  // Funcție fallback pentru procesarea datelor din array-ul tolls
  const processTollsFallback = async (data) => {
    let tollMap = {};
    for (const section of data.routes[0].sections) {
      if (section.tolls && section.tolls.length > 0) {
        for (const toll of section.tolls) {
          const countryCode = toll.countryCode;
          for (const fare of toll.fares) {
            if (countryCode && countryCalculators[countryCode]) {
              const sectionMetric = (countryCode === "DEU" || countryCode === "HUN" || countryCode === "AUT" || countryCode === "FRA"  || countryCode === "ITA" || countryCode === "SVN" || countryCode === "PRT" || countryCode === "ESP" || countryCode === "BEL" || countryCode === "POL"  || countryCode === "CZE" || countryCode === "SVK" || countryCode === "CHE")
              ? (section.summary?.length || 0)
              : rawDuration;
            const result = await countryCalculators[countryCode](fare, sectionMetric);
              const key = `${countryCode}-${fare.name}`;
              if (tollMap[key]) {
                if (countryCode === "DEU" || countryCode === "HUN" || countryCode === "AUT" || countryCode === "FRA"  || countryCode === "ITA" || countryCode === "SVN" || countryCode === "PRT" || countryCode === "ESP" || countryCode === "BEL" || countryCode === "POL"  || countryCode === "CZE" || countryCode === "SVK" || countryCode === "CHE") {
                  tollMap[key].cost += result.cost; // adunăm costurile pentru DEU
                } else {
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

  return null; // Componentul nu afișează nimic direct
};

export default TollCalculator;









/*
import React, { useEffect, useState } from "react";

const exchangeRates = async () => {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR'); // API pentru cursuri de schimb
    const data = await response.json();
    return data.rates; // Returnează obiectul cu cursurile de schimb
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return {}; // Returnează un obiect gol în caz de eroare
  }
};

const convertToEuro = async (amount, currency) => {
  const rates = await exchangeRates();
  if (rates[currency]) {
    return amount / rates[currency];
  }
  return amount; // Dacă nu există un curs de schimb, returnează suma originală
};

const TollCalculator = ({ startCoordinates, endCoordinates, vehicleType, onTollUpdate }) => {
  const [tollDetails, setTollDetails] = useState({ totalCost: 0, tollList: [] });
  const [duration, setDuration] = useState(null); // State pentru durata

  useEffect(() => {
    if (startCoordinates && endCoordinates) {
      fetchTollData(startCoordinates, endCoordinates, vehicleType);
    }
  }, [startCoordinates, endCoordinates, vehicleType]);

  const fetchTollData = async (start, end, vehicle) => {
    const url = `https://router.hereapi.com/v8/routes?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&transportMode=truck&truck[axleCount]=${vehicle.axles}&return=tolls,summary&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;
    //&transportMode=truck&truck[axleCount]=${vehicle.axles}
    try {
      const response = await fetch(url);
      const data = await response.json();

      console.log("Raspuns API:", data);
      
      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found");
        return;
      }

      let totalDuration = 0; // în secunde
      
      // Vom încerca mai întâi să agregăm costurile din tollSystems, care sunt valorile agregate
      let aggregatedSystems = {}; // cheie: operator (de exemplu, "AUTOSTRADE PER L'ITALIA S.P.A.")
      
      // Parcurgem fiecare secțiune a traseului
      for (const section of data.routes[0].sections) {
        if (section.summary) {
          totalDuration += section.summary.duration;
        }
        // Dacă secțiunea are tollSystems, le folosim pentru agregare
        if (section.tollSystems && section.tollSystems.length > 0) {
          for (const system of section.tollSystems) {
            // Verificăm dacă sistemul de taxare are prețul definit
            if (system.price && system.price.value !== undefined && system.price.currency) {
              const key = system.tollSystem; 
              const costInEuro = await convertToEuro(system.price.value, system.price.currency);
              if (aggregatedSystems[key]) {
                // Dacă secțiuni diferite se suprapun, putem folosi valoarea maximă
                aggregatedSystems[key].cost = Math.max(aggregatedSystems[key].cost, costInEuro);
              } else {
                aggregatedSystems[key] = {
                  operator: key,
                  cost: costInEuro,
                  currency: system.price.currency,
                  tollCollectionLocations: system.tollCollectionLocations || []
                };
              }
            } else {
              console.warn("Missing price information in tollSystem:", system);
            }
          }
        }
      }
      
      // Dacă am găsit valori agregate din tollSystems, le folosim; altfel, revenim la agregarea din tolls.
      let tollList = [];
      if (Object.keys(aggregatedSystems).length > 0) {
        tollList = Object.values(aggregatedSystems);
      } else {
        // Fallback: folosim agregarea din array-ul tolls
        let tollMap = {};
        for (const section of data.routes[0].sections) {
          if (section.tolls && section.tolls.length > 0) {
            for (const toll of section.tolls) {
              const locKey = (toll.tollCollectionLocations && toll.tollCollectionLocations.length > 0)
                ? toll.tollCollectionLocations.map(loc => loc.name).join("_")
                : "";
              for (const fare of toll.fares) {
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
        tollList = Object.values(tollMap);
      }
      
      // Calculăm costul total final.
      let totalCost = tollList.reduce((sum, toll) => sum + toll.cost, 0);
      
      // Pentru calculul de proratare (dacă se aplică taxa pe zi)
      const days = Math.ceil(totalDuration / (24 * 3600));
      if (days > 1) {
        totalCost = tollList.reduce((sum, toll) => sum + toll.cost * days, 0);
      }
      
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      const formattedDuration = `${hours}h ${minutes}m`;

      setTollDetails({ totalCost, tollList });
      onTollUpdate({ totalCost, tollList, duration: formattedDuration });
    } catch (error) {
      console.error("Error fetching toll data:", error);
    }
  };

  return null; // Componentul nu afișează nimic direct
};

export default TollCalculator;*/