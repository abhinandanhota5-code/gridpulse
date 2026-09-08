/* ------------------------------------------------------------------ */
/*  Mock data — stands in for the real OCPP/telemetry/billing backend  */
/*  Swap any of these for real DB queries once you wire one up.        */
/* ------------------------------------------------------------------ */

/* ---- EV driver dashboard ---- */
const driverChargeHistory = [
  { day: "Mon", kwh: 12 }, { day: "Tue", kwh: 18 }, { day: "Wed", kwh: 9 },
  { day: "Thu", kwh: 22 }, { day: "Fri", kwh: 15 }, { day: "Sat", kwh: 24 },
  { day: "Sun", kwh: 19 },
];

const driverCostHistory = [
  { day: "Mon", cost: 2.1 }, { day: "Tue", cost: 3.4 }, { day: "Wed", cost: 1.6 },
  { day: "Thu", cost: 4.0 }, { day: "Fri", cost: 2.7 }, { day: "Sat", cost: 4.6 },
  { day: "Sun", cost: 3.2 },
];

const driverBatteryHealth = [
  { month: "Apr", health: 98, projected: 97.8 }, { month: "May", health: 97.5, projected: 97.2 }, { month: "Jun", health: 97, projected: 96.5 },
  { month: "Jul", health: 96.2, projected: 95.8 }, { month: "Aug", health: 95.4, projected: 95.0 }, { month: "Sep", health: 94.8, projected: 94.2 },
];

const driverUpcoming = [
  { day: "Tomorrow", slot: "7:00 – 9:00 AM", site: "Anna Nagar Hub" },
  { day: "Friday", slot: "6:30 – 8:00 PM", site: "Home charger" },
];

const fastagId = "FT-IN 6231 8890 4471";

const fastagTransactions = [
  { id: "TXN-88219", date: "Mon, 7:12 AM", location: "Anna Nagar Hub", kwh: 12, duration: "28 min", amount: 2.10, currency: "USD", status: "paid" },
  { id: "TXN-88231", date: "Tue, 6:48 PM", location: "Vellore Tech Park", kwh: 18, duration: "44 min", amount: 3.40, currency: "USD", status: "paid" },
  { id: "TXN-88244", date: "Wed, 8:05 AM", location: "Home charger", kwh: 9, duration: "1h 12m", amount: 1.60, currency: "USD", status: "paid" },
  { id: "TXN-88259", date: "Thu, 7:30 PM", location: "Katpadi Junction", kwh: 22, duration: "51 min", amount: 4.00, currency: "USD", status: "paid" },
  { id: "TXN-88267", date: "Fri, 7:55 AM", location: "Anna Nagar Hub", kwh: 15, duration: "36 min", amount: 2.70, currency: "USD", status: "paid" },
  { id: "TXN-88281", date: "Sat, 5:20 PM", location: "CMC Charging Bay", kwh: 24, duration: "1h 04m", amount: 4.60, currency: "USD", status: "paid" },
  { id: "TXN-88296", date: "Sun, 6:40 PM", location: "Home charger", kwh: 19, duration: "58 min", amount: 3.20, currency: "USD", status: "pending" },
];

const nearbyChargers = [
  { name: "Anna Nagar Hub", lat: 12.9179, lng: 79.1363, distance: "0.6 km", status: "available", price: "$0.16/kWh", connector: "CCS2" },
  { name: "Vellore Tech Park", lat: 12.9300, lng: 79.1333, distance: "1.4 km", status: "busy", price: "$0.18/kWh", connector: "Type 2" },
  { name: "CMC Charging Bay", lat: 12.9110, lng: 79.1267, distance: "2.1 km", status: "maintenance", price: "$0.15/kWh", connector: "CCS2" },
  { name: "Katpadi Junction", lat: 12.9720, lng: 79.1430, distance: "3.0 km", status: "available", price: "$0.17/kWh", connector: "CHAdeMO" },
];

/* Vehicle + charge-planner profiles.
   `iconKey` is a lookup string — the frontend maps it to a lucide-react icon
   component, since icon components can't travel over JSON. */
const currentSoc = 54;
const vehicleName = "Tata Nexon EV Max";
const vehicleBatteryKwh = 40.5;

const chargeProfiles = [
  {
    key: "instant",
    iconKey: "instant",
    title: "Instant readiness",
    sub: "Full power, ready ASAP",
    maxPowerKw: 50,
    rate: 0.19,
    stressLabel: "Higher — sustained high-power draw",
    stressColorKey: "red",
  },
  {
    key: "balanced",
    iconKey: "balanced",
    title: "Not too slow, better on battery",
    sub: "Moderate pace, comfortable buffer",
    maxPowerKw: 30,
    minPowerKw: 11,
    rate: 0.16,
    stressLabel: "Moderate — some margin, not maxed out",
    stressColorKey: "amber",
  },
  {
    key: "gentle",
    iconKey: "gentle",
    title: "Ample time, gentlest on battery",
    sub: "Slow & cool, kindest to the pack",
    maxPowerKw: 11,
    minPowerKw: 6,
    rate: 0.14,
    stressLabel: "Lowest — slow, cool charging",
    stressColorKey: "green",
  },
];

/* Extra overview KPIs — keep labels short; UI renders value + sub. */
const driverMetrics = {
  monthKwh: { value: "119 kWh", sub: "+8% vs. last month", trend: "up" },
  monthSpend: { value: "$21.30", sub: "Avg $0.18/kWh" },
  monthSessions: { value: "9", sub: "This month" },
  estRangeKm: { value: "238 km", sub: "At current SoC" },
  lifetimeKwh: { value: "3,842 kWh", sub: "Since owning this vehicle" },
  co2Avoided: { value: "1.9 t", sub: "Vs. an equivalent petrol car" },
  efficiency: { value: "6.8 km/kWh", sub: "Last 30 days" },
  homeShare: { value: "35%", sub: "Rest charged on the network" },
  // Newly added metrics
  walletBalance: { value: "$48.20", sub: "FASTag prepaid balance" },
  offPeakSavings: { value: "$6.40", sub: "Saved by charging off-peak MTD", trend: "up" },
  avgTimeTo80: { value: "41 min", sub: "Last 10 public sessions" },
  sessionSuccess: { value: "98%", sub: "Successful starts this month" },
  packTempC: { value: "32°C", sub: "Within ideal charge band", accent: "green" },
  gridFriendlyScore: { value: "86", sub: "How often you charge with the grid" },
  weeklyDistanceKm: { value: "214 km", sub: "+12 km vs. last week", trend: "up" },
  regenKwh: { value: "18.4 kWh", sub: "Recovered this month via regen" },
  idleFeeRisk: { value: "Low", sub: "Avg 4 min post-charge dwell" },
  nextBillEstimate: { value: "$24.50", sub: "Projected this billing cycle" },
};

const driverWeeklyExtras = [
  { day: "Mon", rangeKm: 28, savings: 0.8 },
  { day: "Tue", rangeKm: 36, savings: 1.1 },
  { day: "Wed", rangeKm: 22, savings: 0.4 },
  { day: "Thu", rangeKm: 41, savings: 1.4 },
  { day: "Fri", rangeKm: 33, savings: 0.9 },
  { day: "Sat", rangeKm: 48, savings: 1.6 },
  { day: "Sun", rangeKm: 26, savings: 0.7 },
];

const driverData = {
  driverChargeHistory,
  driverCostHistory,
  driverBatteryHealth,
  driverUpcoming,
  fastagId,
  fastagTransactions,
  nearbyChargers,
  currentSoc,
  vehicleName,
  vehicleBatteryKwh,
  chargeProfiles,
  driverMetrics,
  driverWeeklyExtras,
};

/* ---- Fleet owner dashboard ---- */
const fleetChargers = [
  { id: "CH-014", location: "Anna Nagar Hub", status: "healthy", power: "42 kW active", lastService: "12 days ago" },
  { id: "CH-027", location: "Vellore Tech Park", status: "warning", power: "18 kW active", lastService: "3 days ago" },
  { id: "CH-031", location: "CMC Charging Bay", status: "critical", power: "Offline", lastService: "58 days ago" },
  { id: "CH-002", location: "Katpadi Junction", status: "healthy", power: "60 kW active", lastService: "20 days ago" },
  { id: "CH-019", location: "Ranipet Depot", status: "healthy", power: "Idle", lastService: "9 days ago" },
  { id: "CH-008", location: "Gandhi Nagar Lot", status: "warning", power: "30 kW active", lastService: "41 days ago" },
];

const activeSessions = [
  { id: "S-2291", vehicle: "Tata Nexon EV", plate: "TN 09 AB 4471", plateConf: "high", charger: "CH-014 · Anna Nagar", soc: "68%", cost: "$8.40" },
  { id: "S-2287", vehicle: "MG ZS EV", plate: "TN 23 CJ 0092", plateConf: "high", charger: "CH-002 · Katpadi Jn", soc: "81%", cost: "$11.10" },
  { id: "S-2299", vehicle: "Tata Tiago EV", plate: "TN 09 BF 7765", plateConf: "medium", charger: "CH-027 · Vellore Tech", soc: "44%", cost: "$4.65" },
  { id: "S-2301", vehicle: "BYD Atto 3", plate: "—", plateConf: "unmatched", charger: "CH-019 · Ranipet Depot", soc: "29%", cost: "$2.10" },
];

const siteUtilization = [
  { site: "Anna Nagar", util: 82 }, { site: "Vellore Tech", util: 64 },
  { site: "CMC Bay", util: 12 }, { site: "Katpadi Jn", util: 91 },
  { site: "Ranipet Depot", util: 38 }, { site: "Gandhi Nagar", util: 57 },
];

const sessionThroughput = [
  { hour: "6am", sessions: 4 }, { hour: "9am", sessions: 11 }, { hour: "12pm", sessions: 18 },
  { hour: "3pm", sessions: 22 }, { hour: "6pm", sessions: 29 }, { hour: "9pm", sessions: 17 },
  { hour: "12am", sessions: 6 },
];

const anomalies = [
  { charger: "CH-031", severity: "high", detail: "Meter draw 14% below expected — possible bypass", time: "2h ago" },
  { charger: "CH-008", severity: "medium", detail: "Charging cycle irregular vs. session profile", time: "6h ago" },
  { charger: "CH-027", severity: "low", detail: "Temperature drift outside normal band", time: "1d ago" },
];

const alertTrend = [
  { day: "Mon", count: 2 }, { day: "Tue", count: 1 }, { day: "Wed", count: 4 },
  { day: "Thu", count: 3 }, { day: "Fri", count: 2 }, { day: "Sat", count: 5 }, { day: "Sun", count: 3 },
];

const maintenanceQueue = [
  { charger: "CH-031", task: "Connector inspection", due: "Overdue" },
  { charger: "CH-008", task: "Firmware update", due: "In 2 days" },
  { charger: "CH-027", task: "Thermal sensor check", due: "In 5 days" },
  { charger: "CH-019", task: "Routine service", due: "In 12 days" },
];

const energyTrend = [
  { day: "Mon", kwh: 980 }, { day: "Tue", kwh: 1120 }, { day: "Wed", kwh: 860 },
  { day: "Thu", kwh: 1340 }, { day: "Fri", kwh: 1190 }, { day: "Sat", kwh: 1420 },
  { day: "Sun", kwh: 1240 },
];

const gridLoad = [
  { hour: "6am", demand: 210, capacity: 600 }, { hour: "9am", demand: 340, capacity: 600 },
  { hour: "12pm", demand: 410, capacity: 600 }, { hour: "3pm", demand: 520, capacity: 600 },
  { hour: "6pm", demand: 580, capacity: 600 }, { hour: "9pm", demand: 460, capacity: 600 },
  { hour: "12am", demand: 240, capacity: 600 },
];

const costSplit = [
  { band: "Off-peak", cost: 540 }, { band: "Standard", cost: 410 }, { band: "Peak", cost: 290 },
];

const demandResponseEvents = [
  { date: "Sep 4", detail: "Reduced 38 kW for 45 min", incentive: "$22.40" },
  { date: "Sep 2", detail: "Reduced 25 kW for 30 min", incentive: "$14.80" },
  { date: "Aug 29", detail: "Reduced 52 kW for 60 min", incentive: "$31.00" },
];

const healthDistribution = [
  { band: "90-100%", count: 18 }, { band: "80-89%", count: 15 },
  { band: "70-79%", count: 9 }, { band: "<70%", count: 6 },
];

const fleetHealthTrend = [
  { month: "Apr", health: 97.1 }, { month: "May", health: 96.6 }, { month: "Jun", health: 96.0 },
  { month: "Jul", health: 95.5 }, { month: "Aug", health: 94.9 }, { month: "Sep", health: 94.3 },
];

const batteryWatchlist = [
  { charger: "CH-031", asset: "Depot EV #12", health: "81.2%", cycles: "842 cycles" },
  { charger: "CH-008", asset: "Depot EV #07", health: "85.6%", cycles: "701 cycles" },
  { charger: "CH-027", asset: "Depot EV #19", health: "88.0%", cycles: "588 cycles" },
];

/* ---- weather (South India network region) ---- */
const currentWeather = { tempC: 31, feelsLikeC: 35, condition: "Cloudy", humidity: 78, rainChance: 15 };
// The driver overview page also shows today's weather — share the same object.
driverData.currentWeather = currentWeather;

const weatherForecast = [
  { day: "Today", high: 36, low: 26, rain: 15, condition: "rain" },
  { day: "Sun", high: 36, low: 26, rain: 25, condition: "rain" },
  { day: "Mon", high: 37, low: 26, rain: 10, condition: "sun" },
  { day: "Tue", high: 37, low: 25, rain: 5, condition: "sun" },
  { day: "Wed", high: 36, low: 26, rain: 5, condition: "sun" },
  { day: "Thu", high: 36, low: 26, rain: 35, condition: "rain" },
  { day: "Fri", high: 34, low: 25, rain: 45, condition: "rain" },
];

const weatherDemandCorrelation = [
  { day: "Mon", tempC: 33, demand: 1120 }, { day: "Tue", tempC: 35, demand: 1340 },
  { day: "Wed", tempC: 31, demand: 860 }, { day: "Thu", tempC: 36, demand: 1420 },
  { day: "Fri", tempC: 34, demand: 1190 }, { day: "Sat", tempC: 37, demand: 1480 },
  { day: "Sun", tempC: 32, demand: 980 },
];

/* ---- energy theft ---- */
const theftFlags = [
  { charger: "CH-031", site: "CMC Charging Bay", expected: "46 kW", actual: "12 kW", deviation: "-74%", confidence: "high", detected: "2h ago", type: "Meter bypass" },
  { charger: "CH-008", site: "Gandhi Nagar Lot", expected: "30 kW", actual: "22 kW", deviation: "-27%", confidence: "medium", detected: "1d ago", type: "Unmetered session" },
  { charger: "CH-019", site: "Ranipet Depot", expected: "0 kW (idle)", actual: "9 kW", deviation: "+9 kW", confidence: "medium", detected: "3d ago", type: "Phantom draw" },
  { charger: "CH-002", site: "Katpadi Junction", expected: "60 kW", actual: "51 kW", deviation: "-15%", confidence: "low", detected: "5d ago", type: "Tariff mismatch" },
];

const theftByType = [
  { type: "Unmetered", count: 5 }, { type: "Tariff mismatch", count: 4 },
  { type: "Meter bypass", count: 3 }, { type: "Phantom draw", count: 2 },
];

const theftTrend = [
  { week: "Wk 1", incidents: 2 }, { week: "Wk 2", incidents: 3 }, { week: "Wk 3", incidents: 1 },
  { week: "Wk 4", incidents: 4 }, { week: "Wk 5", incidents: 3 }, { week: "Wk 6", incidents: 5 },
];

const ownerMetrics = {
  totalChargers: { value: "48", sub: "6 sites" },
  activeSessions: { value: "31", sub: "65% utilization" },
  energyToday: { value: "1,240 kWh", sub: "+9% vs. yesterday", trend: "up" },
  revenueToday: { value: "$612", sub: "Across all sites" },
  fleetUptime: { value: "98.4%", sub: "Last 30 days" },
  avgSessionLength: { value: "52 min", sub: "-4 min vs. last week", trend: "down" },
  co2Avoided: { value: "0.86 t", sub: "This month" },
  // Newly added metrics
  availablePorts: { value: "17", sub: "Ready for new sessions" },
  peakDemandKw: { value: "580 kW", sub: "97% of contracted capacity", accent: "amber" },
  revenuePerSession: { value: "$5.46", sub: "Avg today" },
  uniqueDrivers: { value: "86", sub: "Served in last 24h" },
  failedStarts: { value: "2.1%", sub: "Below 3% network target", accent: "green" },
  overdueMaintenance: { value: "1", sub: "CH-031 connector inspection", accent: "red" },
  drIncentivesMtd: { value: "$68.20", sub: "Demand-response earnings" },
  avgWaitMin: { value: "9 min", sub: "Across queued sites" },
  renewableShare: { value: "22%", sub: "Of energy delivered MTD" },
  networkHealth: { value: "91", sub: "Composite uptime + alerts score" },
  connectorFaults: { value: "3", sub: "Need technician visit", accent: "amber" },
  occupancyNow: { value: "65%", sub: "Live network occupancy" },
};

const ownerHourlyRevenue = [
  { hour: "6am", revenue: 28 }, { hour: "9am", revenue: 72 }, { hour: "12pm", revenue: 95 },
  { hour: "3pm", revenue: 118 }, { hour: "6pm", revenue: 142 }, { hour: "9pm", revenue: 88 },
  { hour: "12am", revenue: 31 },
];

const ownerData = {
  fleetChargers,
  activeSessions,
  siteUtilization,
  sessionThroughput,
  anomalies,
  alertTrend,
  maintenanceQueue,
  energyTrend,
  gridLoad,
  costSplit,
  demandResponseEvents,
  healthDistribution,
  fleetHealthTrend,
  batteryWatchlist,
  currentWeather,
  weatherForecast,
  weatherDemandCorrelation,
  theftFlags,
  theftByType,
  theftTrend,
  ownerMetrics,
  ownerHourlyRevenue,
};

module.exports = { driverData, ownerData };
