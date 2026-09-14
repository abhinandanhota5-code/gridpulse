/* ------------------------------------------------------------------ */
/*  GRIDPULSE - MaintenancePilot: AI Maintenance & Dues Orchestrator  */
/*                                                                     */
/*  An autonomous cyber-physical AI module that:                       */
/*  1. Monitors hardware health, contactor resistance, and sensor drift*/
/*     across all charging bays and substation transformers.           */
/*  2. Predicts equipment degradation and failure probabilities.       */
/*  3. Calculates maintenance dues, spare parts cost, and overdue      */
/*     SLA penalties in real time (in ₹ INR and $ USD).                */
/*  4. Generates itemized work order invoices and handles autonomous   */
/*     settlement via corporate ledger / FASTag.                       */
/*  5. Emits structured decision traces and audit records into PRISM.  */
/* ------------------------------------------------------------------ */

const prism = require("./prism");

class MaintenancePilotOrchestrator {
  constructor() {
    this.autoAuditIntervalMs = 30000; // Run predictive audit every 30s
    this.timer = null;
    this.lastAuditTime = new Date().toISOString();

    // Hardware asset health catalog with cyber-physical telemetry
    this.assets = [
      {
        id: "CH-031",
        name: "CMC Charging Bay · DC Fast 120 kW",
        site: "CMC Charging Bay",
        category: "DC Fast Charger",
        healthScore: 38, // 0-100%
        status: "critical",
        failureProbabilityPct: 94,
        daysToExpectedFailure: 4,
        telemetry: {
          contactResistanceMilliOhms: 0.84, // Normal: < 0.25 mΩ
          tempRiseAboveAmbientC: 24.2,      // Normal: < 10°C
          cableFlexCycles: 14200,          // Rated: 15,000 cycles
          meterCalibrationDriftPct: -14.0,  // Correlates with bypass
          fanRpm: 1200,                    // Rated: 3,000 RPM (clogged)
        },
        diagnostics: "Severely degraded Type-2 connector pins and main DC contactor pitted from sustained high C-rate arcs. High thermal rise (+24.2°C) risks terminal melting.",
        recommendedAction: "Immediate isolation: replace Type-2 connector head & DC contactor kit. Recalibrate energy meter before re-energizing.",
        workOrderId: "WO-2026-031",
        invoiceId: "INV-MNT-2026-031",
        task: "Connector Head & Contactor Overhaul",
        part: "Type-2 High-Amp Connector + DC Contactor Kit",
        estDowntime: "45 min",
        due: "Overdue",
        dueDate: "2026-09-01",
        dues: {
          partsCostInr: 8500,
          laborCostInr: 2500,
          overdueSlaPenaltyInr: 1450,
          vendorCreditInr: 0,
          totalPayableInr: 12450,
          totalPayableUsd: 149.5,
        },
        settlementStatus: "overdue", // "overdue" | "pending_approval" | "approved" | "settled"
        lastService: "58 days ago",
      },
      {
        id: "CH-008",
        name: "Gandhi Nagar Lot · 30 kW Fast DC",
        site: "Gandhi Nagar Lot",
        category: "DC Fast Charger",
        healthScore: 68,
        status: "warning",
        failureProbabilityPct: 62,
        daysToExpectedFailure: 18,
        telemetry: {
          contactResistanceMilliOhms: 0.32,
          tempRiseAboveAmbientC: 8.5,
          cableFlexCycles: 8900,
          meterCalibrationDriftPct: -4.2,
          fanRpm: 2650,
        },
        diagnostics: "MeterValues rounding skew caused by firmware v4.1.9 timing desync. Branch meter reads 4.2% below feeder draw.",
        recommendedAction: "Flash firmware v4.2.1 and run 3-phase meter calibration test curve.",
        workOrderId: "WO-2026-008",
        invoiceId: "INV-MNT-2026-008",
        task: "Firmware Flash & Meter Recalibration",
        part: "Firmware patch + Precision CT Clamp Calibration",
        estDowntime: "20 min",
        due: "In 2 days",
        dueDate: "2026-09-17",
        dues: {
          partsCostInr: 3200,
          laborCostInr: 1800,
          overdueSlaPenaltyInr: 0,
          vendorCreditInr: 500,
          totalPayableInr: 4500,
          totalPayableUsd: 54.0,
        },
        settlementStatus: "pending_approval",
        lastService: "41 days ago",
      },
      {
        id: "CH-027",
        name: "Ranipet Depot · 60 kW Dual Bay",
        site: "Ranipet Depot",
        category: "Dual DC Fast Charger",
        healthScore: 74,
        status: "warning",
        failureProbabilityPct: 48,
        daysToExpectedFailure: 35,
        telemetry: {
          contactResistanceMilliOhms: 0.22,
          tempRiseAboveAmbientC: 12.1,
          cableFlexCycles: 6100,
          meterCalibrationDriftPct: +0.6,
          fanRpm: 2900,
        },
        diagnostics: "NTC temperature sensor exhibiting non-linear +6°C positive bias during ambient midday heat, causing premature power throttling.",
        recommendedAction: "Replace NTC temperature probe, re-seat thermal probe harness, and re-apply zinc thermal paste.",
        workOrderId: "WO-2026-027",
        invoiceId: "INV-MNT-2026-027",
        task: "Thermal Sensor Replacement",
        part: "NTC 100kΩ Thermistor Probe & Thermal Compound",
        estDowntime: "30 min",
        due: "In 5 days",
        dueDate: "2026-09-20",
        dues: {
          partsCostInr: 1800,
          laborCostInr: 1500,
          overdueSlaPenaltyInr: 0,
          vendorCreditInr: 0,
          totalPayableInr: 3300,
          totalPayableUsd: 39.5,
        },
        settlementStatus: "scheduled",
        lastService: "3 days ago",
      },
      {
        id: "CH-019",
        name: "Vellore Tech Depot · 150 kW Ultra-Fast",
        site: "Vellore Tech Park",
        category: "Ultra-Fast DC",
        healthScore: 88,
        status: "healthy",
        failureProbabilityPct: 19,
        daysToExpectedFailure: 90,
        telemetry: {
          contactResistanceMilliOhms: 0.16,
          tempRiseAboveAmbientC: 4.8,
          cableFlexCycles: 3400,
          meterCalibrationDriftPct: +0.2,
          fanRpm: 3100,
        },
        diagnostics: "Cooling air intake filter accumulating regional particulate dust. Airflow delta is at 78% of factory nominal.",
        recommendedAction: "Scheduled preventive maintenance: replace HEPA air intake filters and inspect coolant reservoir level.",
        workOrderId: "WO-2026-019",
        invoiceId: "INV-MNT-2026-019",
        task: "Preventive Filter & Coolant Service",
        part: "Dual HEPA Filter Set + Glycol Coolant Top-Up",
        estDowntime: "60 min",
        due: "In 12 days",
        dueDate: "2026-09-27",
        dues: {
          partsCostInr: 2400,
          laborCostInr: 1600,
          overdueSlaPenaltyInr: 0,
          vendorCreditInr: 0,
          totalPayableInr: 4000,
          totalPayableUsd: 48.0,
        },
        settlementStatus: "scheduled",
        lastService: "9 days ago",
      },
      {
        id: "TX-SUB-01",
        name: "Substation Step-Down Transformer 300 kVA",
        site: "Central Depot Substation",
        category: "High-Voltage Transformer",
        healthScore: 92,
        status: "healthy",
        failureProbabilityPct: 12,
        daysToExpectedFailure: 180,
        telemetry: {
          oilDielectricKv: 48.5,       // Safe: > 35 kV
          topOilTempC: 56.2,           // Max safe: 75°C
          windingHotspotC: 68.4,       // Max safe: 95°C
          neutralCurrentAmps: 8.2,     // 3-phase neutral return
          harmonicsThdPct: 3.4,        // Max allowed: 5.0%
        },
        diagnostics: "Transformer operating within safe thermal parameters. Minimal winding hotspot drift.",
        recommendedAction: "Semi-annual dielectric oil breakdown test and utility infrared thermography sweep.",
        workOrderId: "WO-2026-TX01",
        invoiceId: "INV-MNT-2026-TX01",
        task: "Substation Dielectric & IR Thermography Sweep",
        part: "Transformer Oil Lab Assay & Infrared Survey",
        estDowntime: "0 min (Live line)",
        due: "In 28 days",
        dueDate: "2026-10-13",
        dues: {
          partsCostInr: 4500,
          laborCostInr: 2500,
          overdueSlaPenaltyInr: 0,
          vendorCreditInr: 0,
          totalPayableInr: 7000,
          totalPayableUsd: 84.0,
        },
        settlementStatus: "scheduled",
        lastService: "85 days ago",
      },
    ];

    this.settledHistory = [
      {
        id: "WO-2026-014",
        invoiceId: "INV-MNT-2026-014",
        chargerId: "CH-014",
        site: "Anna Nagar Hub",
        task: "CCS2 Cable Retractor Spring Replacement",
        amountInr: 6800,
        settledDate: "2026-09-03",
        settledVia: "FASTag Enterprise Auto-Debit",
        status: "settled",
        traceId: "pt-settle-014-hist",
      },
      {
        id: "WO-2026-002",
        invoiceId: "INV-MNT-2026-002",
        chargerId: "CH-002",
        site: "Katpadi Junction",
        task: "CHAdeMO Solenoid Latch Actuator Swap",
        amountInr: 9200,
        settledDate: "2026-08-26",
        settledVia: "HDFC Fleet Corporate Escrow",
        status: "settled",
        traceId: "pt-settle-002-hist",
      },
      {
        id: "WO-2026-SUB-A",
        invoiceId: "INV-MNT-2026-SUBA",
        chargerId: "TX-SUB-01",
        site: "Central Depot Substation",
        task: "Surge Arrester & Neutral Ground Resistance Re-bond",
        amountInr: 14500,
        settledDate: "2026-08-15",
        settledVia: "Utility Direct ACH",
        status: "settled",
        traceId: "pt-settle-suba-hist",
      },
    ];
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runAudit({ trigger: "heartbeat_scheduled" }).catch(() => {});
    }, this.autoAuditIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Calculate aggregated financial metrics and dues summary.
   */
  calculateFinancials() {
    let totalOutstandingInr = 0;
    let totalOverdueInr = 0;
    let pendingApprovalInr = 0;
    let scheduledInr = 0;
    let overdueCount = 0;
    let criticalCount = 0;

    for (const asset of this.assets) {
      if (asset.settlementStatus !== "settled") {
        totalOutstandingInr += asset.dues.totalPayableInr;
        if (asset.due === "Overdue" || asset.settlementStatus === "overdue") {
          totalOverdueInr += asset.dues.totalPayableInr;
          overdueCount++;
        } else if (asset.settlementStatus === "pending_approval") {
          pendingApprovalInr += asset.dues.totalPayableInr;
        } else {
          scheduledInr += asset.dues.totalPayableInr;
        }
      }
      if (asset.status === "critical") criticalCount++;
    }

    const settledMtdInr = this.settledHistory.reduce((sum, h) => sum + (h.amountInr || 0), 0);

    return {
      totalOutstandingInr,
      totalOutstandingUsd: Number((totalOutstandingInr / 83.25).toFixed(2)),
      totalOverdueInr,
      totalOverdueUsd: Number((totalOverdueInr / 83.25).toFixed(2)),
      pendingApprovalInr,
      scheduledInr,
      settledMtdInr,
      settledMtdUsd: Number((settledMtdInr / 83.25).toFixed(2)),
      overdueCount,
      criticalCount,
      totalAssetsCount: this.assets.length,
      slaWarrantyCreditsInr: 4200,
      preventiveSavingsVsEmergencyInr: 76400,
    };
  }

  /**
   * Run autonomous predictive maintenance audit across all hardware assets.
   * Logs a structured PRISM decision trace.
   */
  async runAudit({ trigger = "manual_request", userNotes = "" } = {}) {
    const t0 = Date.now();
    this.lastAuditTime = new Date().toISOString();

    // Re-evaluate degradation scores based on thermal and cycle telemetry
    for (const a of this.assets) {
      if (a.id === "CH-031" && a.settlementStatus !== "settled") {
        a.healthScore = Math.max(30, 40 - Math.round(a.telemetry.tempRiseAboveAmbientC * 0.4));
        a.failureProbabilityPct = 94;
      }
    }

    const fin = this.calculateFinancials();
    const actionsTaken = [];

    // Check critical assets
    const criticalAssets = this.assets.filter((a) => a.status === "critical" && a.settlementStatus !== "settled");
    for (const ca of criticalAssets) {
      actionsTaken.push(
        `Safety Action: ${ca.id} (${ca.site}) flagged CRITICAL with ${ca.failureProbabilityPct}% failure risk. Recommended isolation & connector head swap. Dues: ₹${ca.dues.totalPayableInr}.`
      );
    }

    if (fin.totalOverdueInr > 0) {
      actionsTaken.push(
        `Financial Ledger Alert: ₹${fin.totalOverdueInr} in overdue maintenance dues identified across ${fin.overdueCount} assets. Fastag auto-clearance recommended.`
      );
    }

    const promptText = `Execute Predictive Maintenance & Dues Audit: ${this.assets.length} assets analyzed. Outstanding dues: ₹${fin.totalOutstandingInr}. Critical hardware: ${criticalAssets.map((c) => c.id).join(", ") || "None"}.`;
    const rationaleText = `MaintenancePilot Audit Report: Evaluated hardware degradation across 5 critical grid assets. Identified ${fin.criticalCount} high-risk units (${criticalAssets.map((c) => c.id).join(", ")}). Total outstanding dues stand at ₹${fin.totalOutstandingInr} with ₹${fin.totalOverdueInr} overdue. ${actionsTaken.join(" ")}`;

    const latencyMs = Date.now() - t0;
    const guardrailPassed = criticalAssets.length === 0 || criticalAssets.every((c) => c.dues.totalPayableInr > 0);

    // Emit autonomous maintenance decision trace to PRISM
    const traceRes = await prism.emitTrace({
      inputMessages: [{ role: "user", content: promptText }],
      outputMessage: rationaleText,
      model: "gridpulse-maintenance-v2",
      latencyMs,
      tokenCountInput: Math.round(promptText.length / 4),
      tokenCountOutput: Math.round(rationaleText.length / 4),
      sessionId: `gp-maint-${Date.now().toString(36)}`,
      userIdentifier: "MAINTENANCE-PILOT-AI",
      agentId: "gridpulse-maintenance",
      agentName: "Maintenance & Dues Specialist",
      metadata: {
        trigger,
        total_assets: this.assets.length,
        critical_count: fin.criticalCount,
        overdue_count: fin.overdueCount,
        outstanding_dues_inr: fin.totalOutstandingInr,
        overdue_dues_inr: fin.totalOverdueInr,
        settled_mtd_inr: fin.settledMtdInr,
        guardrail_passed: guardrailPassed,
      },
      guardrails: {
        passed: guardrailPassed,
        flags: fin.overdueCount > 0 ? ["overdue_service_alert"] : null,
      },
    });

    return {
      ok: true,
      timestamp: this.lastAuditTime,
      traceId: traceRes?.traceId,
      financials: fin,
      assets: this.assets,
      actionsTaken,
      summary: rationaleText,
    };
  }

  /**
   * Settle maintenance dues / work order via automated corporate ledger or FASTag debit.
   */
  async settleDues({ workOrderId, paymentMethod = "FASTag Corporate Auto-Debit", referenceNote = "" }) {
    const t0 = Date.now();
    const asset = this.assets.find((a) => a.workOrderId === workOrderId || a.id === workOrderId || a.invoiceId === workOrderId);

    if (!asset) {
      throw new Error(`Work order or asset "${workOrderId}" not found in maintenance catalog.`);
    }

    const settledAmountInr = asset.dues.totalPayableInr;
    asset.settlementStatus = "settled";
    asset.due = "Settled";
    // Once settled, simulate scheduled technician repair:
    asset.healthScore = 95;
    asset.status = "healthy";
    asset.failureProbabilityPct = 8;
    asset.lastService = "Today (Autonomous dispatch)";

    const settlementRecord = {
      id: asset.workOrderId,
      invoiceId: asset.invoiceId,
      chargerId: asset.id,
      site: asset.site,
      task: asset.task,
      amountInr: settledAmountInr,
      settledDate: new Date().toISOString().slice(0, 10),
      settledVia: paymentMethod,
      referenceNote: referenceNote || "Autonomous AI Dues Clearance",
      status: "settled",
    };

    this.settledHistory.unshift(settlementRecord);
    const latencyMs = Date.now() - t0;

    const promptText = `Authorize Maintenance Dues Settlement: Work Order ${asset.workOrderId} for ${asset.id} (${asset.task}). Amount: ₹${settledAmountInr}. Payment Method: ${paymentMethod}.`;
    const rationaleText = `Maintenance Dues Settled: Payment of ₹${settledAmountInr} ($${asset.dues.totalPayableUsd}) for ${asset.id} (${asset.task}) successfully settled via ${paymentMethod}. Asset health restored to 95%, work order dispatched to regional technician. Reference: ${settlementRecord.invoiceId}.`;

    // Emit financial governance trace to Blockconvey PRISM
    const traceRes = await prism.emitTrace({
      inputMessages: [{ role: "user", content: promptText }],
      outputMessage: rationaleText,
      model: "gridpulse-maintenance-settlement",
      latencyMs,
      tokenCountInput: Math.round(promptText.length / 4),
      tokenCountOutput: Math.round(rationaleText.length / 4),
      sessionId: `gp-settle-${asset.workOrderId}`,
      userIdentifier: "GRIDPULSE-FINANCIAL-GOVERNOR",
      agentId: "gridpulse-maintenance",
      agentName: "Maintenance & Dues Specialist",
      metadata: {
        action: "settle_dues",
        work_order_id: asset.workOrderId,
        invoice_id: asset.invoiceId,
        charger_id: asset.id,
        amount_inr: settledAmountInr,
        payment_method: paymentMethod,
        post_settlement_health: asset.healthScore,
      },
      guardrails: {
        passed: true,
        flags: null,
      },
    });

    settlementRecord.traceId = traceRes?.traceId;

    return {
      ok: true,
      settlement: settlementRecord,
      updatedAsset: asset,
      financials: this.calculateFinancials(),
      traceId: traceRes?.traceId,
      message: rationaleText,
    };
  }

  /**
   * Full status payload for API / Frontend
   */
  getStatus() {
    return {
      lastAuditTime: this.lastAuditTime,
      financials: this.calculateFinancials(),
      assets: this.assets,
      settledHistory: this.settledHistory,
      totalAssets: this.assets.length,
    };
  }
}

const maintenancePilot = new MaintenancePilotOrchestrator();
maintenancePilot.start();

module.exports = maintenancePilot;
