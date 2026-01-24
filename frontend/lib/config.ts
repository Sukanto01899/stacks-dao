export const appConfig = {
  stacksNetwork: "mainnet",
  appUrl: "http://localhost:3000",
  walletConnectProjectId: "5a6379b96226b5ab0e93570d0093df16",
  reownProjectId: "5a6379b96226b5ab0e93570d0093df16",
  contracts: {
    daoCore: "SP1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXRCD0S3K.dao-core-v3",
  },
};

export const hasDaoContractsConfigured = () =>
  Boolean(appConfig.contracts.daoCore);
