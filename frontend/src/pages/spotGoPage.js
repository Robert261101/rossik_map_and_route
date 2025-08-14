// pages/spotGoPage.js
import React, { useEffect, useState, useRef, memo } from "react";
import AutoCompleteInput from "../AutoCompleteInput";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import countries from "i18n-iso-countries";
import enLocale  from "i18n-iso-countries/langs/en.json";
import Header from '../components/header';
import { shortCodeFor, fullNameForShortCode } from "../utils/userShortCodes";

countries.registerLocale(enLocale);


const PREFIX_PASSWORD = "parola_ta_secreta";
const DEFAULT_PREFIX = "APP-OFFER-";

const MULTI_MIN = 2;
const MULTI_MAX = 5;
const RADIUS_MAX = 250;


const vehicleTypes = {
  1: "Semi trailer",
  2: "Solo (<12t)",
  3: "Solo (<7.5t)",
  4: "Van",
  5: "Double Trailer"
};
const bodyTypes = {
  1: "Tent", // tilt
  2: "Reefer",
  3: "Tautliner",
  4: "Box",
  5: "Isotherm",
  6: "Mega",
  7: "Jumbo",
  8: "Van",
  //9: ,   // 
  10: "Any", //
  11: "Platform", // 
  12: "Road Train 120m3", //
  13: "Tanker", // 
  14: "Walking  Floor", //
  15: "Coil Mudle", //
  16: "Dump Truck", // 
  17: "Car Transporter", // 
  18: "Joloda", //
  19: "Low Loader", // 
  20:"Silos"
};

// const bodyTypes = {
//   1: "Tent",
//   2: "Reefer",
//   3: "Tautliner",
//   4: "Box",
//   5: "Isotherm",
//   6: "Mega",
//   7: "Jumbo",
//   8: "Van",
//   9: "Platform",   // - invalid code
//   10: "Road Train 120m3", //Any
//   11: "Tanker", // Platform
//   12: "Walking Floor", //Road Train 120m3
//   13: "Coil Mulde", // Tanker
//   14: "Dump Truck", //Walking  Floor
//   15: "Car Transporter", //Coil Mudle
//   16: "Joloda", // Dump Truck
//   17: "Low Loader", // Car Transporter
//   18: "Silos", //Joloda
//   19: "Any" // Low Loader
// };

const Modal = memo(function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  const backdrop = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  };
  const card = {
    background: '#fff', borderRadius: 8, width: 'min(560px, 92vw)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.25)', padding: 16
  };
  const xBtn = {
    border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1,
    cursor: 'pointer', padding: 4, color: '#b91c1c'
  };

  return (
    <div style={backdrop} onMouseDown={onClose}>
      <div
        style={card}
        role="dialog"
        aria-modal="true"
        onMouseDown={e => e.stopPropagation()} // keep clicks inside from closing
      >
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h4 style={{margin:0}}>{title}</h4>
          <button type="button" onClick={onClose} aria-label="Close" style={xBtn}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
});


export default function SpotGoPage({ user }) {

    const [hideLocations, setHideLocations] = useState(false);
    const [palletsExchange, setPalletsExchange] = useState(false);

    const todayStr = new Date().toISOString().slice(0,10);
    const [loadStartDate, setLoadStartDate] = useState(todayStr);
    const [loadStartTime, setLoadStartTime] = useState("");
    const [loadEndDate, setLoadEndDate] = useState(todayStr);
    const [loadEndTime, setLoadEndTime] = useState("");
    const [unloadStartDate, setUnloadStartDate] = useState(todayStr);
    const [unloadStartTime, setUnloadStartTime] = useState("");
    const [unloadEndDate, setUnloadEndDate] = useState(todayStr);
    const [unloadEndTime, setUnloadEndTime] = useState("");

    const [lengthM, setLengthM] = useState("13.6");
    const [weightT, setWeightT] = useState("24");
    const [externalComment, setExternalComment] = useState("");
    const [freightCharge, setFreightCharge] = useState("");
    const [currency, setCurrency] = useState("");
    const [paymentDue, setPaymentDue] = useState("");

    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const [selectedBodies, setSelectedBodies] = useState([]);

    const [offers, setOffers] = useState([]);
    const [loadingLocation, setLoadingLocation] = useState(null);
    const [unloadingLocation, setUnloadingLocation] = useState(null);
    const [isPrefilling, setIsPrefilling] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingOfferId, setEditingOfferId] = useState(null);
    const [resetKey, setResetKey] = useState(0);

    const [postMultiple, setPostMultiple] = useState(false);
    const [multiCount, setMultiCount] = useState(3);   // default inside [2..5]
    const [radiusKm, setRadiusKm] = useState(150);     // default, max 250

    // (for next steps)
    const [showPreview, setShowPreview] = useState(false);
    const [previewCandidates, setPreviewCandidates] = useState([]); // list of proposed cities

    const formRef = useRef(null);
    const [listMaxH, setListMaxH] = useState(0);

    const [showMultiConfig, setShowMultiConfig] = useState(false);

    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewItems, setPreviewItems] = useState([]); // enriched candidates including selection

    const [countDraft, setCountDraft]   = useState(String(multiCount));
    const [radiusDraft, setRadiusDraft] = useState(String(radiusKm));

    // batch-posting state
    const [isBatchPosting, setIsBatchPosting] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
    const [batchLog, setBatchLog] = useState([]); // [{city, ok, id?, error?}]
    // which side to expand (null | 'loading' | 'unloading')
    const [batchTarget, setBatchTarget] = useState(null);


    const showPreviewAction = postMultiple && !showMultiConfig;
    const needAddressPicked =
        batchTarget === 'unloading' ? !!unloadingLocation : !!loadingLocation;

    const postMultipleLoading    = postMultiple && batchTarget === 'loading';
    const postMultipleUnloading  = postMultiple && batchTarget === 'unloading';

    const navigate = useNavigate()

    const HERE_API_KEY = process.env.REACT_APP_HERE_API_KEY;  // pulled at build time

    const API_BASE =
        process.env.REACT_APP_API_BASE ??
        (window.location.hostname === 'localhost'
            ? 'http://localhost:4000'
            : window.location.origin);


    const handleLoadingSelect = async (loc) => {
        const enriched = await reverseWithFallback(loc, HERE_API_KEY);
        setLoadingLocation({ ...loc, ...enriched });
    };

    const handleUnloadingSelect = async (loc) => {
        const enriched = await reverseWithFallback(loc, HERE_API_KEY);
        setUnloadingLocation({ ...loc, ...enriched });
    };

    const buildDbTs = (d, t) => `${d}T${t}:00`;  // stays exactly as typed

    const parseDbDate = s => s?.slice(0,10) ?? todayStr;
    const parseDbHHMM = s => s?.slice(11,16) ?? "08:00";

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));


    // put this above handleSubmitOffer
    function resetForm() {
        const today = new Date();
        const todayStr = today.toISOString().slice(0,10);

        const nextHour = new Date(today);
        nextHour.setMinutes(0,0,0);
        nextHour.setHours(today.getHours() + 1);
        const startHHMM = nextHour.toTimeString().slice(0,5);

        const end = new Date(nextHour);
        end.setHours(nextHour.getHours() + 2);
        const endHHMM = end.toTimeString().slice(0,5);

        // locations
        setLoadingLocation(null);
        setUnloadingLocation(null);

        setResetKey(k => k + 1);

        // dates
        setLoadStartDate(todayStr);
        setLoadEndDate(todayStr);
        setUnloadStartDate(todayStr);
        setUnloadEndDate(todayStr);

        // times
        setLoadStartTime(startHHMM);
        setLoadEndTime(endHHMM);
        setUnloadStartTime(startHHMM);
        setUnloadEndTime(endHHMM);

        // misc fields
        setLengthM("13.6");
        setWeightT("24");
        setExternalComment("");
        setFreightCharge("");
        setCurrency("");      // or "EUR" if you want EUR selected by default
        setPaymentDue("");
        setHideLocations(false);
        setPalletsExchange(false);
        setSelectedVehicles([]);
        setSelectedBodies([]);
        setPostMultiple(false);
        setBatchTarget(null);
        setShowMultiConfig(false);
        setShowPreview(false);
        setPreviewItems([]);
    }

    
    async function refreshSubmittedOffers() {
        const { data, error } = await supabase
            .from('submitted_offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to fetch submitted offers:", error);
        } else {
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email || "unknown@user.com";
            const finalPrefix = formatName(userEmail);
            const userShortCode = shortCodeFor(userEmail);

            const formatted = data.map(o => {

                // Format Loading Address
                let formattedLoading = o.loading_address || "";
                if (formattedLoading) {
                    const postalMatch = formattedLoading.match(/\d{4,}/)?.[0] || "";
                    const addressOnly = formattedLoading.replace(/.*?(?=\d{4,})\d{4,}\s*/, "").replace(/,?\s*[^,]+$/, "").trim();
                    const countryMatch = formattedLoading.match(/([A-Za-z ]+),?\s*$/);
                    const country = countryMatch ? countryMatch[1].trim() : "";
                    const cc = countries.getAlpha2Code(country, "en") || "";

                    formattedLoading = postalMatch
                    ? `${cc}-${postalMatch} ${addressOnly}`
                    : `${addressOnly}, ${country}`;
                }

                // Format Unloading Address
                let formattedUnloading = o.unloading_address || "";
                if (formattedUnloading) {
                    const postalMatch = formattedUnloading.match(/\d{4,}/)?.[0] || "";
                    const addressOnly = formattedUnloading.replace(/.*?(?=\d{4,})\d{4,}\s*/, "").replace(/,?\s*[^,]+$/, "").trim();
                    const countryMatch = formattedUnloading.match(/([A-Za-z ]+),?\s*$/);
                    const country = countryMatch ? countryMatch[1].trim() : "";
                    const cc = countries.getAlpha2Code(country, "en") || "";

                    formattedUnloading = postalMatch
                    ? `${cc}-${postalMatch} ${addressOnly}`
                    : `${addressOnly}, ${country}`;
                }
                    const isMine = o.external_number === finalPrefix;

                    return {
                        id: o.offer_id,
                        externalNumber: fullNameForShortCode(o.external_number),
                        _loading: formattedLoading,
                        _unloading: formattedUnloading,
                        isMine
                    };
                });

            formatted.sort((a, b) => {
                if (a.isMine === b.isMine) return 0;
                return a.isMine ? -1 : 1;
            });

            setOffers(formatted);
        }
    }

    useEffect(() => {
        refreshSubmittedOffers();
    }, []);

    useEffect(() => {
        if (!formRef.current) return;
        const el = formRef.current;

        const update = () => setListMaxH(el.offsetHeight);

        const ro = new ResizeObserver(update);
        ro.observe(el);

        update(); // initial
        window.addEventListener('resize', update);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);


    useEffect(() => {
        localStorage.setItem("spotgo_offers", JSON.stringify(offers));
    }, [offers]);

    useEffect(() => {
        if (isPrefilling) {
            return;  // ⛔️ blocăm override-ul
            }
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        const timeStr = nextHour.toTimeString().slice(0, 5);
        setLoadStartTime(loadStartDate === todayStr ? timeStr : "08:00");
    }, [loadStartDate]);

    useEffect(() => {
        if (isPrefilling) return;  // ⛔️ blocăm override-ul
        const now = new Date();
        const end = new Date(now);
        end.setHours(now.getHours() + 2);
        end.setMinutes(0, 0, 0);
        const timeStr = end.toTimeString().slice(0, 5);
        setLoadEndTime(loadEndDate === todayStr ? timeStr : "15:00");
    }, [loadEndDate]);

    useEffect(() => {
        if (isPrefilling) return;  // ⛔️ blocăm override-ul
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        const timeStr = nextHour.toTimeString().slice(0, 5);
        setUnloadStartTime(unloadStartDate === todayStr ? timeStr : "08:00");
    }, [unloadStartDate]);

    useEffect(() => {
        if (isPrefilling) return;  // ⛔️ blocăm override-ul
        const now = new Date();
        const end = new Date(now);
        end.setHours(now.getHours() + 2);
        end.setMinutes(0, 0, 0);
        const timeStr = end.toTimeString().slice(0, 5);
        setUnloadEndTime(unloadEndDate === todayStr ? timeStr : "15:00");
    }, [unloadEndDate]);

    useEffect(() => {
        if (!loadingLocation && batchTarget === 'loading') {
            setPostMultiple(false);
            setShowPreview(false);
            setShowMultiConfig(false);
            setBatchTarget(null);
        }
    }, [loadingLocation]);

    useEffect(() => {
        if (!unloadingLocation && batchTarget === 'unloading') {
            setPostMultiple(false);
            setShowPreview(false);
            setShowMultiConfig(false);
            setBatchTarget(null);
        }
    }, [unloadingLocation]);

/**
 * Reverse‑geocode in expanding radii until we get a postalCode + valid 2‑letter countryCode.
 * If that fails, fall back to a forward‑geocode on the label.
 */
    async function reverseWithFallback(loc, apiKey) {
    const radii = [0, 100, 500, 1000, 5000];
    let lastAddr = null;
    const base   = "https://revgeocode.search.hereapi.com/v1/revgeocode";
    // note the correct `lang=` here
    const common = `?at=${loc.lat},${loc.lng}&lang=en-US&limit=1&apiKey=${apiKey}`;

    // 1) Spiral‑out reverse‑geocoding
    for (const r of radii) {
        const url = r === 0
            ? `${base}?at=${loc.lat},${loc.lng}&lang=en-US&limit=1&apiKey=${apiKey}`
            : `${base}?in=circle:${loc.lat},${loc.lng};r=${r}&lang=en-US&limit=1&apiKey=${apiKey}`;

        try {
        const resp = await fetch(url);
        if (!resp.ok) continue;

        const { items = [] } = await resp.json();
        const addr = items[0]?.address;
        if (!addr) continue;

        // normalize CC
        const rawCC = addr.countryCode || "";
        const cc2 = countries.alpha3ToAlpha2(rawCC) || (rawCC.length === 2 && rawCC) || "";
        addr.countryCode = cc2;

        lastAddr = addr;
        if (addr.postalCode && cc2.length === 2) {
            return addr; // ✅ success
        }
        } catch (e) {
        console.warn(`reverse@r=${r} failed:`, e);
        }
    }

    // 2) Forward‑geocode fallback
    if (!lastAddr?.postalCode) {
        const label = lastAddr?.label || loc.label;
        const geoUrl =
            `https://geocode.search.hereapi.com/v1/geocode` +
            `?q=${encodeURIComponent(label)}` +
            `&lang=en-US&limit=1&apiKey=${apiKey}`;

            try {
            const gr = await fetch(geoUrl);
            if (gr.ok) {
                const { items = [] } = await gr.json();
                const fwd = items[0]?.address;
                if (fwd?.postalCode) {
                lastAddr.postalCode = fwd.postalCode;
                const rawCC2 = fwd.countryCode || "";
                lastAddr.countryCode = 
                    countries.alpha3ToAlpha2(rawCC2) 
                    || (rawCC2.length === 2 && rawCC2) 
                    || lastAddr.countryCode;
                }
            }
            } catch (e) {
            console.warn("forward‑geocode failed:", e);
            }
        }

        return lastAddr || {};
    }

    // --- distance + geometry helpers ---
    const EARTH_KM = 6371;
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;

    function haversineKm(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const la1 = toRad(a.lat), la2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
    }

    function destPoint(lat, lng, bearingDeg, distKm) {
    const br = toRad(bearingDeg);
    const dr = distKm / EARTH_KM;
    const la1 = toRad(lat), lo1 = toRad(lng);

    const la2 = Math.asin(Math.sin(la1)*Math.cos(dr) + Math.cos(la1)*Math.sin(dr)*Math.cos(br));
    const lo2 = lo1 + Math.atan2(
        Math.sin(br)*Math.sin(dr)*Math.cos(la1),
        Math.cos(dr)-Math.sin(la1)*Math.sin(la2)
    );

    return { lat: toDeg(la2), lng: ((toDeg(lo2)+540)%360) - 180 }; // normalize lon
    }

    function cityFromAddress(addr) {
    if (addr?.city) return addr.city;
    const label = addr?.label || '';
    const parts = label.split(',');
    return parts.length >= 2 ? parts[parts.length - 2].trim() : 'Unknown';
    }

    function localityKey(addr) {
    const city = (cityFromAddress(addr) || '').toLowerCase().trim();
    const cc   = (addr?.countryCode || '').toLowerCase().trim();
    return `${city}|${cc}`;
    }

    function asCandidate(addr, center) {
    const lat = addr?.lat, lng = addr?.lng;
    const d = (typeof lat === 'number' && typeof lng === 'number')
        ? haversineKm(center, {lat, lng}) : 0;
    return {
        key: localityKey(addr),
        city: cityFromAddress(addr),
        countryCode: addr?.countryCode || '',
        postalCode: addr?.postalCode || '',
        label: addr?.label || `${cityFromAddress(addr)}, ${addr?.countryCode || ''}`,
        lat: addr?.lat, lng: addr?.lng,
        distanceKm: Math.round(d),
        selected: false,
        pinned: false
    };
    }

    async function findNearbyLocalities(center, radiusKm, wantCount, apiKey) {
        // sample 3 rings x 12 bearings = 36 points (fast enough), early exit when we have enough
        const rings = [0.35, 0.7, 1.0].map(f => Math.max(5, Math.min(radiusKm, Math.round(radiusKm * f))));
        const bearings = Array.from({length: 12}, (_, i) => i * (360/12));
        const pts = [];
        for (const r of rings) for (const b of bearings) pts.push(destPoint(center.lat, center.lng, b, r));

        const seen = new Map(); // key -> candidate
        const batchSize = 4;
        for (let i = 0; i < pts.length; i += batchSize) {
            const chunk = pts.slice(i, i + batchSize);
            const results = await Promise.all(chunk.map(p => reverseWithFallback(p, apiKey).catch(()=>null)));
            for (const addr of results) {
            if (!addr || !addr.countryCode || !addr.postalCode) continue;
            const k = localityKey(addr);
            if (!k) continue;
            if (!seen.has(k)) seen.set(k, asCandidate(addr, center));
            }
            // keep a healthy buffer (x3) for unchecks/auto-replace
            if (seen.size >= wantCount * 3) break;
        }

        const list = Array.from(seen.values()).sort((a,b) => a.distanceKm - b.distanceKm);
        return list;
    }




//   function handleModifyPrefix() {
//     const pw = prompt("Enter password to modify prefix:");
//     if (pw === PREFIX_PASSWORD) {
//       setPrefixEditEnabled(true);
//       alert("Prefix editing unlocked.");
//     } else if (pw !== null) {
//       alert("Incorrect password.");
//     }
//   }

//   function handleSavePrefix() {
//     const newPref = prefix.trim();
//     if (!newPref) {
//       alert("Prefix cannot be empty.");
//       return;
//     }
//     setPrefix(newPref);
//     localStorage.setItem("spotgo_prefix", newPref);
//     setPrefixEditEnabled(false);
//     alert(`Prefix "${newPref}" saved.`);
//   }

    const formatName = (email = '') => {
        if (!email.includes('@')) return '';
        const local = email.split('@')[0];
        return local
            .split('.')
            .map(p => p[0]?.toUpperCase() + p.slice(1))
            .join(' ');
    };


    function toggleVehicleType(id) {
        setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
    }

    function toggleBodyType(id) {
        setSelectedBodies(prev => {
        if (prev.includes(id)) return prev.filter(b => b !== id);
        if (prev.length >= 5) {
            alert("You can select up to 5 body types.");
            return prev;
        }
        return [...prev, id];
        });
    }

    const address0 = loadingLocation;
    const address1 = unloadingLocation;

    async function handleSubmitOffer(e) {
        e.preventDefault();
        if (!loadingLocation || !unloadingLocation) {
            alert("Please select both loading and unloading addresses from the suggestions.");
            return;
        }
        if (selectedVehicles.length === 0) {
            alert("Please select at least one vehicle type.");
            return;
        }
        if (selectedBodies.length === 0) {
            alert("Please select at least one body type.");
            return;
        }

        const lengthVal = parseFloat(lengthM);
        const weightVal = parseFloat(weightT);
        if (isNaN(lengthVal) || lengthVal <= 0) {
            alert("Invalid length value.");
            return;
        }
        if (isNaN(weightVal) || weightVal <= 0) {
            alert("Invalid weight value.");
            return;
        }

        const loadStart = new Date(`${loadStartDate}T${loadStartTime}:00`);
        const loadEnd = new Date(`${loadEndDate}T${loadEndTime}:00`);
        const unloadStart = new Date(`${unloadStartDate}T${unloadStartTime}:00`);
        const unloadEnd = new Date(`${unloadEndDate}T${unloadEndTime}:00`);
        if (!(loadStart < loadEnd)) {
            alert("Loading start time must be before loading end time.");
            return;
        }
        if (!(unloadStart < unloadEnd)) {
            alert("Unloading start time must be before unloading end time.");
            return;
        }

        let paymentTerm;
        if (paymentDue) {
            const dueDateObj = new Date(paymentDue);
            const today = new Date();
            dueDateObj.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            if (dueDateObj <= today) {
                alert("Payment due date must be in the future.");
                return;
            }
            const diffMs = dueDateObj - today;
            paymentTerm = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (paymentTerm < 1) paymentTerm = 1;
        }

        if (address0.countryCode.length !== 2 || address1.countryCode.length !== 2) {
            alert("Couldn’t resolve a valid 2‑letter country code for one of your locations.");
            return;
        }
        if (!address0.postalCode || !address1.postalCode) {
            alert("Postal code is missing for one of your locations. Please refine your pick or enter it manually.");
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || "unknown@user.com";


        const finalPrefix = formatName(userEmail);

        const extractCity = (label = '') => {
            const parts = label.split(',');
            // Încercăm să luăm al doilea sau penultimul cuvânt din adresă, dacă pare a fi oraș
            return parts.length >= 2 ? parts[parts.length - 2].trim() : "Unknown";
        };

        const cleanAddress = (raw) => ({
            countryCode: raw.countryCode,
            postalCode: raw.postalCode,
            city: raw.city || extractCity(raw.label),
            coordinates: {
                latitude: raw.lat,
                longitude: raw.lng
            }
        });

        
        function cleanObject(obj) {
            if (Array.isArray(obj)) {
                return obj.map(cleanObject);
            } else if (typeof obj === "object" && obj !== null) {
                return Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .reduce((acc, [k, v]) => {
                    acc[k] = cleanObject(v);
                    return acc;
                }, {});
            }
            return obj;
        }



        const payload = {
            type: "Spot",
            externalNumber: shortCodeFor(userEmail),
            sources: ["1","2","3","4","8","9","12","14","16"],
            useAlternativeLocations: hideLocations,
            locations: [
                {
                sequence: 1,
                type: "Loading",
                address: cleanAddress(address0),
                period: {
                    startDate: `${loadStartDate}T${loadStartTime}:00Z`,
                    endDate:   `${loadEndDate}T${loadEndTime}:00Z`
                }
                },
                {
                sequence: 2,
                type: "Unloading",
                address: cleanAddress(address1),
                period: {
                    startDate: `${unloadStartDate}T${unloadStartTime}:00Z`,
                    endDate:   `${unloadEndDate}T${unloadEndTime}:00Z`
                }
                }
            ],
            requirements: {
                capacity:       parseFloat(weightT),
                ldm:            parseFloat(lengthM),
                pallets:        33,
                loadingSide:    "All",
                palletsExchange,
                vehicleTypes:   selectedVehicles,
                trailerTypes:   selectedBodies,
                ftl:            parseFloat(lengthM) >= 13.6
            },
            comments: [shortCodeFor(userEmail), externalComment].filter(Boolean).join(" - "),
            internalComments: hideLocations
                ? "Locations hidden."
                : "Load/Unload points visible."
        };

        if (freightCharge || currency || paymentDue) {
            const pay = {};

            if (freightCharge) {
                pay.from = parseFloat(freightCharge) || 0;
            }

            if (currency) {
                pay.currency = currency;
            }

            if (paymentDue) {
                const dueDateStr = new Date(paymentDue).toISOString().split('T')[0]; // "YYYY-MM-DD"
                pay.dueDate = dueDateStr;
            }

            payload.payment = pay;
        }

        if (externalComment) {
            payload.comments = externalComment;
        }

        const token = session?.access_token;
        const cleanPayload = cleanObject(payload);

        try {

            const endpoint = isEditing
                ? `${API_BASE}/api/spotgo/${editingOfferId}`
                : `${API_BASE}/api/spotgo/submit`;
            const method   = isEditing ? "PUT" : "POST";
            const bodyToSend = isEditing ? cleanPayload : payload;

            if (!bodyToSend?.locations?.length) {
                console.error("🚨 No SpotGo payload being sent!");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
            alert('Please sign in first.');
            return;
            }
            const token = session.access_token;
            const userEmail = session.user.email;

            const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '1.0',
            'authorization-email': userEmail,
            'Authorization': `Bearer ${token}`,
            };


            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'authorization-email': userEmail,
                    'Content-Type': 'application/json',
                    'x-api-version': '1.0'
                },
                body: JSON.stringify(bodyToSend)
            });

            const raw = await res.text();
            if (!res.ok) {
            alert(`Failed to submit offer: ${raw}`);
            return;
            }

            let result;
            try { result = raw ? JSON.parse(raw) : {}; }  // tolerate empty body
            catch { result = { raw }; }


        try {
            if (isEditing && editingOfferId) {
                const { error } = await supabase
                    .from('submitted_offers')
                    .update({
                    external_number: formatName(userEmail),
                    loading_address: address0?.label || '',
                    unloading_address: address1?.label || '',
                    updated_at: new Date().toISOString(),

                    loading_country_code: address0?.countryCode || null,
                    loading_postal_code: address0?.postalCode || null,
                    loading_lat: address0?.lat || null,
                    loading_lng: address0?.lng || null,

                    unloading_country_code: address1?.countryCode || null,
                    unloading_postal_code: address1?.postalCode || null,
                    unloading_lat: address1?.lat || null,
                    unloading_lng: address1?.lng || null,

                    loading_start_time: buildDbTs(loadStartDate,  loadStartTime),
                    loading_end_time: buildDbTs(loadEndDate,    loadEndTime),
                    unloading_start_time: buildDbTs(unloadStartDate,unloadStartTime),
                    unloading_end_time: buildDbTs(unloadEndDate,  unloadEndTime),

                    external_comment: externalComment || null,
                    hide_locations: hideLocations,
                    pallets_exchange: palletsExchange,
                    vehicle_types: selectedVehicles.length ? selectedVehicles : null,
                    body_types: selectedBodies.length ? selectedBodies : null,
                    freight_charge: freightCharge ? parseFloat(freightCharge) : null,
                    currency: currency || null,
                    payment_due: paymentDue || null,
                    length_m: lengthM ? parseFloat(lengthM) : null,
                    weight_t: weightT ? parseFloat(weightT) : null,
                    submitted_by_email: userEmail
                    })
                    .eq('offer_id', editingOfferId);

                if (error) {
                    console.error("Failed to update offer in Supabase:", error.message);
                }

                // Resetezi starea de editare
                setIsEditing(false);
                setEditingOfferId(null);
                } else {
                const { error } = await supabase
                    .from('submitted_offers')
                    .insert([
                    {
                        offer_id: result.id || null,
                        external_number: formatName(userEmail),
                        loading_address: address0?.label || '',
                        unloading_address: address1?.label || '',
                        updated_at: new Date().toISOString(),

                        loading_country_code: address0?.countryCode || null,
                        loading_postal_code: address0?.postalCode || null,
                        loading_lat: address0?.lat || null,
                        loading_lng: address0?.lng || null,

                        unloading_country_code: address1?.countryCode || null,
                        unloading_postal_code: address1?.postalCode || null,
                        unloading_lat: address1?.lat || null,
                        unloading_lng: address1?.lng || null,

                        loading_start_time:  buildDbTs(loadStartDate,  loadStartTime),
                        loading_end_time:    buildDbTs(loadEndDate,    loadEndTime),
                        unloading_start_time:buildDbTs(unloadStartDate,unloadStartTime),
                        unloading_end_time:  buildDbTs(unloadEndDate,  unloadEndTime),

                        external_comment: externalComment || null,
                        hide_locations: hideLocations,
                        pallets_exchange: palletsExchange,
                        vehicle_types: selectedVehicles.length ? selectedVehicles : null,
                        body_types: selectedBodies.length ? selectedBodies : null,
                        freight_charge: freightCharge ? parseFloat(freightCharge) : null,
                        currency: currency || null,
                        payment_due: paymentDue || null,
                        length_m: lengthM ? parseFloat(lengthM) : null,
                        weight_t: weightT ? parseFloat(weightT) : null,
                        submitted_by_email: userEmail
                    }
                    ]);

                if (error) {
                    console.error("Failed to insert full offer in Supabase:", error.message);
                }
            }
        } catch (e) {
        console.error("Supabase insert exception:", e.message);
        }

        // Refresh the table view
        await refreshSubmittedOffers();
        resetForm();
        setIsPrefilling(false);
        setIsEditing(false);
        setEditingOfferId(null);

        if(isEditing) {
            alert("Succesfully updated offer!")
        }
        
        } catch (error) {
            console.error("Submit offer error:", error);
            alert("An unexpected error occurred during submission.");
        }
    }

    async function handleEditOffer(offer) {
        if (!offer?.id) return;

        supabase
            .from('submitted_offers')
            .select('*')
            .eq('offer_id', offer.id)
            .single()
            .then(({ data, error }) => {
            if (error || !data) {
                alert("Failed to fetch full offer data.");
                console.error("Edit error:", error);
                return;
            }

            // console.log("Loaded offer for edit:", data);
            setIsPrefilling(true);
            setIsEditing(true);
            setEditingOfferId(offer.id);  // Store ID to be used on submit

            // 🔽 Location reconstruction (HERE-compatible object)
            setLoadingLocation({
                label: data.loading_address,
                lat: data.loading_lat,
                lng: data.loading_lng,
                postalCode: data.loading_postal_code,
                countryCode: data.loading_country_code
            });
            
            setUnloadingLocation({
                label: data.unloading_address,
                lat: data.unloading_lat,
                lng: data.unloading_lng,
                postalCode: data.unloading_postal_code,
                countryCode: data.unloading_country_code
            });



            setLoadStartDate(parseDbDate(data.loading_start_time));
            setLoadStartTime(parseDbHHMM(data.loading_start_time));

            setLoadEndDate(parseDbDate(data.loading_end_time));
            setLoadEndTime(parseDbHHMM(data.loading_end_time));

            setUnloadStartDate(parseDbDate(data.unloading_start_time));
            setUnloadStartTime(parseDbHHMM(data.unloading_start_time));

            setUnloadEndDate(parseDbDate(data.unloading_end_time));
            setUnloadEndTime(parseDbHHMM(data.unloading_end_time));

            // 🔽 All other fields
            setLengthM(String(data.length_m || "13.6"));
            setWeightT(String(data.weight_t || "24"));
            setExternalComment(data.external_comment || "");
            setFreightCharge(data.freight_charge ? String(data.freight_charge) : "");
            setCurrency(data.currency || "EUR");
            setPaymentDue(data.payment_due || "");

            setHideLocations(!!data.hide_locations);
            setPalletsExchange(!!data.pallets_exchange);
            setSelectedVehicles(data.vehicle_types || []);
            setSelectedBodies(data.body_types || []);
        
            alert("📋 Form copied, ready to be edited.");

        });
    }

    async function handleCopyOffer(offer) {
        if (!offer?.id) return;

        const { data, error } = await supabase
            .from('submitted_offers')
            .select('*')
            .eq('offer_id', offer.id)
            .single();

        if (error || !data) {
            alert("Failed to fetch full offer data.");
            console.error("Copy error:", error);
            return;
        }

        setIsPrefilling(true);
        // 🔽 Location reconstruction (HERE-compatible object)
        setLoadingLocation({
            label: data.loading_address,
            lat: data.loading_lat,
            lng: data.loading_lng,
            postalCode: data.loading_postal_code,
            countryCode: data.loading_country_code
        });
        
        console.log("setting loadingLocation", {
            label: data.loading_address,
            lat: data.loading_lat,
            lng: data.loading_lng,
            postalCode: data.loading_postal_code,
            countryCode: data.loading_country_code
        });

        setUnloadingLocation({
            label: data.unloading_address,
            lat: data.unloading_lat,
            lng: data.unloading_lng,
            postalCode: data.unloading_postal_code,
            countryCode: data.unloading_country_code
        });

        setLoadStartDate(parseDbDate(data.loading_start_time));
        setLoadStartTime(parseDbHHMM(data.loading_start_time));
        console.log("Setting loadStartTime =", data.loading_start_time);

        setLoadEndDate(parseDbDate(data.loading_end_time));
        setLoadEndTime(parseDbHHMM(data.loading_end_time));

        setUnloadStartDate(parseDbDate(data.unloading_start_time));
        setUnloadStartTime(parseDbHHMM(data.unloading_start_time));

        setUnloadEndDate(parseDbDate(data.unloading_end_time));
        setUnloadEndTime(parseDbHHMM(data.unloading_end_time));

        // 🔽 All other fields
        setLengthM(String(data.length_m || "13.6"));
        setWeightT(String(data.weight_t || "24"));
        setExternalComment(data.external_comment || "");
        setFreightCharge(data.freight_charge ? String(data.freight_charge) : "");
        setCurrency(data.currency || "EUR");
        setPaymentDue(data.payment_due || "");

        setHideLocations(!!data.hide_locations);
        setPalletsExchange(!!data.pallets_exchange);
        setSelectedVehicles(data.vehicle_types || []);
        setSelectedBodies(data.body_types || []);
       
        alert("📋 Offer copied into form for submission.");
    }

    // load saved config on mount
    useEffect(() => {
    try {
        const raw = localStorage.getItem('spotgo_batch_cfg');
        if (!raw) return;
        const cfg = JSON.parse(raw);
        if (cfg.multiCount) setMultiCount(clamp(cfg.multiCount, MULTI_MIN, MULTI_MAX));
        if (cfg.radiusKm)   setRadiusKm  (clamp(cfg.radiusKm,   1,          RADIUS_MAX));
    } catch {}
    }, []);

    // save whenever they change
    useEffect(() => {
    localStorage.setItem('spotgo_batch_cfg', JSON.stringify({ multiCount, radiusKm }));
    }, [multiCount, radiusKm]);


    useEffect(() => {
        if (showMultiConfig) {
            setCountDraft(String(multiCount));
            setRadiusDraft(String(radiusKm));
        }
    }, [showMultiConfig]);

    const toSpotgoAddr = (c) => ({
        countryCode: c.countryCode,
        postalCode:  c.postalCode,
        city:        c.city,
        coordinates: { latitude: c.lat, longitude: c.lng }
    });

    async function handleBatchPost() {
        const selected = previewItems.filter(x => x.selected);
        if (selected.length < MULTI_MIN) return;

        setIsBatchPosting(true);
        setBatchLog([]);
        setBatchProgress({ done: 0, total: selected.length });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) { alert('Please sign in first.'); setIsBatchPosting(false); return; }
            const token = session.access_token;
            const userEmail = session.user.email;

            // build a base payload from the current form (we’ll swap loading address per item)
            const base = (() => {
            const extractCity = (label='') => (label.split(',').slice(-2, -1)[0] || 'Unknown').trim();
            const cleanAddress = raw => ({
                countryCode: raw.countryCode,
                postalCode:  raw.postalCode,
                city:        raw.city || extractCity(raw.label),
                coordinates: { latitude: raw.lat, longitude: raw.lng }
            });

            const body = {
                type: "Spot",
                externalNumber: shortCodeFor(userEmail),
                sources: ["1","2","3","4","8","9","12","14","16"],
                useAlternativeLocations: hideLocations,
                locations: [
                {
                    sequence: 1, type: "Loading",
                    address: cleanAddress(loadingLocation), // will be replaced per selected item
                    period: {
                    startDate: `${loadStartDate}T${loadStartTime}:00Z`,
                    endDate:   `${loadEndDate}T${loadEndTime}:00Z`
                    }
                },
                {
                    sequence: 2, type: "Unloading",
                    address: cleanAddress(unloadingLocation),
                    period: {
                    startDate: `${unloadStartDate}T${unloadStartTime}:00Z`,
                    endDate:   `${unloadEndDate}T${unloadEndTime}:00Z`
                    }
                }
                ],
                requirements: {
                capacity: parseFloat(weightT),
                ldm: parseFloat(lengthM),
                pallets: 33,
                loadingSide: "All",
                palletsExchange,
                vehicleTypes: selectedVehicles,
                trailerTypes: selectedBodies,
                ftl: parseFloat(lengthM) >= 13.6
                },
                comments: [shortCodeFor(userEmail), externalComment].filter(Boolean).join(" - "),
                internalComments: hideLocations ? "Locations hidden." : "Load/Unload points visible."
            };

            if (freightCharge || currency || paymentDue) {
                const pay = {};
                if (freightCharge) pay.from = parseFloat(freightCharge) || 0;
                if (currency)      pay.currency = currency;
                if (paymentDue)    pay.dueDate  = new Date(paymentDue).toISOString().split('T')[0];
                body.payment = pay;
            }
            return body;
            })();

            // sequential submit
            for (const c of selected) {
            try {
                const bodyToSend = JSON.parse(JSON.stringify(base));
                if (batchTarget === 'loading') {
                  bodyToSend.locations[0].address = toSpotgoAddr(c);
                } else {
                  bodyToSend.locations[1].address = toSpotgoAddr(c);
                }

                const res = await fetch(`${API_BASE}/api/spotgo/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'authorization-email': userEmail,
                    'Content-Type': 'application/json',
                    'x-api-version': '1.0'
                },
                body: JSON.stringify(bodyToSend)
                });

                const raw = await res.text();
                if (!res.ok) throw new Error(raw || 'Submit failed');

                const result = raw ? JSON.parse(raw) : {};
                const offerId = result.id || null;

                const loadAddr   = batchTarget === 'loading'   ? c : loadingLocation;
                const unloadAddr = batchTarget === 'unloading' ? c : unloadingLocation;


                // mirror to Supabase
                await supabase.from('submitted_offers').insert([{
                offer_id: offerId,
                external_number: formatName(userEmail),
                loading_address: loadAddr?.label || '',
                unloading_address: unloadAddr?.label || '',
                updated_at: new Date().toISOString(),

                loading_country_code: loadAddr?.countryCode || null,
                loading_postal_code:  loadAddr?.postalCode  || null,
                loading_lat:          loadAddr?.lat || null,
                loading_lng:          loadAddr?.lng || null,

                unloading_country_code: unloadAddr?.countryCode || null,
                unloading_postal_code:  unloadAddr?.postalCode  || null,
                unloading_lat:          unloadAddr?.lat || null,
                unloading_lng:          unloadAddr?.lng || null,

                loading_start_time:  `${loadStartDate}T${loadStartTime}:00`,
                loading_end_time:    `${loadEndDate}T${loadEndTime}:00`,
                unloading_start_time:`${unloadStartDate}T${unloadStartTime}:00`,
                unloading_end_time:  `${unloadEndDate}T${unloadEndTime}:00`,

                external_comment: externalComment || null,
                hide_locations: hideLocations,
                pallets_exchange: palletsExchange,
                vehicle_types: selectedVehicles.length ? selectedVehicles : null,
                body_types:     selectedBodies.length   ? selectedBodies   : null,
                freight_charge: freightCharge ? parseFloat(freightCharge) : null,
                currency: currency || null,
                payment_due: paymentDue || null,
                length_m: lengthM ? parseFloat(lengthM) : null,
                weight_t: weightT ? parseFloat(weightT) : null,
                submitted_by_email: userEmail
                }]);

                setBatchLog(l => [...l, { city: c.city, ok: true, id: offerId }]);
            } catch (err) {
                setBatchLog(l => [...l, { city: c.city, ok: false, error: String(err.message || err) }]);
            } finally {
                setBatchProgress(p => ({ ...p, done: p.done + 1 }));
            }
            }

            await refreshSubmittedOffers();
            setShowPreview(false);
            setPreviewItems([]);
            setIsBatchPosting(false);
            resetForm()

        } finally {
            setIsBatchPosting(false);
        }
    }

    async function handleDeleteOffer(offerId) {
        if (!window.confirm("Are you sure you want to delete this offer?")) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        try {
            // Delete from SpotGo
            const res = await fetch(`${API_BASE}/api/spotgo/${offerId}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errText = await res.text();
                alert(`Failed to delete offer: ${errText}`);
            return;
            }

            // Delete from Supabase
            const { error: supabaseError } = await supabase
                .from('submitted_offers')
                .delete()
                .eq('offer_id', offerId);

            if (supabaseError) {
                console.error("Supabase delete error:", supabaseError.message);
            }

            // ✅ Update local table only (no refresh)
            setOffers(prev => prev.filter(o => o.id !== offerId));

            alert(`Freight ${offerId} deleted successfully.`);
        } catch (error) {
            console.error("Delete offer error:", error);
            alert("An error occurred while deleting the offer.");
        }
    }

    // Shared input style
    const baseInputStyle = {
    padding: '6px 10px',
    borderRadius: '5px',
    border: '1px solid rgba(185, 28, 28, 0.2)',
    width: '100%',
    boxShadow: '0 2px 8px rgba(185, 28, 28, 0.15)',
    transition: 'all 0.2s ease-in-out'
    };

    const highlightStyle = {
    border: '1px solid rgba(185, 28, 28, 0.2)',
    boxShadow: '0 2px 8px rgba(185, 28, 28, 0.15)'
    };

    const buttonInputStyle={
        padding: '10px 20px',
        background: '#b91c1c',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer'
    }

    // Input helpers
    const handleFocus = e => Object.assign(e.target.style, { ...baseInputStyle, ...highlightStyle });
    const handleBlur = e => Object.assign(e.target.style, baseInputStyle);

    const selectedCount = previewItems.filter(x => x.selected).length;


  return (
  <div style={{ background: '#fff5f5', fontFamily: 'Arial, sans-serif' }}>
    <Header user = {user} />
    {/* Offer Prefix Section */}
     {/* <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Offer Prefix:</label>
            <input 
                type="text" 
                value={externalPrefix} 
                onChange={e => setPrefix(e.target.value)} 
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={!prefixEditEnabled
                style={{...baseInputStyle, width:'200px'}} 
            />
            <button type="button" onClick={handleModifyPrefix} style={{ ...buttonInputStyle, padding: '5px 10px' }}>Modify Prefix</button>
            <button type="button" onClick={handleSavePrefix} style={{ ...buttonInputStyle, padding: '5px 10px' }}>Save Prefix</button>
        </div> */}

    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Left Form */}
      <form onSubmit={handleSubmitOffer} style={{ flex: '1', marginRight: '30px', background: '#ffffff', padding: '20px', borderRadius: '8px',boxShadow: '0 2px 8px rgba(185, 28, 28, 0.15)' }}>
        <h3 style={{ color: '#8a1414ff', marginBottom: '15px' }}>Addresses</h3>

        {/* Address Fields */}
        <div style={{display: 'flex',gap: '30px',alignItems: 'flex-start',marginBottom: '20px',paddingBottom: '15px',borderBottom: '1px dashed #09111aff',flexWrap: 'wrap'}} >
        <div style={{flex: 1,minWidth: '300px',border: '1px solid #ccc',padding: '15px',borderRadius: '8px', backgroundColor: '#fdfdfd'}}>
            <label style={{ fontWeight: 'bold' }}>Loading Address:</label><br />
            <AutoCompleteInput key={`loading-${resetKey}`} apiKey={process.env.REACT_APP_HERE_API_KEY} value={loadingLocation} onSelect={handleLoadingSelect} />
            {loadingLocation && (
            <div style={{ marginTop: 8 }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input
                            type="checkbox"
                        checked={postMultipleLoading}
                        disabled={postMultipleUnloading}   // keep “only one” rule
                        onChange={e => {
                        const on = e.target.checked;
                        if (on) {
                            setBatchTarget('loading');
                            setPostMultiple(true);
                            setShowMultiConfig(true);   // jump straight to count/radius
                            setShowPreview(false);
                        } else {
                            setPostMultiple(false);
                            setBatchTarget(null);
                            setShowPreview(false);
                        }
                        }}
                    />
                    <strong>Post multiple</strong>
                </label>
            </div>
            )}
        </div>

        <div style={{flex: 1, minWidth: '300px',border: '1px solid #ccc',padding: '15px', borderRadius: '8px',backgroundColor: '#fdfdfd'}}>
            <label style={{ fontWeight: 'bold' }}>Unloading Address:</label><br />
            <AutoCompleteInput key={`unloading-${resetKey}`} apiKey={process.env.REACT_APP_HERE_API_KEY} value={unloadingLocation} onSelect={handleUnloadingSelect} />
            {unloadingLocation && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input
                        type="checkbox"
                        checked={postMultipleUnloading}
                        disabled={postMultipleLoading}    // keep “only one” rule
                        onChange={e => {
                        const on = e.target.checked;
                        if (on) {
                            setBatchTarget('unloading');
                            setPostMultiple(true);
                            setShowMultiConfig(true);
                                        setShowPreview(false);
                        } else {
                            setPostMultiple(false);
                            setBatchTarget(null);
                            setShowPreview(false);
                        }
                        }}
                    />
                    <strong>Post multiple</strong>
                </label>
            </div>
            )}

        </div>
        </div>

        {/* Date & Time Inputs */}
        <div style={{marginBottom: '20px',paddingBottom: '15px',borderBottom: '1px dashed #09111aff',display: 'flex',gap: '30px',flexWrap: 'wrap'}}>
            <fieldset style={{flex: 1,minWidth: '300px',border: '1px solid #ddd',padding: '15px',borderRadius: '8px'}}>
                <legend style={{ fontWeight: 'bold', color: '#8a1414ff' }}>Loading Time</legend>
                <label>Start:</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input type="date" value={loadStartDate} onChange={e => setLoadStartDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                    <input
                        type="time"
                        value={loadStartTime}
                        onChange={(e) => {
                            console.log("🕓 Changing loadStartTime to", e.target.value);
                            setLoadStartTime(e.target.value);
                        }}
                        lang="en-GB"
                        step="60"
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        style={{ ...baseInputStyle, flex: 1 }}
                    />

                </div>
                <label>End:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={loadEndDate} onChange={e => setLoadEndDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                    <input type="time" value={loadEndTime} onChange={e => setLoadEndTime(e.target.value)} lang="en-GB" step="60" onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                </div>
            </fieldset>

            <fieldset style={{flex: 1,minWidth: '300px',border: '1px solid #ddd',padding: '15px',borderRadius: '8px'}}>
                <legend style={{ fontWeight: 'bold', color: '#8a1414ff' }}>Unloading Time</legend>
                <label>Start:</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input type="date" value={unloadStartDate} onChange={e => setUnloadStartDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                    <input type="time" value={unloadStartTime} onChange={e => setUnloadStartTime(e.target.value)} lang="en-GB" step="60" onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                </div>
                <label>End:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={unloadEndDate} onChange={e => setUnloadEndDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                    <input type="time" value={unloadEndTime} onChange={e => setUnloadEndTime(e.target.value)} lang="en-GB" step="60" onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                </div>
            </fieldset>
        </div>


        {/* Measurements */}
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <label><strong>Length (m):</strong></label>
                <input type="text" value={lengthM} onChange={e => setLengthM(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
            <label style={{ marginLeft: '20px' }}><strong>Weight (t):</strong></label>
                <input type="text" value={weightT} onChange={e => setWeightT(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
            <label style={{ marginRight: '20px' }}>
                <input type="checkbox" checked={hideLocations} onChange={e => setHideLocations(e.target.checked)} />
                {" "}Hide Locations
            </label>
            <label>
                <input type="checkbox" checked={palletsExchange} onChange={e => setPalletsExchange(e.target.checked)} />
                {" "}Pallets Exchange
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
          <label><strong>External Comment:</strong></label><br />
          <input type="text" value={externalComment} onChange={e => setExternalComment(e.target.value)} style={{ ...baseInputStyle }} />
        </div>

        {/* Payment */}
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <label><strong>Freight Charge:</strong></label>
                <input type="text" value={freightCharge} onChange={e => setFreightCharge(e.target.value)} style={{ ...baseInputStyle, flex:1}} />
            <label style={{ marginLeft: '15px' }}><strong>Currency:</strong></label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...baseInputStyle, flex:1 }}>
                    <option value="EUR">EUR</option>
                    <option value="RON">RON</option>
                    <option value="HUF">HUF</option>
                </select>
            <label style={{ marginLeft: '15px' }}><strong>Payment Due:</strong></label>
                <input type="date" value={paymentDue} onChange={e => setPaymentDue(e.target.value)} style={{ ...baseInputStyle, flex:1 }} />
            </div>
        </div>

        {/* Vehicle and Body Types */}
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
            <span style={{ display: 'inline-block', marginRight: '25px' }}>
                <strong>Vehicle Type(s):</strong>
            </span>
            {Object.entries(vehicleTypes).map(([id, label]) => (
                <label key={id} style={{ display: 'inline-block', marginRight: '15px' }}>
                <input type="checkbox" checked={selectedVehicles.includes(Number(id))} onChange={() => toggleVehicleType(Number(id))} />
                {" "}{label}
                </label>
            ))}
        </div>

        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
          <strong>Body Type(s) (max 5):</strong><br />
          {Object.entries(bodyTypes).map(([id, label]) => (
            <label key={id} style={{ display: 'inline-block', width: '180px' }}>
              <input type="checkbox" checked={selectedBodies.includes(Number(id))} onChange={() => toggleBodyType(Number(id))} />
              {" "}{label}
            </label>
          ))}
        </div>
        {/* Action Bar */}
        <div style={{
        marginTop: 16,
        paddingTop: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap'
        }}>
        {/* Left: title above button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <h3 style={{ margin: 0 }}>{isEditing ? "Edit Offer" : "New Offer"}</h3>
        <button type="submit" style={{ ...buttonInputStyle }}>
            {isEditing ? "Update Offer" : "Submit Offer"}
        </button>
        </div>

        {/* Post-multiple controls and Preview button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>

        {/* Show Preview only after the modal is saved (checked + modal closed) */}
        {showPreviewAction && (
            <button
                type="button"
                disabled={!needAddressPicked}
                onClick={async () => {
                const centerLoc = batchTarget === 'unloading' ? unloadingLocation : loadingLocation;
                if (!centerLoc) return;

                setShowPreview(true);
                setLoadingPreview(true);
                setPreviewError('');
                try {
                    // 1) pin the base place
                    const pinned = asCandidate(centerLoc, { lat: centerLoc.lat, lng: centerLoc.lng });
                    pinned.distanceKm = 0;
                    pinned.pinned = true;
                    pinned.selected = true; // always included
                    pinned._pinNote = batchTarget === 'unloading' ? '• current unloading' : '• current loading';

                    // 2) fetch nearby localities around that side
                    const near = await findNearbyLocalities(
                    { lat: centerLoc.lat, lng: centerLoc.lng },
                    clamp(radiusKm, 1, RADIUS_MAX),
                    clamp(multiCount, MULTI_MIN, MULTI_MAX),
                    HERE_API_KEY
                    );

                    // 3) remove duplicate of the pinned one
                    const filtered = near.filter(c => c.key !== pinned.key);

                    // 4) preselect the next N-1
                    const need = clamp(multiCount, MULTI_MIN, MULTI_MAX) - 1;
                    for (let i = 0; i < filtered.length; i++) filtered[i].selected = i < need;

                    setPreviewItems([pinned, ...filtered]);
                } catch (e) {
                    console.error('preview error', e);
                    setPreviewError('Could not fetch nearby localities. Try a smaller radius or later.');
                    setPreviewItems([]);
                } finally {
                    setLoadingPreview(false);
                }
                }}
                style={{ ...buttonInputStyle, opacity: !needAddressPicked ? 0.6 : 1 }}
                title={
                    needAddressPicked ? '' :
                    batchTarget === 'unloading' ? 'Pick an unloading address first' : 'Pick a loading address first'
                }
            >
                Preview
            </button>
        )}

        </div>

        </div>
        <Modal
        open={showMultiConfig}
        title="Batch posting settings"
        onClose={() => { setShowMultiConfig(false); setPostMultiple(false); setBatchTarget(null); }}  // ✕ unchecks
        >
        {/* Modal body: stacked, always full-width, no focus/blur styling */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Count (2–5):
            </label>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`${MULTI_MIN}–${MULTI_MAX}`}
                value={countDraft}
                onChange={e => setCountDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                style={{ ...baseInputStyle, width: '100%' }}
            />
        </div>

        <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Radius (km, ≤250):
            </label>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`1–${RADIUS_MAX}`}
                value={radiusDraft}
                onChange={e => setRadiusDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                style={{ ...baseInputStyle, width: '100%' }}
            />
        </div>


        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
        Will include the chosen city plus the nearest localities within the radius. Cross-border allowed.
        </div>


        <button
            type="button"
            onClick={() => {
                const parsedCount  = clamp(parseInt(countDraft, 10)  || MULTI_MIN, MULTI_MIN, MULTI_MAX);
                const parsedRadius = clamp(parseInt(radiusDraft, 10) || 1,          1,          RADIUS_MAX);
                setMultiCount(parsedCount);
                setRadiusKm(parsedRadius);
                setShowMultiConfig(false);
            }}
            style={{ ...buttonInputStyle }}
            >
            Save
        </button>

        </Modal>

        <Modal
            open={showPreview}
            title={`Preview (${clamp(multiCount, MULTI_MIN, MULTI_MAX)} offers) — ${batchTarget === 'unloading' ? 'unloading' : 'loading'}`}
            onClose={() => { if (!isBatchPosting) setShowPreview(false); }}
            >

            {loadingPreview ? (
                <div style={{ padding: 12 }}>Loading nearby localities…</div>
            ) : previewError ? (
                <div style={{ padding: 12, color: '#b91c1c' }}>{previewError}</div>
            ) : (
                <>
                {/* quick-selects */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color:'#555' }}>
                    Selected: {selectedCount} / {clamp(multiCount, MULTI_MIN, MULTI_MAX)}
                </div>
                <div style={{ display:'flex', gap: 8 }}>
                    <button
                    type="button"
                    onClick={() => {
                        setPreviewItems(prev => {
                        const cap = clamp(multiCount, MULTI_MIN, MULTI_MAX);
                        let used = 0;
                        return prev.map(item => {
                            if (item.pinned) { used++; return { ...item, selected: true }; }
                            if (used < cap)   { used++; return { ...item, selected: true }; }
                            return { ...item, selected: false };
                        });
                        });
                    }}
                    style={{ ...buttonInputStyle, padding: '6px 10px' }}
                    >
                    Nearest {clamp(multiCount, MULTI_MIN, MULTI_MAX)}
                    </button>
                    <button
                    type="button"
                    onClick={() => {
                        setPreviewItems(prev => prev.map(it => ({ ...it, selected: !!it.pinned })));
                    }}
                    style={{ ...buttonInputStyle, padding: '6px 10px', background:'#9CA3AF' }}
                    >
                    Select none
                    </button>
                </div>
                </div>

                <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
                    {previewItems.length === 0 && (
                    <div style={{ padding: 12 }}>No candidates found in this radius.</div>
                    )}
                    {previewItems.map((c, i) => (
                    <label key={c.key || i} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                        borderBottom:'1px solid #f2f2f2', background: c.pinned ? '#f8fafc' : 'white'
                    }}>
                        <input
                        type="checkbox"
                        checked={!!c.selected}
                        disabled={c.pinned}
                        onChange={e => {
                            const checked = e.target.checked;
                            setPreviewItems(prev => {
                                const maxSel = clamp(multiCount, MULTI_MIN, MULTI_MAX);
                                const next = prev.map(x => ({ ...x }));
                                const selectedNow = next.filter(x => x.selected).length;

                                // safety: pinned stays selected
                                if (next[i].pinned && !checked) return prev;

                                if (checked) {
                                // don’t allow exceeding the cap
                                if (selectedNow >= maxSel) return prev; // (optional: flash a message)
                                next[i].selected = true;
                                } else {
                                next[i].selected = false;
                                }
                                return next;
                            });
                        }}
                        />
                        <div style={{ flex:1 }}>
                        <div style={{ fontWeight: 600 }}>
                            {c.city} <span style={{ fontWeight: 400 }}>({c.countryCode})</span>
                            {c.pinned && (
                            <span style={{ marginLeft: 8, fontSize: 12, color:'#1e4a7b' }}>
                                {c._pinNote || '• current'}
                            </span>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color:'#555' }}>
                            {c.postalCode ? `${c.postalCode} • ` : ''}{Math.max(0, c.distanceKm)} km
                        </div>
                        </div>
                    </label>
                    ))}
                </div>

                {/* helper text under the list (optional) */}
                <div style={{ marginTop: 10, fontSize: 12, color: '#555' }}>
                Select up to {clamp(multiCount, MULTI_MIN, MULTI_MAX)} locations.
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems:'center', gap: 8 }}>
                <div style={{ fontSize: 12, color:'#555' }}>
                    {isBatchPosting
                    ? `Posting ${batchProgress.done}/${batchProgress.total}…`
                    : 'Ready to post the selected locations.'}
                </div>
                <div style={{ display:'flex', gap: 8 }}>
                    <button
                    type="button"
                    onClick={() => !isBatchPosting && setShowPreview(false)}
                    disabled={isBatchPosting}
                    style={{ ...buttonInputStyle, background:'#1e4a7b', opacity: isBatchPosting ? 0.6 : 1 }}
                    >
                    {isBatchPosting ? 'Working…' : 'Close'}
                    </button>
                    <button
                    type="button"
                    disabled={isBatchPosting || selectedCount < MULTI_MIN}
                    onClick={handleBatchPost}
                    style={{ ...buttonInputStyle, opacity: (isBatchPosting || selectedCount < MULTI_MIN) ? 0.6 : 1 }}
                    title={selectedCount < MULTI_MIN ? `Pick at least ${MULTI_MIN}` : ''}
                    >
                    {isBatchPosting
                        ? `Posting ${batchProgress.done}/${batchProgress.total}…`
                        : `Post ${selectedCount} offers`}
                    </button>
                </div>
                </div>

                {batchLog.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12 }}>
                    {batchLog.map((r, i) =>
                    <div key={i}>
                        {r.ok ? `✅ ${r.city} — created ${r.id || 'OK'}` : `❌ ${r.city} — ${r.error}`}
                    </div>
                    )}
                </div>
                )}

                </>
            )}
        </Modal>


      </form>

      {/* Submitted Offers */}
      <div style={{ flex: '1', background: '#ffffff', padding: '20px', borderRadius: '8px',boxShadow: '0 2px 8px rgba(185, 28, 28, 0.15)' }}>
        {/*<h3 style={{ color: '#b91c1c' }}>Submitted Offers</h3>*/}
        {offers.length === 0 ? (
          <p>No offers submitted yet.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#ff0a0aa6', position: 'sticky' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Loading</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Unloading</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer, idx) => (
                <tr key={offer.id} style={{ backgroundColor: offer.isMine ? (idx % 2 === 0 ? '#f2f8fc' : '#ffffff') : '#fff6e0' }}>
                    <td style={{ padding: '8px' }}>{offer.externalNumber}</td>
                    <td style={{ padding: '8px' }}>{offer._loading}</td>
                    <td style={{ padding: '8px' }}>{offer._unloading}</td>
                    <td style={{ textAlign: 'center' }}>
                        {offer.isMine ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            <button
                                onClick={() => handleEditOffer(offer)}
                                style={{ padding: '5px 10px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '4px' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCopyOffer(offer); }}
                                style={{ padding: '5px 10px', background: '#1e4a7b', color: '#fff', border: 'none', borderRadius: '4px' }}
                            >
                                Copy
                            </button>
                            <button
                                onClick={() => handleDeleteOffer(offer.id)}
                                style={{ padding: '5px 10px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px' }}
                            >
                                Delete
                            </button>
                            </div>
                        ) : (
                            <span style={{ color: '#9aa2af', fontStyle: 'italic' }}></span>
                        )}
                    </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

}


//TODO: add both at once functionality. you go from A to B, post multiple for both works like -> A-B, A1-B1, A2-B2, etc

//TODO later: batch delete for batch post.