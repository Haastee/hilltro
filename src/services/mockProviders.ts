export class MockOpenBankingService {
  async connect() {
    return { provider: "MockOpenBanking", status: "connected", affordabilityPcm: 3250 };
  }
}

export class MockVerificationService {
  async verifyIdentity() {
    return { provider: "MockVerification", status: "passed" };
  }
}

export class MockCreditCheckService {
  async runCheck() {
    return { provider: "MockCreditCheck", status: "passed", flags: [] };
  }
}

export class MockPaymentService {
  async createRentMandate() {
    return { provider: "MockPayment", status: "ready" };
  }
}

export class MockSignatureService {
  async prepareApt() {
    return { provider: "MockSignature", status: "ready_to_sign" };
  }
}

export class MockAIService {
  async summariseApplicant() {
    return "Verified applicant with stable income, clear address history and low risk indicators.";
  }
}
