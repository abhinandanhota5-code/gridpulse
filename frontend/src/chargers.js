/* ------------------------------------------------------------------ */
/*  GRIDPULSE · nationwide charging-station directory.                 */
/*  ~350 real-ish sites across Indian cities + NH corridors, enriched   */
/*  with connectors, power class, ratings, port counts, amenities and   */
/*  per-kWh price so the "Find chargers" map, search and trip planner  */
/*  can rank and filter accurately. Static & deterministic (no random   */
/*  on load) so results are stable between renders.                     */
/* ------------------------------------------------------------------ */

export const IN_CITIES = {
  Delhi: { lat: 28.6139, lng: 77.209, state: "Delhi" },
  "New Delhi": { lat: 28.6139, lng: 77.209, state: "Delhi" },
  Mumbai: { lat: 19.076, lng: 72.8777, state: "Maharashtra" },
  Pune: { lat: 18.5204, lng: 73.8567, state: "Maharashtra" },
  Nashik: { lat: 19.9975, lng: 73.7898, state: "Maharashtra" },
  Nagpur: { lat: 21.1458, lng: 79.0882, state: "Maharashtra" },
  Aurangabad: { lat: 19.8762, lng: 75.3433, state: "Maharashtra" },
  Bengaluru: { lat: 12.9716, lng: 77.5946, state: "Karnataka" },
  Mysuru: { lat: 12.2958, lng: 76.6394, state: "Karnataka" },
  Mangaluru: { lat: 12.9141, lng: 74.856, state: "Karnataka" },
  Hubballi: { lat: 15.3647, lng: 75.124, state: "Karnataka" },
  Chennai: { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu" },
  Coimbatore: { lat: 11.0168, lng: 76.9558, state: "Tamil Nadu" },
  Vellore: { lat: 12.9165, lng: 79.1325, state: "Tamil Nadu" },
  Madurai: { lat: 9.9252, lng: 78.1198, state: "Tamil Nadu" },
  Tiruchirappalli: { lat: 10.7905, lng: 78.7047, state: "Tamil Nadu" },
  Salem: { lat: 11.6643, lng: 78.146, state: "Tamil Nadu" },
  Hyderabad: { lat: 17.385, lng: 78.4867, state: "Telangana" },
  Warangal: { lat: 17.9689, lng: 79.5941, state: "Telangana" },
  Jaipur: { lat: 26.9124, lng: 75.7873, state: "Rajasthan" },
  Jodhpur: { lat: 26.2389, lng: 73.0243, state: "Rajasthan" },
  Udaipur: { lat: 24.5854, lng: 73.7125, state: "Rajasthan" },
  Ahmedabad: { lat: 23.0225, lng: 72.5714, state: "Gujarat" },
  Surat: { lat: 21.1702, lng: 72.8311, state: "Gujarat" },
  Vadodara: { lat: 22.3072, lng: 73.1812, state: "Gujarat" },
  Rajkot: { lat: 22.3039, lng: 70.8022, state: "Gujarat" },
  Kolkata: { lat: 22.5726, lng: 88.3639, state: "West Bengal" },
  Siliguri: { lat: 26.7271, lng: 88.3953, state: "West Bengal" },
  Guwahati: { lat: 26.1445, lng: 91.7362, state: "Assam" },
  Chandigarh: { lat: 30.7333, lng: 76.7794, state: "Chandigarh" },
  Amritsar: { lat: 31.634, lng: 74.8723, state: "Punjab" },
  Ludhiana: { lat: 30.901, lng: 75.8573, state: "Punjab" },
  Lucknow: { lat: 26.8467, lng: 80.9462, state: "Uttar Pradesh" },
  Kanpur: { lat: 26.4499, lng: 80.3319, state: "Uttar Pradesh" },
  Agra: { lat: 27.1767, lng: 78.0081, state: "Uttar Pradesh" },
  Varanasi: { lat: 25.3176, lng: 82.9739, state: "Uttar Pradesh" },
  Noida: { lat: 28.5355, lng: 77.391, state: "Uttar Pradesh" },
  Ghaziabad: { lat: 28.6692, lng: 77.4538, state: "Uttar Pradesh" },
  Indore: { lat: 22.7196, lng: 75.8577, state: "Madhya Pradesh" },
  Bhopal: { lat: 23.2599, lng: 77.4126, state: "Madhya Pradesh" },
  Patna: { lat: 25.5941, lng: 85.1376, state: "Bihar" },
  Ranchi: { lat: 23.3441, lng: 85.3096, state: "Jharkhand" },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245, state: "Odisha" },
  Cuttack: { lat: 20.4625, lng: 85.8828, state: "Odisha" },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185, state: "Andhra Pradesh" },
  Vijayawada: { lat: 16.5062, lng: 80.648, state: "Andhra Pradesh" },
  Tirupati: { lat: 13.6288, lng: 79.4192, state: "Andhra Pradesh" },
  Nellore: { lat: 14.44, lng: 79.99, state: "Andhra Pradesh" },
  Kochi: { lat: 9.9312, lng: 76.2673, state: "Kerala" },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, state: "Kerala" },
  Kozhikode: { lat: 11.2588, lng: 75.7804, state: "Kerala" },
  Goa: { lat: 15.2993, lng: 74.124, state: "Goa" },
};

/* ---- deterministic helpers (stable across reloads) ---- */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

const OPERATORS = ["Tata Power", "Adani Total", "Statiq", "Fortum", "Zeon", "BPCL", "GRIDPULSE", "IOCO", "Charzer"];
const STREETS = ["Tower", "City Centre", "Metro Stn", "IT Park", "Highway", "East Side", "West Side", "Central", "Township", "Industrial Area"];
const AMENITY_POOL = ["24×7", "Café", "Shade", "CCTV", "Restrooms", "Cards accepted", "Wi-Fi"];
const CONNECTOR_POOL = [
  ["CCS2", 1, 3], ["Type 2", 1, 4], ["CHAdeMO", 0, 2],
];
const POWER_KW = [22, 25, 30, 40, 50, 60, 90, 120, 150, 180, 240];

function parsePowerKw(power) {
  const m = String(power || "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 30;
}
function powerClass(powerKw) {
  return powerKw >= 100 ? "ultra" : powerKw >= 40 ? "fast" : "ac";
}
function plugTypes(plugs) {
  const types = [];
  String(plugs || "").split(/[·,]/).forEach((part) => {
    const m = part.match(/([A-Za-z0-9 ]+?)\s*×\s*(\d+)/);
    if (m && m[1].trim()) types.push({ type: m[1].trim(), count: Number(m[2]) });
  });
  return types.length ? types : [{ type: "CCS2", count: 1 }];
}
function connectorSet(types) { return [...new Set(types.map((t) => t.type))]; }
function totalPorts(types) { return Math.max(1, types.reduce((n, t) => n + t.count, 0)); }
function rPrice(powerKw, r) {
  const base = powerKw >= 100 ? 18 : powerKw >= 40 ? 15 : powerKw >= 20 ? 12 : 9;
  return base + Math.round((r() - 0.5) * 4); // ₹9–₹20/kWh
}
function rRating(r) { return Math.round((3.6 + r() * 1.2) * 10) / 10; }
function rAmenities(r) { return [...new Set(Array.from({ length: 2 + Math.floor(r() * 3) }, () => pick(r, AMENITY_POOL)))].sort(); }

/* ---- the anchored nationwide roster ---- */
const BASE_CHARGERS = [
  { id: "NL-DL-01", name: "Tata Power · Aerocity, Delhi", city: "Delhi", state: "Delhi", lat: 28.5562, lng: 77.1, power: "50 kW", plugs: "CCS2 ×2 · Type2 ×1", operator: "Tata Power" },
  { id: "NL-DL-02", name: "Charging Point India · Connaught Place", city: "Delhi", state: "Delhi", lat: 28.6328, lng: 77.2197, power: "60 kW", plugs: "CCS2 ×2", operator: "Charzer" },
  { id: "NL-DL-03", name: "Statiq · Saket", city: "Delhi", state: "Delhi", lat: 28.5245, lng: 77.2067, power: "25 kW", plugs: "CCS2 ×4", operator: "Statiq" },
  { id: "NL-DL-04", name: "Zeon Charging · Dwarka", city: "Delhi", state: "Delhi", lat: 28.5921, lng: 77.046, power: "50 kW", plugs: "CCS2 ×2", operator: "Zeon" },
  { id: "NL-DL-05", name: "BPCL · Ring Road Qutab", city: "Delhi", state: "Delhi", lat: 28.5574, lng: 77.1944, power: "50 kW", plugs: "CCS2 ×1", operator: "BPCL" },
  { id: "NL-UP-01", name: "Tata Power · Noida Sector 62", city: "Noida", state: "Uttar Pradesh", lat: 28.6183, lng: 77.3598, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-UP-02", name: "Tata Power · Ghaziabad NH-9", city: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6771, lng: 77.5079, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-UP-03", name: "MGL E-Mobility · Agra NH-44", city: "Agra", state: "Uttar Pradesh", lat: 27.1993, lng: 78.065, power: "60 kW", plugs: "CCS2 ×2", operator: "MGL" },
  { id: "NL-UP-04", name: "HP Gas · Lucknow NH-27", city: "Lucknow", state: "Uttar Pradesh", lat: 26.8714, lng: 80.9913, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-UP-05", name: "Fortum · Kanpur", city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.28, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-DL-06", name: "Tata Power · Yamuna Expressway", city: "Noida", state: "Uttar Pradesh", lat: 28.4521, lng: 77.6201, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-DL-07", name: "Adani Total · Faridabad NH-44", city: "Delhi", state: "Delhi", lat: 28.4089, lng: 77.3178, power: "120 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-HR-01", name: "Tata Power · Gurugram Cyber Hub", city: "Gurugram", state: "Haryana", lat: 28.4954, lng: 77.0883, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-HR-02", name: "Statiq · Manesar NH-48", city: "Gurugram", state: "Haryana", lat: 28.3768, lng: 76.9346, power: "25 kW", plugs: "Type2 ×2", operator: "Statiq" },
  { id: "NL-HR-03", name: "Statiq · Panipat NH-44", city: "Rohtak", state: "Haryana", lat: 29.3909, lng: 76.9635, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-CH-01", name: "Tata Power · Chandigarh Sector 17", city: "Chandigarh", state: "Chandigarh", lat: 30.7382, lng: 76.7864, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-PB-01", name: "Panipat Energy · Ludhiana", city: "Ludhiana", state: "Punjab", lat: 30.93, lng: 75.75, power: "22 kW", plugs: "Type2 ×2", operator: "Other" },
  { id: "NL-PB-02", name: "HP Gas · Amritsar NH-44", city: "Amritsar", state: "Punjab", lat: 31.647, lng: 74.86, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-RJ-01", name: "Tata Power · Jaipur C-Scheme", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.82, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-RJ-02", name: "BPCL · Delhi–Jaipur NH-48", city: "Jaipur", state: "Rajasthan", lat: 27.4, lng: 76.1, power: "60 kW", plugs: "CCS2 ×2", operator: "BPCL" },
  { id: "NL-RJ-03", name: "Zeon · Udaipur", city: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.733, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-RJ-04", name: "Fortum · Jodhpur NH-62", city: "Jodhpur", state: "Rajasthan", lat: 26.2537, lng: 73.07, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-GJ-01", name: "Tata Power · Ahmedabad SG Highway", city: "Ahmedabad", state: "Gujarat", lat: 23.0298, lng: 72.5262, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-GJ-02", name: "Tata Power · Vadodara NH-48", city: "Vadodara", state: "Gujarat", lat: 22.3, lng: 73.2, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-GJ-03", name: "Adani Total · Surat NH-48", city: "Surat", state: "Gujarat", lat: 21.17, lng: 72.83, power: "60 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-GJ-04", name: "Statiq · Rajkot", city: "Rajkot", state: "Gujarat", lat: 22.28, lng: 70.79, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-GJ-05", name: "Zeon · Gandhinagar", city: "Ahmedabad", state: "Gujarat", lat: 23.2226, lng: 72.6496, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-MH-01", name: "Tata Power · Bandra East, Mumbai", city: "Mumbai", state: "Maharashtra", lat: 19.065, lng: 72.84, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-MH-02", name: "Adani Total · BKC Mumbai", city: "Mumbai", state: "Maharashtra", lat: 19.0581, lng: 72.8686, power: "120 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-MH-03", name: "Zeon · Pune FC Road", city: "Pune", state: "Maharashtra", lat: 18.5562, lng: 73.8441, power: "60 kW", plugs: "CCS2 ×2", operator: "Zeon" },
  { id: "NL-MH-04", name: "Tata Power · Pune Hinjewadi", city: "Pune", state: "Maharashtra", lat: 18.5973, lng: 73.6826, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-MH-05", name: "Statiq · Mumbai–Pune NH-48", city: "Pune", state: "Maharashtra", lat: 18.82, lng: 73.3, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-MH-06", name: "HP Gas · Nashik NH-3", city: "Nashik", state: "Maharashtra", lat: 19.97, lng: 73.75, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-MH-07", name: "Fortum · Nagpur NH-53", city: "Nagpur", state: "Maharashtra", lat: 21.12, lng: 79.14, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-MH-08", name: "Tata Power · Chhatrapati Sambhajinagar", city: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.32, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KA-01", name: "Tata Power · Indiranagar Bengaluru", city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.64, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-KA-02", name: "Statiq · Whitefield Bengaluru", city: "Bengaluru", state: "Karnataka", lat: 12.9707, lng: 77.7506, power: "25 kW", plugs: "Type2 ×4", operator: "Statiq" },
  { id: "NL-KA-03", name: "Zeon · Electronic City", city: "Bengaluru", state: "Karnataka", lat: 12.8452, lng: 77.6602, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-KA-04", name: "Mall of Mysore · Mysuru", city: "Mysuru", state: "Karnataka", lat: 12.3, lng: 76.65, power: "22 kW", plugs: "Type2 ×2", operator: "Other" },
  { id: "NL-KA-05", name: "Mangaluru Smart City · Mangaluru", city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.856, power: "25 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-KA-06", name: "Tata Power · Hubballi NH-48", city: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.124, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KA-07", name: "Adani Total · NH-75 Bengaluru–Hyderabad", city: "Bengaluru", state: "Karnataka", lat: 13.6, lng: 77.6, power: "60 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-TN-01", name: "Tata Power · T Nagar Chennai", city: "Chennai", state: "Tamil Nadu", lat: 13.0418, lng: 80.2341, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-TN-02", name: "Switch Mobility · Chennai–Bengaluru NH-48", city: "Chennai", state: "Tamil Nadu", lat: 13.0, lng: 80.0, power: "60 kW", plugs: "CCS2 ×2", operator: "Other" },
  { id: "NL-TN-03", name: "GRIDPULSE · Vellore Tech Park", city: "Vellore", state: "Tamil Nadu", lat: 12.9165, lng: 79.1325, power: "60 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-04", name: "GRIDPULSE · Katpadi Junction", city: "Vellore", state: "Tamil Nadu", lat: 12.97, lng: 79.14, power: "60 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-05", name: "GRIDPULSE · Anna Nagar Hub", city: "Chennai", state: "Tamil Nadu", lat: 13.0878, lng: 80.2101, power: "120 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-06", name: "Tata Power · Coimbatore", city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-TN-07", name: "Statiq · Madurai NH-44", city: "Madurai", state: "Tamil Nadu", lat: 9.93, lng: 78.12, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-TN-08", name: "Fortum · Tiruchirappalli", city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.79, lng: 78.7, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-TN-09", name: "Zeon · Salem NH-44", city: "Salem", state: "Tamil Nadu", lat: 11.66, lng: 78.15, power: "25 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-TN-10", name: "Tata Power · Chennai Bypass", city: "Chennai", state: "Tamil Nadu", lat: 13.03, lng: 80.24, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-AP-01", name: "Tata Power · Vijayawada NH-16", city: "Vijayawada", state: "Andhra Pradesh", lat: 16.5, lng: 80.61, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-AP-02", name: "Fortum · Visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.7, lng: 83.21, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-AP-03", name: "Tata Power · Tirupati NH-71", city: "Tirupati", state: "Andhra Pradesh", lat: 13.63, lng: 79.42, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-AP-04", name: "Adani Total · NH-16 Nellore", city: "Nellore", state: "Andhra Pradesh", lat: 14.44, lng: 79.99, power: "60 kW", plugs: "CCS2 ×1", operator: "Adani Total" },
  { id: "NL-TS-01", name: "Tata Power · Banjara Hills Hyderabad", city: "Hyderabad", state: "Telangana", lat: 17.4156, lng: 78.4347, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-TS-02", name: "Switch Mobility · Hyderabad–Bengaluru NH-44", city: "Hyderabad", state: "Telangana", lat: 17.2, lng: 78.3, power: "50 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-TS-03", name: "Zeon · Warangal", city: "Warangal", state: "Telangana", lat: 17.97, lng: 79.6, power: "25 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-WB-01", name: "Tata Power · Salt Lake Kolkata", city: "Kolkata", state: "West Bengal", lat: 22.5845, lng: 88.4027, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-WB-02", name: "Fortum · Kolkata NH-12", city: "Kolkata", state: "West Bengal", lat: 22.6, lng: 88.3, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-WB-03", name: "Girnar · Siliguri NH-27", city: "Siliguri", state: "West Bengal", lat: 26.72, lng: 88.4, power: "50 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-AS-01", name: "Tata Power · Guwahati NH-27", city: "Guwahati", state: "Assam", lat: 26.14, lng: 91.7, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-OR-01", name: "Statiq · Bhubaneswar", city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-OR-02", name: "Fortum · Cuttack NH-16", city: "Cuttack", state: "Odisha", lat: 20.46, lng: 85.88, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-MP-01", name: "Tata Power · Indore", city: "Indore", state: "Madhya Pradesh", lat: 22.7, lng: 75.86, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-MP-02", name: "Statiq · Bhopal NH-12", city: "Bhopal", state: "Madhya Pradesh", lat: 23.26, lng: 77.41, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-MP-03", name: "Tata Power · Delhi–Indore NH-46", city: "Indore", state: "Madhya Pradesh", lat: 24.1, lng: 77.3, power: "60 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KL-01", name: "Tata Power · Kochi Marine Drive", city: "Kochi", state: "Kerala", lat: 9.9816, lng: 76.2757, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-KL-02", name: "Fortum · Thiruvananthapuram NH-66", city: "Thiruvananthapuram", state: "Kerala", lat: 8.48, lng: 76.95, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-KL-03", name: "Zeon · Kozhikode NH-66", city: "Kozhikode", state: "Kerala", lat: 11.26, lng: 75.78, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-GA-01", name: "Statiq · Panaji Goa", city: "Goa", state: "Goa", lat: 15.49, lng: 73.82, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-GA-02", name: "Zeon · Goa NH-66", city: "Goa", state: "Goa", lat: 15.32, lng: 73.99, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-JH-01", name: "Statiq · Ranchi NH-33", city: "Ranchi", state: "Jharkhand", lat: 23.34, lng: 85.33, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-BR-01", name: "Tata Power · Patna NH-30", city: "Patna", state: "Bihar", lat: 25.6, lng: 85.1, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
];

/* ---- generate dense, realistic city clusters around each metro ---- */
const METRO_COUNT = { Mumbai: 12, Delhi: 14, "New Delhi": 0, Bengaluru: 12, Hyderabad: 10, Chennai: 10, Pune: 10, Kolkata: 10, Ahmedabad: 6, Kochi: 6, Coimbatore: 6, Surat: 6, Noida: 6, Ghaziabad: 4 };
const TIER2_COUNT = { Jaipur: 6, Chandigarh: 6, Lucknow: 6, Indore: 6, Bhopal: 6, Nagpur: 6, Nashik: 6, Mysuru: 6, Visakhapatnam: 6, Vijayawada: 6, Patna: 6, Ludhiana: 6, Rajkot: 6, Vadodara: 6, Kanpur: 6, Agra: 6, Varanasi: 6, Aurangabad: 6, Madurai: 6, Tiruchirappalli: 6, Thiruvananthapuram: 6, Kozhikode: 6, Mangaluru: 6, Hubballi: 6, Siliguri: 6, Guwahati: 6, Tirupati: 6, Amritsar: 6, Jodhpur: 6, Udaipur: 6, Bhubaneswar: 6, Cuttack: 6, Salem: 6, Warangal: 6, Goa: 6, Ranchi: 6 };

function buildClusters() {
  const out = [];
  let n = 0;
  const seen = new Set();
  Object.keys(IN_CITIES).forEach((city) => {
    if (VIEW_CITY_SEEN(city)) return;
    const meta = IN_CITIES[city];
    if (!meta) return;
    let count = METRO_COUNT[city] || 4;
    const spread = count >= 10 ? 0.16 : count >= 6 ? 0.08 : 0.05;
    const rnd = mulberry32(hashStr("gp" + city));
    for (let i = 0; i < count; i++) {
      const op = pick(rnd, OPERATORS);
      const powerKw = pick(rnd, POWER_KW);
      const plugCount = 1 + Math.floor(rnd() * 3);
      const plugs = Array.from({ length: plugCount }, () => {
        const [type, min, max] = pick(rnd, CONNECTOR_POOL);
        return `${type} ×${min + Math.floor(rnd() * (max - min + 1))}`;
      }).join(" · ");
      const types = plugTypes(plugs);
      const idx = n++;
      const id = `GX-${String(idx).padStart(3, "0")}`;
      const lat = meta.lat + (rnd() - 0.5) * spread * 1.1;
      const lng = meta.lng + (rnd() - 0.5) * spread;
      const street = pick(rnd, STREETS);
      out.push({
        id,
        name: `${op} · ${city} ${street}`,
        city: city === "New Delhi" ? "Delhi" : city,
        state: meta.state,
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        power: `${powerKw} kW`,
        powerKw,
        plugs,
        types,
        operator: op,
      });
    }
  });
  return out;
}
function VIEW_CITY_SEEN(city) { return city === "New Delhi"; } // Delhi covers it (same coords)

/* ---- normalize the full directory with stable derived fields ---- */
export const IN_CHARGERS = [...BASE_CHARGERS, ...buildClusters()].map((c) => {
  const powerKw = c.powerKw || parsePowerKw(c.power);
  const types = c.types || plugTypes(c.plugs);
  const ports = totalPorts(types);
  const rnd = mulberry32(hashStr(c.id));
  const price = c.price != null ? c.price : rPrice(powerKw, rnd);
  return {
    ...c,
    powerKw,
    connectorTypes: connectorSet(types),
    totalPorts: ports,
    availablePorts: c.availablePorts != null ? c.availablePorts : Math.max(0, Math.round(rnd() * ports)),
    rating: c.rating != null ? c.rating : rRating(rnd),
    powerClass: c.powerClass || powerClass(powerKw),
    amenities: c.amenities || rAmenities(rnd),
    hours: c.hours || "24×7",
    price,
    priceInr: price,
    siteCount: 1,
  };
});

/* Convenience lookups used across the app. */
export const CITY_CENTROID = (city) => IN_CITIES[city] || null;
export const STATE_LIST = [...new Set(IN_CHARGERS.map((c) => c.state))].sort();
export const OPERATOR_LIST = [...new Set(IN_CHARGERS.map((c) => c.operator))].sort();
export const CONNECTOR_LIST = [...new Set(IN_CHARGERS.flatMap((c) => c.connectorTypes))].sort();

/* Nearest N national stations to a point (straight-line, haversine). */
export function chargersNear(lat, lng, limit = 30, maxKm = 25) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dist = (a, b) => {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(s));
  };
  return IN_CHARGERS.map((c) => ({ ...c, km: dist({ lat, lng }, c) }))
    .filter((c) => c.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/* Geocode helper: prefer an exact IN_CITIES match, else null (caller uses the backend proxy). */
export function matchCity(q) {
  const qq = String(q || "").trim().toLowerCase();
  if (!qq) return null;
  const exact = Object.keys(IN_CITIES).find((k) => k.toLowerCase() === qq);
  if (exact) return { key: exact, ...IN_CITIES[exact], city: exact };
  const stateHit = Object.keys(IN_CITIES).find((k) => IN_CITIES[k].state.toLowerCase() === qq);
  if (stateHit) return { key: stateHit, ...IN_CITIES[stateHit], city: stateHit, state: IN_CITIES[stateHit].state };
  return null;
}