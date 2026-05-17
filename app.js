App({
  onLaunch() {
    // 初始化本地存储
    const reminders = wx.getStorageSync('reminders')
    if (!reminders) {
      wx.setStorageSync('reminders', [])
    }
  },
  globalData: {}
})
