import { GovernanceFlag, ScenarioRecord, ExpiryConcentration } from "./types";

/**
 * Evaluates governance rules for a scenario.
 * Rules are categorized into CRITICAL, REVIEW, PLANNING, and INFO.
 */
export function evaluateGovernanceRules(
  scenario: Omit<ScenarioRecord, "flags" | "criticalCount" | "reviewCount" | "planningCount" | "infoCount">,
  allScenarioNames: Set<string>,
  duplicateNames: Set<string>,
  expiryConcentration: ExpiryConcentration | null,
): GovernanceFlag[] {
  const flags: GovernanceFlag[] = [];

  // ==========================================
  // 1. CRITICAL RULES
  // ==========================================

  // Rule 1.1: Expired but Deployed (Zombie deployment)
  if (scenario.lifecycleStatus === "Expired" && scenario.deploymentStatus === "Deployed") {
    flags.push({
      id: "expired_deployed",
      severity: "CRITICAL",
      rule: "Süresi Dolan Canlı Senaryo",
      title: "Bitiş tarihi geçmiş olmasına rağmen Deployed durumda",
      explanation:
        "Senaryonun resmi bitiş tarihi geçmiş ancak sistemde halen canlı/Deployed olarak işaretli. Bu durum istenmeyen kitle iletişimine yol açabilir.",
    });
  }

  // Rule 1.2: Missing deployment status
  if (scenario.deploymentStatus === "Missing") {
    flags.push({
      id: "missing_status",
      severity: "CRITICAL",
      rule: "Eksik Statü Tanımı",
      title: "Statü (Status) alanı tanımlanmamış veya boş",
      explanation:
        "Senaryonun canlıda (Deployed) mı yoksa pasif/taslakta (Undeployed) mı olduğu belirsiz. Operasyonel sağlık kontrolü yapılamıyor.",
    });
  }

  // Rule 1.3: End Date earlier than Start Date
  if (scenario.hasInvalidDateOrder) {
    flags.push({
      id: "invalid_date_order",
      severity: "CRITICAL",
      rule: "Ters Tarih Sıralaması",
      title: "Bitiş tarihi, başlangıç tarihinden önce",
      explanation:
        `Başlangıç (${scenario.startDateFormatted}) ve Bitiş (${scenario.endDateFormatted}) tarihleri mantıksal olarak tutarsızdır.`,
    });
  }

  // Rule 1.4: Missing critical dates
  if (scenario.hasMissingDates && !scenario.isLongRunning) {
    flags.push({
      id: "missing_dates",
      severity: "CRITICAL",
      rule: "Eksik Tarih Tanımı",
      title: "Başlangıç veya bitiş tarihi girilmemiş",
      explanation:
        "Senaryonun yaşam döngüsü ve takvim doğrulaması için gerekli tarih bilgisi eksiktir.",
    });
  }

  // ==========================================
  // 2. REVIEW RULES
  // ==========================================

  const isTimelineActive =
    scenario.lifecycleStatus === "Active" ||
    scenario.lifecycleStatus === "Expiring <= 30" ||
    scenario.lifecycleStatus === "Expiring 31-90" ||
    scenario.lifecycleStatus === "Long-running";

  // Rule 2.1: Active but Undeployed (Do NOT call an error; may be intentional)
  if (isTimelineActive && scenario.deploymentStatus === "Undeployed") {
    flags.push({
      id: "active_undeployed",
      severity: "REVIEW",
      rule: "Aktif Tarihli Pasif Senaryo",
      title: "Takvim süresi aktif ancak Undeployed durumda",
      explanation:
        "Senaryonun takvim süresi başlamış olmasına rağmen Deployed edilmemiş. Kasıtlı olarak bekletiliyor veya deploy edilmesi unutulmuş olabilir.",
    });
  }

  // Rule 2.2: Duplicate Scenario Name
  if (duplicateNames.has(scenario.scenarioName)) {
    flags.push({
      id: "duplicate_name",
      severity: "REVIEW",
      rule: "Mükerrer Senaryo Adı",
      title: "Aynı senaryo adı birden fazla satırda tanımlı",
      explanation:
        `'${scenario.scenarioName}' senaryo adı birden çok kayıtta geçmektedir. Sistem tekilliği ve log takibi için kontrol edilmelidir.`,
    });
  }

  // Rule 2.3: Real-time scenario with missing event metadata
  if (scenario.scenarioType === "Real-time" && (!scenario.segmentOrEvent || scenario.segmentOrEvent.trim() === "-")) {
    flags.push({
      id: "realtime_missing_event",
      severity: "REVIEW",
      rule: "Eksik Tetikleyici Event",
      title: "Real-time senaryoda tetikleyici event tanımı bulunamadı",
      explanation:
        "Real-time senaryoların müşteri aksiyonuyla tetiklenebilmesi için bir event (örn. TamamlanmisApp, MallIQEvent) tanımlı olmalıdır.",
    });
  }

  // Rule 2.4: Missing Product
  if (!scenario.product || scenario.product.trim() === "-" || scenario.product.trim() === "") {
    flags.push({
      id: "missing_product",
      severity: "REVIEW",
      rule: "Eksik Ürün Bilgisi",
      title: "Ürün (Product) alanı boş bırakılmış",
      explanation:
        "Portföy ve ürün coverage analizlerinin eksiksiz yapılabilmesi için ürün alanı doldurulmalıdır.",
    });
  }

  // Rule 2.5: Missing Business Unit
  if (!scenario.businessUnit || scenario.businessUnit.trim() === "-" || scenario.businessUnit.trim() === "") {
    flags.push({
      id: "missing_bu",
      severity: "REVIEW",
      rule: "Eksik İş Birimi",
      title: "İş Birimi (Business Unit) alanı tanımlanmamış",
      explanation:
        "Senaryonun hangi birime ait olduğu belirtilmemiş; birim bazlı sorumluluk ve yönetim kontrolü sağlanamıyor.",
    });
  }

  // ==========================================
  // 3. PLANNING RULES
  // ==========================================

  // Rule 3.1: Expiring within 30 days
  if (scenario.isExpiring30 && scenario.deploymentStatus === "Deployed") {
    flags.push({
      id: "expiring_30",
      severity: "PLANNING",
      rule: "30 Gün İçinde Bitiş",
      title: `Senaryo ${scenario.daysUntilExpiry} gün içinde sona erecek (${scenario.endDateFormatted})`,
      explanation:
        "Canlıdaki senaryonun süresi yaklaşıyor. Yenileme (renewal) veya kapatma kararı alınmalıdır.",
    });
  } else if (scenario.isExpiring90 && scenario.deploymentStatus === "Deployed") {
    // Rule 3.2: Expiring within 90 days
    flags.push({
      id: "expiring_90",
      severity: "PLANNING",
      rule: "90 Gün İçinde Bitiş",
      title: `Senaryo ${scenario.daysUntilExpiry} gün içinde sona erecek (${scenario.endDateFormatted})`,
      explanation:
        "Gelecek çeyrek planlaması için yenileme ihtiyacı gözden geçirilmelidir.",
    });
  }

  // Rule 3.3: Belongs to end-date concentration cluster
  if (
    expiryConcentration &&
    scenario.endDateFormatted === expiryConcentration.dateFormatted &&
    scenario.deploymentStatus === "Deployed"
  ) {
    flags.push({
      id: "expiry_concentration",
      severity: "PLANNING",
      rule: "Toplu Yenileme Kümesi",
      title: `Aktif senaryoların %${expiryConcentration.percentage}'i bu tarihte bitiyor (${expiryConcentration.dateFormatted})`,
      explanation:
        `Bu tarihte aynı anda ${expiryConcentration.count} senaryo sona erecek. Toplu yenileme veya operasyonel sıkışıklık planlaması gerekebilir.`,
    });
  }

  // ==========================================
  // 4. INFO RULES
  // ==========================================

  // Rule 4.1: Shared audience / segment
  if (scenario.sharedAudienceCluster && scenario.sharedAudienceCluster.count > 1) {
    flags.push({
      id: "shared_audience",
      severity: "INFO",
      rule: "Ortak Kitle Kümesi",
      title: `${scenario.sharedAudienceCluster.count} senaryo aynı kitleyi (${scenario.segmentOrEvent}) kullanıyor`,
      explanation:
        "Bu senaryo başka senaryolarla aynı kitle/segment kaynağını paylaşıyor. Not: Gerçek temas çakışması için müşteri bazlı veri gereklidir.",
    });
  }

  // Rule 4.2: Upstream dependency detected
  if (scenario.upstreamScenarioName) {
    flags.push({
      id: "upstream_dependency",
      severity: "INFO",
      rule: "Kaynak Senaryo Bağımlılığı",
      title: `Bu senaryo '${scenario.upstreamScenarioName}' kaynağından besleniyor`,
      explanation:
        "Üst senaryo durdurulur veya değişirse bu senaryonun kitle akışı etkilenebilir.",
    });
  }

  // Rule 4.3: Long running / indefinite scenario
  if (scenario.isLongRunning) {
    flags.push({
      id: "long_running",
      severity: "INFO",
      rule: "Uzun Ömürlü / Kalıcı Senaryo",
      title: "Senaryo kalıcı veya 2030+ bitiş tarihli olarak tanımlanmış",
      explanation:
        "Süresiz veya çok uzun vadeli çalışan mimari senaryo. Periyodik yönetişim denetimi önerilir.",
    });
  }

  return flags;
}
