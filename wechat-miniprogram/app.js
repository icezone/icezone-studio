App({
  globalData: {
    scene: ''
  },
  onLaunch(options) {
    if (options && options.query && options.query.scene) {
      this.globalData.scene = decodeURIComponent(options.query.scene);
    }
  },
  onShow(options) {
    if (options && options.query && options.query.scene) {
      this.globalData.scene = decodeURIComponent(options.query.scene);
    }
  }
});
