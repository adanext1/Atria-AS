let storeInstance = null;

module.exports = {
  init: async () => {
    if (!storeInstance) {
      const module = await import('electron-store');
      const Store = module.default;
      storeInstance = new Store();
    }
    return storeInstance;
  },
  getStore: () => storeInstance
};
