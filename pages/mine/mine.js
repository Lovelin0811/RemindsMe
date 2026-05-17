Page({
  data: {
    reminders: [],
    filteredReminders: [],
    activeTab: 'all',
    totalCount: 0,
    pendingCount: 0,
    completedCount: 0
  },

  onShow() {
    this.loadReminders()
  },

  loadReminders() {
    const reminders = wx.getStorageSync('reminders') || []
    reminders.sort((a, b) => b.createdAt - a.createdAt)
    const completedCount = reminders.filter(r => r.completed).length
    this.setData({
      reminders,
      totalCount: reminders.length,
      pendingCount: reminders.length - completedCount,
      completedCount
    })
    this.applyFilter()
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.applyFilter()
  },

  applyFilter() {
    const { reminders, activeTab } = this.data
    let filtered = reminders
    if (activeTab === 'pending') filtered = reminders.filter(r => !r.completed)
    else if (activeTab === 'completed') filtered = reminders.filter(r => r.completed)
    this.setData({ filteredReminders: filtered })
  },

  toggleComplete(e) {
    const id = e.currentTarget.dataset.id
    const reminders = this.data.reminders
    const idx = reminders.findIndex(r => r.id === id)
    if (idx !== -1) {
      reminders[idx].completed = !reminders[idx].completed
      wx.setStorageSync('reminders', reminders)
      this.loadReminders()
    }
  },

  deleteReminder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条提醒？',
      success: (res) => {
        if (res.confirm) {
          let reminders = this.data.reminders.filter(r => r.id !== id)
          wx.setStorageSync('reminders', reminders)
          this.loadReminders()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  }
})
