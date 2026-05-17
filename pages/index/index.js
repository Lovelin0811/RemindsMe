Page({
  data: {
    next: null,       // 最近的下一条提醒
    countdown: '',    // 倒计时文案
    hasReminder: false
  },

  timer: null,

  onShow() {
    this.loadNextReminder()
    this.startCountdown()
  },

  onHide() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  loadNextReminder() {
    const reminders = wx.getStorageSync('reminders') || []
    const now = Date.now()

    // 找到最近一个未完成且时间在未来的提醒
    const upcoming = reminders
      .filter(r => !r.completed && r.reminderTime > now)
      .sort((a, b) => a.reminderTime - b.reminderTime)

    if (upcoming.length > 0) {
      this.setData({
        next: upcoming[0],
        hasReminder: true
      })
    } else {
      this.setData({ next: null, hasReminder: false })
    }

    this.updateCountdown()
  },

  startCountdown() {
    if (this.timer) clearInterval(this.timer)
    var secondCount = 0
    this.timer = setInterval(() => {
      this.updateCountdown()
      secondCount++
      // 每 30 秒刷新一次列表（处理定时提醒的到期）
      if (secondCount % 30 === 0) {
        this.loadNextReminder()
      }
    }, 1000)
  },

  updateCountdown() {
    const { next } = this.data
    if (!next) {
      this.setData({ countdown: '' })
      return
    }

    const now = Date.now()
    const diff = next.reminderTime - now

    if (diff <= 0) {
      this.setData({ countdown: '已到提醒时间！' })
      return
    }

    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)

    let text = ''
    if (d > 0) text += `${d}天 `
    if (h > 0) text += `${h}小时 `
    if (d > 0 || h > 0) text += `${m}分 `
    if (d === 0 && h === 0) text += `${m}分 `
    text += `${s}秒`

    this.setData({ countdown: text })
  },

  // 标记完成
  markDone() {
    const reminders = wx.getStorageSync('reminders') || []
    const idx = reminders.findIndex(r => r.id === this.data.next.id)
    if (idx !== -1) {
      reminders[idx].completed = true
      wx.setStorageSync('reminders', reminders)
      wx.showToast({ title: '已完成', icon: 'success' })
      this.loadNextReminder()
    }
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  },

  // 删除
  deleteReminder() {
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条提醒？',
      success: (res) => {
        if (res.confirm) {
          let reminders = wx.getStorageSync('reminders') || []
          reminders = reminders.filter(r => r.id !== this.data.next.id)
          wx.setStorageSync('reminders', reminders)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadNextReminder()
        }
      }
    })
  }
})
