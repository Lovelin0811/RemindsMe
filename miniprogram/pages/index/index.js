Page({
  data: {
    reminders: []
  },

  timer: null,
  secondCount: 0,

  onShow() {
    this.loadReminders()
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

  // 加载所有未完成提醒，按时间排序
  loadReminders() {
    const reminders = wx.getStorageSync('reminders') || []
    const now = Date.now()
    let changed = false

    const pending = reminders
      .filter(r => {
        if (r.completed) return false

        // 延时/指定时间：到时间后标记为已完成
        if ((r.type === 'delay' || r.type === 'schedule') && r.reminderTime <= now) {
          changed = true
          return false
        }
        return true
      })
      .map(r => {
        // 定期提醒：到时间后计算下一次
        if (r.type === 'repeat' && r.reminderTime <= now) {
          const next = this.getNextOccurrence(r.repeatRule, r.repeatTime, now, r.repeatWeekday)
          r.reminderTime = next.getTime()
          r.date = this._fmtDate(next)
          r.time = this._fmtTime(next)
          changed = true
        }
        return r
      })
      .sort((a, b) => a.reminderTime - b.reminderTime)

    // 为每条计算倒计时
    pending.forEach(r => {
      const diff = r.reminderTime - now
      r.expired = diff <= 0
      r.countdown = diff <= 0 ? '' : this._formatCountdown(diff)
    })

    this.setData({ reminders: pending })

    if (changed) {
      // 标记到期延时/指定时间为已完成，定期更新时间
      const all = wx.getStorageSync('reminders') || []
      all.forEach(r => {
        if (r.completed) return
        if ((r.type === 'delay' || r.type === 'schedule') && r.reminderTime <= now) {
          r.completed = true
        }
        if (r.type === 'repeat' && r.reminderTime <= now) {
          const next = this.getNextOccurrence(r.repeatRule, r.repeatTime, now)
          r.reminderTime = next.getTime()
          r.date = this._fmtDate(next)
          r.time = this._fmtTime(next)
        }
      })
      wx.setStorageSync('reminders', all)
    }
  },

  startCountdown() {
    if (this.timer) clearInterval(this.timer)
    this.secondCount = 0
    this.timer = setInterval(() => {
      this.updateCountdowns()
      this.secondCount++
      // 每 30 秒重新检查到期
      if (this.secondCount % 30 === 0) {
        this.loadReminders()
      }
    }, 1000)
  },

  updateCountdowns() {
    const now = Date.now()
    const reminders = this.data.reminders
    let needReload = false
    const updates = {}

    reminders.forEach((r, i) => {
      const diff = r.reminderTime - now
      if (diff <= 0) {
        if (!r.expired) {
          needReload = true
        }
      } else {
        const cd = this._formatCountdown(diff)
        if (cd !== r.countdown) {
          updates['reminders[' + i + '].countdown'] = cd
          updates['reminders[' + i + '].expired'] = false
        }
      }
    })

    if (needReload) {
      this.loadReminders()
    } else if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }
  },

  // 计算定期提醒的下一次时间
  getNextOccurrence(rule, setTime, now, repeatWeekday) {
    var parts = setTime.split(':').map(Number)
    var h = parts[0]
    var m = parts[1]
    const target = new Date(now)
    target.setHours(h, m, 0, 0)

    switch (rule) {
      case 'daily':
        if (target <= now) target.setDate(target.getDate() + 1)
        return target
      case 'weekday':
        while (target.getDay() === 0 || target.getDay() === 6 || target <= now) {
          target.setDate(target.getDate() + 1)
        }
        return target
      case 'weekly': {
        const wd = parseInt(repeatWeekday || '1')
        let diff = wd - target.getDay()
        if (diff < 0 || (diff === 0 && target <= now)) diff += 7
        target.setDate(target.getDate() + diff)
        return target
      }
      case 'monthly':
        if (target <= now) target.setMonth(target.getMonth() + 1)
        return target
      default:
        if (target <= now) target.setDate(target.getDate() + 1)
        return target
    }
  },

  _formatCountdown(diff) {
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)

    let text = ''
    if (d > 0) text += d + '天 '
    text += h + '小时 ' + m + '分 ' + s + '秒'
    return text
  },

  _pad(n) {
    return n < 10 ? '0' + n : '' + n
  },

  _fmtDate(d) {
    return d.getFullYear() + '-' + this._pad(d.getMonth() + 1) + '-' + this._pad(d.getDate())
  },

  _fmtTime(d) {
    return this._pad(d.getHours()) + ':' + this._pad(d.getMinutes())
  },

  deleteReminder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条提醒？',
      success: (res) => {
        if (res.confirm) {
          let reminders = wx.getStorageSync('reminders') || []
          reminders = reminders.filter(r => r.id !== id)
          wx.setStorageSync('reminders', reminders)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadReminders()
        }
      }
    })
  },

  // requestSubscribeMessage 只能在 tap 事件中调用，不能放在 onShow 中

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  }
})
