const EDGE_FUNCTION_URL = 'https://xucmespxytzbyvfzpdoc.supabase.co/functions/v1/wechat-login';

Page({
  data: {
    uuid: '',
    status: 'idle',
    errorMsg: '',
  },

  onLoad(options) {
    // scene comes from getwxacodeunlimit: page options (published) or app globalData
    const app = getApp();
    const scene = options.scene
      ? decodeURIComponent(options.scene)
      : (app.globalData.scene || '');

    // Re-insert dashes to form a standard UUID (scene is UUID without dashes, 32 chars)
    const uuid = scene.length === 32
      ? `${scene.slice(0,8)}-${scene.slice(8,12)}-${scene.slice(12,16)}-${scene.slice(16,20)}-${scene.slice(20)}`
      : options.uuid || '';
    if (!uuid) {
      this.setData({ status: 'error', errorMsg: 'Please scan the QR code from IceZone Studio login page' });
      return;
    }
    this.setData({ uuid });
  },

  handleLogin() {
    if (this.data.status === 'loading') return;
    this.setData({ status: 'loading', errorMsg: '' });

    wx.login({
      success: (res) => {
        if (!res.code) {
          this.setData({ status: 'error', errorMsg: 'Failed to get WeChat code' });
          return;
        }
        wx.request({
          url: EDGE_FUNCTION_URL,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { code: res.code, uuid: this.data.uuid },
          timeout: 10000,
          success: (resp) => {
            if (resp.data && resp.data.success) {
              this.setData({ status: 'success' });
            } else {
              this.setData({
                status: 'error',
                errorMsg: (resp.data && resp.data.error) || 'Login failed',
              });
            }
          },
          fail: () => {
            this.setData({ status: 'error', errorMsg: 'Network error, please retry' });
          },
        });
      },
      fail: () => {
        this.setData({ status: 'error', errorMsg: 'WeChat login failed' });
      },
    });
  },
});
