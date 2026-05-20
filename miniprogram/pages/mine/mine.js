const api = require('../../utils/api')

const BTN_WIDTH = 80

Page({
  data: {
    reminders: [],
    filteredReminders: [],
    activeTab: 'all',
    totalCount: 0,
    pendingCount: 0,
    completedCount: 0,
    loading: true
  },

  _openedId: null,

  onShow() {
    this.loadReminders()
  },

  loadReminders() {
    this.setData({ loading: true })
    api.getReminders()
      .then((res) => {
        const list = (res.reminders || []).map(r => ({
          id: r.reminder_id || r.id || '',
          title: r.title || '',
          note: r.note || '',
          type: r.type || 'delay',
          typeLabel: r.type_label || r.typeLabel || '延时提醒',
          intervalLabel: r.interval_label || r.intervalLabel || '',
          repeatRule: r.repeat_rule || r.repeatRule || '',
          repeatTime: r.repeat_time || r.repeatTime || '',
          repeatWeekday: r.repeat_weekday != null ? r.repeat_weekday : (r.repeatWeekday || 0),
          reminderTime: toLong(r.reminder_time || r.reminderTime),
          date: r.date || '',
          time: r.time || '',
          status: r.status || 'pending',
          completed: r.status === 'completed' || r.status === 'pushed',
          createdAt: toLong(r.created_at || r.createdAt),
          _x: 0
        }))
        this.setData({
          reminders: list,
          totalCount: list.length,
          pendingCount: list.filter(r => !r.completed).length,
          completedCount: list.filter(r => r.completed).length,
          loading: false
        })
        this.applyFilter()
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
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

  // 点击卡片：已展开则收起，未展开则切换完成状态
  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    if (this._openedId === id) {
      this._snapClose(id)
      return
    }
    if (this._openedId) {
      this._snapClose(this._openedId)
    }
  },

  toggleComplete(e) {
    const id = e.currentTarget.dataset.id
    // 如果已展开，先收起，不触发完成切换
    if (this._openedId === id) {
      this._snapClose(id)
      return
    }
    const { reminders } = this.data
    const item = reminders.find(r => r.id === id)
    if (!item) return

    const newStatus = item.completed ? 'pending' : 'completed'
    api.completeReminder(id).then(() => {
      item.completed = !item.completed
      item.status = newStatus
      const completedCount = reminders.filter(r => r.completed).length
      this.setData({
        reminders,
        pendingCount: reminders.length - completedCount,
        completedCount
      })
      this.applyFilter()
      wx.showToast({ title: newStatus === 'completed' ? '已完成' : '已恢复', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  deleteReminder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条提醒？',
      success: (res) => {
        if (res.confirm) {
          this._openedId = null
          api.deleteReminder(id).then(() => {
            const reminders = this.data.reminders.filter(r => r.id !== id)
            const completedCount = reminders.filter(r => r.completed).length
            this.setData({
              reminders,
              totalCount: reminders.length,
              pendingCount: reminders.length - completedCount,
              completedCount
            })
            this.applyFilter()
            wx.showToast({ title: '已删除', icon: 'success' })
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  // ========== movable-view 左滑删除 ==========
  onSwipeChange(e) {
    const { x, source } = e.detail
    const { id, index } = e.currentTarget.dataset

    // source 为空 = setData 触发的动画完成，或者松手后的最终状态
    if (source === '') {
      const idx = parseInt(index)
      if (x < -BTN_WIDTH / 2) {
        this._snapOpen(id, idx)
      } else {
        this._snapClose(id, idx)
      }
    }
  },

  _snapOpen(id, idx) {
    if (idx == null) {
      idx = this.data.filteredReminders.findIndex(r => r.id === id)
    }
    if (idx === -1) return
    // 先收起其他已展开的
    if (this._openedId && this._openedId !== id) {
      const prevIdx = this.data.filteredReminders.findIndex(r => r.id === this._openedId)
      if (prevIdx !== -1) {
        this.setData({ ['filteredReminders[' + prevIdx + ']._x']: 0, ['filteredReminders[' + prevIdx + ']._opened']: false })
      }
    }
    this.setData({ ['filteredReminders[' + idx + ']._x']: -BTN_WIDTH, ['filteredReminders[' + idx + ']._opened']: true })
    this._openedId = id
  },

  _snapClose(id, idx) {
    if (idx == null) {
      idx = this.data.filteredReminders.findIndex(r => r.id === id)
    }
    if (idx === -1) return
    this.setData({ ['filteredReminders[' + idx + ']._x']: 0, ['filteredReminders[' + idx + ']._opened']: false })
    if (this._openedId === id) this._openedId = null
  }
})

function toLong(val) {
  if (val == null) return 0
  if (typeof val === 'number') return val
  const n = parseInt(val)
  return isNaN(n) ? 0 : n
}
