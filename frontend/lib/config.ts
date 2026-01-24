const normalizeEnvValue = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const readEnv = (value: string | undefined, fallback = "") =>
  normalizeEnvValue(value ?? fallback);

export const appConfig = {
  stacksNetwork: "testnet",
  appUrl: "http://localhost:3000",
  walletConnectProjectId: "5a6379b96226b5ab0e93570d0093df16",
  reownProjectId: "5a6379b96226b5ab0e93570d0093df16",
  contracts: {
    daoCore: "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.dao-core-v3",
    treasury:
      "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.dao-treasury-v1",
    governanceToken:
      "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.governance-token-v1",
    transferAdapter:
      "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.transfer-adapter-v1",
  },
};

export const hasDaoContractsConfigured = () =>
  Boolean(
    appConfig.contracts.daoCore &&
      appConfig.contracts.treasury &&
      appConfig.contracts.governanceToken &&
      appConfig.contracts.transferAdapter
  );
