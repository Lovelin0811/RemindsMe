const api = require('../../utils/api')
const timeUtil = require('../../utils/time')

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

  // 从 API 加载提醒列表
  loadReminders() {
    api.getReminders()
      .then((res) => {
        const raw = res.reminders || []
        const now = Date.now()

        const pending = raw
          .filter(r => {
            if (r.status === 'completed' || r.status === 'pushed') return false
            // 延时/指定时间：到时间则不展示
            if ((r.type === 'delay' || r.type === 'schedule')) {
              const t = parseInt(r.reminder_time || r.reminderTime) || 0
              if (t <= now) return false
            }
            return true
          })
          .map(r => {
            const reminderTime = parseInt(r.reminder_time || r.reminderTime) || 0

            // 定期提醒：如果已过期，计算下一次
            if (r.type === 'repeat' && reminderTime <= now) {
              const repeatTime = r.repeat_time || r.repeatTime || ''
              const repeatWeekday = r.repeat_weekday != null ? r.repeat_weekday : (r.repeatWeekday || 0)
              const next = timeUtil.getNextOccurrence(r.repeat_rule || r.repeatRule || 'daily', repeatTime, now, repeatWeekday)
              r._displayTime = next.getTime()
            } else {
              r._displayTime = reminderTime
            }

            // 计算倒计时
            const diff = r._displayTime - now
            r._countdown = diff <= 0 ? '' : timeUtil.formatCountdown(diff)
            r._expired = diff <= 0

            return {
              id: r.reminder_id || r.id || '',
              title: r.title || '',
              note: r.note || '',
              type: r.type || 'delay',
              typeLabel: r.type_label || r.typeLabel || '延时提醒',
              intervalLabel: r.interval_label || r.intervalLabel || '',
              repeatRule: r.repeat_rule || r.repeatRule || '',
              repeatTime: r.repeat_time || r.repeatTime || '',
              reminderTime: r._displayTime,
              countdown: r._countdown,
              expired: r._expired
            }
          })
          .sort((a, b) => a.reminderTime - b.reminderTime)

        this.setData({ reminders: pending })
      })
      .catch(() => {
        // 静默失败，保持上一次数据
      })
  },

  startCountdown() {
    if (this.timer) clearInterval(this.timer)
    this.secondCount = 0
    this.timer = setInterval(() => {
      this.updateCountdowns()
      this.secondCount++
      // 每 30 秒重新从 API 刷新
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
        const cd = timeUtil.formatCountdown(diff)
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

  deleteReminder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条提醒？',
      success: (res) => {
        if (res.confirm) {
          api.deleteReminder(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadReminders()
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // requestSubscribeMessage 只能在 tap 事件中调用，不能放在 onShow 中

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  }
})
