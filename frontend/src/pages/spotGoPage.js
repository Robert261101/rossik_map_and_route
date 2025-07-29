// pages/spotGoPage.js
import React, { useEffect, useState } from "react";
import AutoCompleteInput from "../AutoCompleteInput";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabase";

const PREFIX_PASSWORD = "parola_ta_secreta";
const DEFAULT_PREFIX = "APP-OFFER-";

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

export default function SpotGoPage() {
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [prefixEditEnabled, setPrefixEditEnabled] = useState(false);

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
  const navigate = useNavigate()

  useEffect(() => {
    const savedPrefix = localStorage.getItem("spotgo_prefix");
    if (savedPrefix) setPrefix(savedPrefix);
    const savedOffers = localStorage.getItem("spotgo_offers");
    if (savedOffers) setOffers(JSON.parse(savedOffers));
    initializeDefaultTimes();
  }, []);

  useEffect(() => {
    localStorage.setItem("spotgo_offers", JSON.stringify(offers));
  }, [offers]);

  function initializeDefaultTimes() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(now.getHours() + 1);
    const timeStr = (dateObj) => dateObj.toTimeString().slice(0,5);
    setLoadStartTime(loadStartDate === todayStr ? timeStr(nextHour) : "08:00");
    const loadEnd = new Date(nextHour);
    loadEnd.setHours(loadEnd.getHours() + 1);
    setLoadEndTime(loadEndDate === todayStr ? timeStr(loadEnd) : "15:00");
    setUnloadStartTime(unloadStartDate === todayStr ? timeStr(nextHour) : "08:00");
    const unloadEnd = new Date(nextHour);
    unloadEnd.setHours(unloadEnd.getHours() + 1);
    setUnloadEndTime(unloadEndDate === todayStr ? timeStr(unloadEnd) : "15:00");
  }

    useEffect(() => {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        const timeStr = nextHour.toTimeString().slice(0, 5);
        setLoadStartTime(loadStartDate === todayStr ? timeStr : "08:00");
    }, [loadStartDate]);

    useEffect(() => {
        const now = new Date();
        const end = new Date(now);
        end.setHours(now.getHours() + 2);
        end.setMinutes(0, 0, 0);
        const timeStr = end.toTimeString().slice(0, 5);
        setLoadEndTime(loadEndDate === todayStr ? timeStr : "15:00");
    }, [loadEndDate]);

    useEffect(() => {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        const timeStr = nextHour.toTimeString().slice(0, 5);
        setUnloadStartTime(unloadStartDate === todayStr ? timeStr : "08:00");
    }, [unloadStartDate]);

    useEffect(() => {
        const now = new Date();
        const end = new Date(now);
        end.setHours(now.getHours() + 2);
        end.setMinutes(0, 0, 0);
        const timeStr = end.toTimeString().slice(0, 5);
        setUnloadEndTime(unloadEndDate === todayStr ? timeStr : "15:00");
    }, [unloadEndDate]);

  function handleModifyPrefix() {
    const pw = prompt("Enter password to modify prefix:");
    if (pw === PREFIX_PASSWORD) {
      setPrefixEditEnabled(true);
      alert("Prefix editing unlocked.");
    } else if (pw !== null) {
      alert("Incorrect password.");
    }
  }

  function handleSavePrefix() {
    const newPref = prefix.trim();
    if (!newPref) {
      alert("Prefix cannot be empty.");
      return;
    }
    setPrefix(newPref);
    localStorage.setItem("spotgo_prefix", newPref);
    setPrefixEditEnabled(false);
    alert(`Prefix "${newPref}" saved.`);
  }

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

    const address0 = {
        label: loadingLocation.label,
        city: "",
        postalCode: "",
        countryCode: "",
        coordinates: {
            latitude: loadingLocation.lat,
            longitude: loadingLocation.lng
        }
    };

    const address1 = {
        label: unloadingLocation.label,
        city: "",
        postalCode: "",
        countryCode: "",
        coordinates: {
            latitude: unloadingLocation.lat,
            longitude: unloadingLocation.lng
        }
    };

    const payload = {
        type: "Spot",
        externalNumber: prefix,
        sources: ["1", "2", "8", "12", "14"],
        useAlternativeLocations: hideLocations,
        locations: [
            {
            sequence: 1,
            type: "Loading",
            address: address0,
            period: {
                startDate: `${loadStartDate}T${loadStartTime}:00Z`,
                endDate: `${loadEndDate}T${loadEndTime}:00Z`
            }
            },
            {
            sequence: 2,
            type: "Unloading",
            address: address1,
            period: {
                startDate: `${unloadStartDate}T${unloadStartTime}:00Z`,
                endDate: `${unloadEndDate}T${unloadEndTime}:00Z`
            }
            }
        ],
        requirements: {
            capacity: weightVal,
            ldm: lengthVal,
            pallets: 33,
            loadingSide: "All",
            palletsExchange,
            vehicleTypes: selectedVehicles,
            trailerTypes: selectedBodies,
            ftl: lengthVal >= 13.6
        },
        comments: externalComment || undefined,
        internalNote: hideLocations ? "Locations hidden." : "Load/Unload points visible."
    };

    if (freightCharge) {
      const pay = { from: parseFloat(freightCharge) || 0 };
      if (currency) pay.currency = currency;
      if (paymentTerm) pay.term = paymentTerm;
      payload.payment = pay;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    try {
        const res = await fetch("/api/spotgo/submit", {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

      if (!res.ok) {
        const errText = await res.text();
        alert(`Failed to submit offer: ${errText}`);
        return;
      }
      const result = await res.json();
      const newOffer = {
        id: result.id,
        externalNumber: prefix,
        _loading: address0.label,
        _unloading: address1.label
      };
      setOffers(prev => [...prev, newOffer]);
      alert("Freight offer submitted successfully.");
    } catch (error) {
      console.error("Submit offer error:", error);
      alert("An unexpected error occurred during submission.");
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await fetch(`/api/spotgo/${offerId}`, { method: "DELETE" });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Failed to delete offer: ${errText}`);
        return;
      }
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
    border: '1px solid #ccc',
    width: '100%',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease-in-out'
    };

    const highlightStyle = {
    border: '1px solid #1e4a7b',
    boxShadow: '0 0 4px #a5c9f0'
    };

    const buttonInputStyle={
        padding: '10px 20px',
        background: '#1e4a7b',
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
  <div style={{ padding: '30px', background: '#f5f9fd', fontFamily: 'Arial, sans-serif' }}>
    {/* Offer Prefix Section */}
    <div style={{ marginBottom: '30px', padding: '20px', background: '#ffffff', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)', borderRadius: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Offer Prefix:</label>
            <input 
                type="text" 
                value={prefix} 
                onChange={e => setPrefix(e.target.value)} 
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={!prefixEditEnabled} 
                style={{...baseInputStyle, width:'200px'}} 
            />
            <button type="button" onClick={handleModifyPrefix} style={{ ...buttonInputStyle, padding: '5px 10px' }}>Modify Prefix</button>
            <button type="button" onClick={handleSavePrefix} style={{ ...buttonInputStyle, padding: '5px 10px' }}>Save Prefix</button>
        </div>
        <button
            type="button"
            onClick={() => navigate('/')}
            style={{ ...buttonInputStyle, padding: '5px 10px', marginLeft: 'auto' }}
            >
            Back
        </button>

    </div>

    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Left Form */}
      <form onSubmit={handleSubmitOffer} style={{ 
        flex: '1', 
        marginRight: '30px', 
        background: '#ffffff', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' 
      }}>
        <h3 style={{ color: '#1e4a7b', marginBottom: '15px' }}>Addresses</h3>

        {/* Address Fields */}
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
            <div style={{ marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Loading Address:</label><br />
            <AutoCompleteInput apiKey={process.env.REACT_APP_HERE_API_KEY} onSelect={setLoadingLocation} />
            </div>
            <div style={{ marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Unloading Address:</label><br />
            <AutoCompleteInput apiKey={process.env.REACT_APP_HERE_API_KEY} onSelect={setUnloadingLocation} />
            </div>
        </div>

        {/* Date & Time Inputs */}
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #09111aff'}}>
            <fieldset style={{ border: 'none', marginBottom: '15px' }}>
                <legend style={{ fontWeight: 'bold', color: '#1e4a7b' }}>Loading Time</legend>
                <label>Start: </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="date" value={loadStartDate} onChange={e => setLoadStartDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                        <input type="time" value={loadStartTime} onChange={e => setLoadStartTime(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
                    </div>
                <label>End: </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="date" value={loadEndDate} onChange={e => setLoadEndDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
                        <input type="time" value={loadEndTime} onChange={e => setLoadEndTime(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
                    </div>
            </fieldset>

            <fieldset style={{ border: 'none', marginBottom: '15px' }}>
                <legend style={{ fontWeight: 'bold', color: '#1e4a7b' }}>Unloading Time</legend>
                <label>Start: </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="date" value={unloadStartDate} onChange={e => setUnloadStartDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
                        <input type="time" value={unloadStartTime} onChange={e => setUnloadStartTime(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }} />
                    </div>
                <label>End: </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="date" value={unloadEndDate} onChange={e => setUnloadEndDate(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
                        <input type="time" value={unloadEndTime} onChange={e => setUnloadEndTime(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} style={{ ...baseInputStyle, flex: 1 }}/>
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

        <button type="submit" style={{...buttonInputStyle}}>Submit Offer</button>
      </form>

      {/* Submitted Offers */}
      <div style={{ flex: '1', background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
        <h3 style={{ color: '#1e4a7b' }}>Submitted Offers</h3>
        {offers.length === 0 ? (
          <p>No offers submitted yet.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#d7e9f7' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Offer</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Loading</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Unloading</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer, idx) => (
                <tr key={offer.id} style={{ background: idx % 2 === 0 ? '#f2f8fc' : '#ffffff' }}>
                  <td style={{ padding: '8px' }}>{offer.externalNumber || offer.id}</td>
                  <td style={{ padding: '8px' }}>{offer._loading}</td>
                  <td style={{ padding: '8px' }}>{offer._unloading}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteOffer(offer.id)} 
                      style={{ padding: '5px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px' }}
                    >
                      Delete
                    </button>
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
