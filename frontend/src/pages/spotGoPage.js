// pages/spotGoPage.js
import React, { useEffect, useState, useRef } from "react";
import AutoCompleteInput from "../AutoCompleteInput";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import countries from "i18n-iso-countries";
import enLocale  from "i18n-iso-countries/langs/en.json";
import Header from '../components/header';


countries.registerLocale(enLocale);


const PREFIX_PASSWORD = "parola_ta_secreta";
const DEFAULT_PREFIX = "APP-OFFER-";
const API_BASE = '';

const vehicleTypes = {
  1: "Semi trailer",
  2: "Solo (<12t)",
  3: "Solo (<7.5t)",
  4: "Van",
  5: "Double Trailer"
};
const bodyTypes = {
  1: "Tent",
  2: "Reefer",
  3: "Tautliner",
  4: "Box",
  5: "Isotherm",
  6: "Mega",
  7: "Jumbo",
  8: "Van",
  9: "Platform",
  10: "Road Train 120m3",
  11: "Tanker",
  12: "Walking Floor",
  13: "Coil Mulde",
  14: "Dump Truck",
  15: "Car Transporter",
  16: "Joloda",
  17: "Low Loader",
  18: "Silos",
  19: "Any"
};

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

    const formRef = useRef(null);
    const [listMaxH, setListMaxH] = useState(0);

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
                    // TODO: crezi ca ar fi util sa puneam namePrefix ul in utils? il creez si aici si in fetchSubmitOffer
                    const isMine = o.external_number?.startsWith(finalPrefix);

                    return {
                        id: o.offer_id,
                        externalNumber: o.external_number || o.offer_id,
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

        const formatName = (email = '') => {
            if (!email.includes('@')) return '';
            const local = email.split('@')[0];
            return local
                .split('.')
                .map(p => p[0]?.toUpperCase() + p.slice(1))
                .join(' ');
        };

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

        const getPaymentObj = () => {
            if (!freightCharge && !currency && !paymentDue) return undefined;
            const obj = {};
            if (freightCharge) obj.from = parseFloat(freightCharge);
            if (currency) obj.currency = currency;
            if (paymentDue) {
                obj.dueDate = new Date(paymentDue).toISOString().split("T")[0];
            }
            return obj;
        };

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
            externalNumber: finalPrefix,
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
            comments: externalComment || undefined,
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

        // TODO luni: momentan fac insertul de aici, dar trebuie vazut de ce nu vrea sa il faca din // frontend/api/spotGo/submit.js si in tabel pe web si in DB. pe spotgo face insert
        // try {
        //     const { error } = await supabase
        //         .from('submitted_offers')
        //         .insert([
        //         {
        //             offer_id: result.id,
        //             external_number: finalPrefix,
        //             loading_address: address0.label,
        //             unloading_address: address1.label,
        //             created_at: new Date().toISOString()
        //         }
        //         ]);

        //     if (error) {
        //         console.error("Failed to insert into Supabase:", error.message);
        //     }
        // } catch (e) {
        // console.error("Supabase insert error:", e.message);
        // }

        try {
            if (isEditing && editingOfferId) {
                const { error } = await supabase
                    .from('submitted_offers')
                    .update({
                    external_number: finalPrefix,
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
                        external_number: finalPrefix,
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

  return (
  <div style={{ padding: '30px', background: '#fff5f5', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ marginBottom: '20px' }}>
    <Header user = {user} />
    </div>
    {/* Offer Prefix Section */}
     {/* <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Offer Prefix:</label>
            <input 
                type="text" 
                value={externalPrefix} 
                onChange={e => setPrefix(e.target.value)} 
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={!prefixEditEnabled} 
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
        </div>

        <div style={{flex: 1, minWidth: '300px',border: '1px solid #ccc',padding: '15px', borderRadius: '8px',backgroundColor: '#fdfdfd'}}>
            <label style={{ fontWeight: 'bold' }}>Unloading Address:</label><br />
            <AutoCompleteInput key={`unloading-${resetKey}`} apiKey={process.env.REACT_APP_HERE_API_KEY} value={unloadingLocation} onSelect={handleUnloadingSelect} />
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
        <h3>{isEditing ? "Edit Offer" : "New Offer"}</h3>
        <button type="submit" style={{...buttonInputStyle}}>{isEditing ? "Update Offer" : "Submit Offer"}</button>
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
