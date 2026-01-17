export interface Application {
  id: string;
  companyName: string;
  companyLogo: string;
  applicationDate: string;
  appName: string;
  appVendor: string;
  appVersion: string;
  appDescription: string;
  aiCapabilities: string[];
  dataUsage: string;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  complianceDetails: {
    gdprCompliance: number;
    securityStandards: number;
    dataProtection: number;
    aiEthics: number;
  };
  threats: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  issues: string[];
  recommendations: string[];
  aiEvaluation: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
}

export const sampleApplications: Application[] = [
  {
    id: 'VASP-2025-001',
    companyName: 'HTX Global (Newest Tycoon Limited)',
    companyLogo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDdBRkY7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDVBREE7c3RvcC1vcGFjaXR5OjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjMwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhUWDwvdGV4dD48L3N2Zz4=',
    applicationDate: '2025-12-09',
    appName: 'HTX Global Trading Platform',
    appVendor: 'Newest Tycoon Limited',
    appVersion: '2025.12',
    appDescription: 'World-leading digital economy platform founded in 2013 with presence in 160+ countries. Comprehensive crypto ecosystem offering exchange services, derivatives trading, OTC brokerage, and custody solutions. Licensed in Lithuania, Dubai, Australia, and Bahrain. Mission to create blockchain technology breakthroughs and integrate into mainstream industries.',
    aiCapabilities: ['AML Transaction Monitoring', 'KYC Automation', 'Fraud Detection', 'Risk Scoring', 'Market Surveillance', 'Insider Trading Prevention'],
    dataUsage: 'User identity (KYC/AML), transaction history, wallet addresses, trading patterns, device fingerprints, IP geolocation, financial statements, beneficial ownership data',
    complianceScore: 85,
    riskLevel: 'medium',
    complianceDetails: {
      gdprCompliance: 88,
      securityStandards: 90,
      dataProtection: 82,
      aiEthics: 81
    },
    threats: [
      {
        category: 'Regulatory Compliance',
        severity: 'medium',
        description: 'Company registered in British Virgin Islands (BVI) - offshore jurisdiction requires enhanced due diligence for Pakistan regulatory acceptance'
      },
      {
        category: 'Operational Complexity',
        severity: 'medium',
        description: 'Multi-service platform (exchange, derivatives, OTC, custody) creates complex risk interdependencies requiring robust internal controls'
      },
      {
        category: 'Market Risk',
        severity: 'medium',
        description: 'Derivatives products (futures, swaps, options) expose retail clients to high leverage risks without adequate consumer protection disclosures'
      }
    ],
    issues: [
      'Applicant entity (Newest Tycoon Limited) not yet incorporated in Pakistan - application submitted before local incorporation',
      'No Pakistan-based office or local employees currently - reliance on international team raises operational supervision concerns',
      'Fiat on/off-ramp arrangements not detailed - critical for PKR integration with Pakistani banking system',
      'Derivatives products offer up to 125x leverage - excessive for retail market without investor suitability assessments',
      'Cold wallet custody arrangements reference external custodians but lack specific provider details and insurance coverage',
      'Daily reconciliation processes described but no independent third-party audit verification provided',
      'Data localization strategy unclear - PVARA regulations may require Pakistan-based data storage',
      'Business plan lacks Shariah compliance assessment for Islamic banking market compatibility'
    ],
    recommendations: [
      'CRITICAL: Complete Pakistan incorporation under Companies Act 2017 before NOC issuance',
      'CRITICAL: Establish physical presence in Karachi or Islamabad with minimum 5 local staff within 90 days',
      'Secure partnership with Pakistan-licensed commercial bank for PKR fiat gateway (HBL, MCB, or UBL)',
      'Implement mandatory leverage limits for retail clients: maximum 10x for crypto spot margin, 5x for derivatives',
      'Provide proof of cold storage insurance coverage from reputable provider (e.g., Lloyd\'s of London, Lockton)',
      'Engage Pakistan-based external auditor (Big 4 firm) for quarterly reconciliation verification',
      'Commit to Pakistan data center establishment for customer data localization within 12 months',
      'Obtain Shariah compliance certification from recognized Islamic scholars (e.g., AAOIFI standards)',
      'Develop comprehensive retail investor education program in Urdu and English',
      'Implement real-time reporting integration with State Bank of Pakistan and FIA for AML monitoring',
      'Appoint Pakistan-resident compliance officer and MLRO with local regulatory expertise',
      'Provide detailed emergency response plan for platform outages affecting Pakistani users'
    ],
    aiEvaluation: 'HTX Global (Newest Tycoon Limited) presents a well-established international VASP with legitimate global operations and multiple regulatory licenses. The platform demonstrates sophisticated technical infrastructure and comprehensive product offerings. However, the application reveals significant Pakistan-specific gaps: (1) BVI incorporation without local Pakistan entity raises regulatory oversight concerns, (2) absence of physical presence and local staff creates enforcement challenges, (3) high-leverage derivatives products pose consumer protection risks for retail market, (4) fiat banking integration and data localization strategies inadequately addressed. The company\'s global track record is positive, with licenses in Australia, Lithuania, Dubai, and Bahrain. Key personnel show relevant crypto industry experience. The main risk factors are operational readiness for Pakistan market rather than fundamental business viability. Overall risk assessment: MEDIUM. Recommendation: CONDITIONAL APPROVAL - Grant preliminary NOC subject to: (1) Pakistan incorporation completion, (2) local office establishment with staffing, (3) PKR banking partnership secured, (4) leverage limits implemented, (5) insurance and audit arrangements finalized. Full operational license contingent on meeting all conditions within 6 months.',
    status: 'under-review'
  }
];
