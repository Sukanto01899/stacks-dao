export const appConfig = {
  stacksNetwork: process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "mainnet",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    "5a6379b96226b5ab0e93570d0093df16",
  reownProjectId:
    process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ??
    "5a6379b96226b5ab0e93570d0093df16",
  contracts: {
    daoCore:
      process.env.NEXT_PUBLIC_DAO_CONTRACT ??
      "SP1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXRCD0S3K.dao-core-v6",
  },
};

export const hasDaoContractsConfigured = () =>
  Boolean(appConfig.contracts.daoCore);
