// 提醒类型
const REMINDER_TYPES = [
  { value: 'delay', label: '延时提醒' },
  { value: 'schedule', label: '指定时间' },
  { value: 'repeat', label: '定期提醒' }
]

// 订阅消息模板ID
// TODO: 在微信公众平台 → 订阅消息 → 选用模板，获取模板ID后替换
const SUBSCRIBE_TEMPLATE_ID = 'your_template_id_here'

const api = require('../../utils/api')

// 延时快捷选项
const DELAY_OPTIONS = [
  { value: 1, unit: 'min', label: '1 分钟后' },
  { value: 3, unit: 'min', label: '3 分钟后' },
  { value: 5, unit: 'min', label: '5 分钟后' },
  { value: 10, unit: 'min', label: '10 分钟后' },
  { value: 15, unit: 'min', label: '15 分钟后' },
  { value: 30, unit: 'min', label: '30 分钟后' },
  { value: 1, unit: 'hour', label: '1 小时后' },
  { value: 2, unit: 'hour', label: '2 小时后' },
  { value: 6, unit: 'hour', label: '6 小时后' },
  { value: 24, unit: 'hour', label: '1 天后' }
]

// 定期选项
const REPEAT_OPTIONS = [
  { value: 'daily', label: '每天' },
  { value: 'weekday', label: '工作日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' }
]

// 星期
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

Page({
  data: {
    title: '',
    note: '',
    type: 'delay',
    types: REMINDER_TYPES,
    typeLabel: '延时提醒',

    // 延时
    delayOptions: DELAY_OPTIONS,
    delayIndex: 2,
    customDelayValue: '',
    customDelayUnit: 'min',   // min | hour

    // 指定时间
    scheduleDate: '',
    scheduleTime: '',

    // 定期
    repeatOptions: REPEAT_OPTIONS,
    repeatIndex: 0,
    repeatRule: 'daily',
    repeatTime: '',
    repeatWeekday: 1,   // 0-6, 默认周一

    // 预览
    reminderTimeDisplay: '',
    reminderTime: 0
  },

  onLoad() {
    this._initForm()
  },

  _initForm() {
    const now = new Date()
    const timeStr = this._fmtTime(now)
    const dateStr = this._fmtDate(now)
    this.setData({
      title: '',
      note: '',
      type: 'delay',
      typeLabel: '延时提醒',
      delayIndex: 2,
      customDelayValue: '',
      customDelayUnit: 'min',
      scheduleDate: dateStr,
      scheduleTime: timeStr,
      repeatIndex: 0,
      repeatRule: 'daily',
      repeatTime: timeStr,
      repeatWeekday: now.getDay() === 0 ? 1 : now.getDay(),
      reminderTimeDisplay: '',
      reminderTime: 0
    })
    this.updatePreview()
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

  _fmtDateTime(d) {
    return this._fmtDate(d) + ' ' + this._fmtTime(d)
  },

  _delayToMinutes(index) {
    const opt = DELAY_OPTIONS[index]
    return opt.unit === 'hour' ? opt.value * 60 : opt.value
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  onNoteInput(e) { this.setData({ note: e.detail.value }) },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    const label = REMINDER_TYPES.find(t => t.value === type).label
    this.setData({ type, typeLabel: label })
    this.updatePreview()
  },

  onDelayTap(e) {
    this.setData({ delayIndex: e.currentTarget.dataset.idx })
    this.updatePreview()
  },

  onTypeChange(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      type: REMINDER_TYPES[idx].value,
      typeLabel: REMINDER_TYPES[idx].label
    })
    this.updatePreview()
  },

  onDelayChange(e) {
    this.setData({ delayIndex: parseInt(e.detail.value) })
    this.updatePreview()
  },

  onCustomDelayValueInput(e) {
    this.setData({ customDelayValue: e.detail.value })
    this.updatePreview()
  },

  onCustomDelayUnitChange(e) {
    this.setData({ customDelayUnit: e.detail.value })
    this.updatePreview()
  },

  onScheduleDateChange(e) {
    this.setData({ scheduleDate: e.detail.value })
    this.updatePreview()
  },

  onScheduleTimeChange(e) {
    this.setData({ scheduleTime: e.detail.value })
    this.updatePreview()
  },

  onRepeatChange(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      repeatIndex: idx,
      repeatRule: REPEAT_OPTIONS[idx].value
    })
    this.updatePreview()
  },

  onRepeatTimeChange(e) {
    this.setData({ repeatTime: e.detail.value })
    this.updatePreview()
  },

  onRepeatTap(e) {
    const rule = e.currentTarget.dataset.rule
    const idx = e.currentTarget.dataset.idx
    this.setData({ repeatRule: rule, repeatIndex: idx })
    this.updatePreview()
  },

  onWeekdayTap(e) {
    this.setData({ repeatWeekday: e.currentTarget.dataset.wd })
    this.updatePreview()
  },

  onRepeatWeekdayChange(e) {
    this.setData({ repeatWeekday: parseInt(e.detail.value) })
    this.updatePreview()
  },

  // 计算下一次提醒时间
  getNextOccurrence(rule, setTime, now) {
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
        // 周一=1 到 周五=5
        while (target.getDay() === 0 || target.getDay() === 6 || target <= now) {
          target.setDate(target.getDate() + 1)
        }
        return target

      case 'weekly':
        const wd = parseInt(this.data.repeatWeekday)
        // 让 target 的星期几匹配
        let diff = wd - target.getDay()
        if (diff < 0 || (diff === 0 && target <= now)) diff += 7
        target.setDate(target.getDate() + diff)
        return target

      case 'monthly':
        if (target <= now) target.setMonth(target.getMonth() + 1)
        return target

      default:
        return target
    }
  },

  updatePreview() {
    const { type, delayIndex, customDelayValue, customDelayUnit, scheduleDate, scheduleTime, repeatRule, repeatTime } = this.data
    const now = new Date()
    let reminderTime = null
    let display = ''

    if (type === 'delay') {
      const minutes = this._delayToMinutes(delayIndex)
      reminderTime = new Date(now.getTime() + minutes * 60 * 1000)
      display = this._buildDiffText(reminderTime, now)
    } else if (type === 'schedule') {
      reminderTime = new Date(scheduleDate + 'T' + scheduleTime)
      display = this._buildDiffText(reminderTime, now)
    } else if (type === 'repeat') {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const ruleLabel = REPEAT_OPTIONS.find(r => r.value === repeatRule).label
      reminderTime = this.getNextOccurrence(repeatRule, repeatTime, now)
      let extra = ''
      if (repeatRule === 'weekly') {
        extra = `（每${weekdays[this.data.repeatWeekday]}）`
      }
      display = `${ruleLabel}${extra} ${repeatTime}，下次：${this._fmtDateTime(reminderTime)}`
    }

    this.setData({
      reminderTime: reminderTime ? reminderTime.getTime() : 0,
      reminderTimeDisplay: display
    })
  },

  _buildDiffText(target, now) {
    const diff = target.getTime() - now.getTime()
    const dt = this._fmtDateTime(target)

    if (diff < 0) return dt + '（已过时）'
    if (diff < 60000) return '不到 1 分钟后（' + dt + '）'

    const mins = Math.ceil(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const remainMin = Math.ceil((diff % 3600000) / 60000)

    if (mins < 60) return mins + ' 分钟后（' + dt + '）'
    if (hours < 24) return hours + ' 小时 ' + remainMin + ' 分后（' + dt + '）'

    const days = Math.floor(diff / 86400000)
    const remainH = Math.floor((diff % 86400000) / 3600000)
    return days + ' 天 ' + remainH + ' 小时后（' + dt + '）'
  },

  saveReminder() {
    const { title, note, type, delayIndex, scheduleDate, scheduleTime, repeatRule, repeatTime, repeatWeekday, reminderTime, typeLabel } = this.data

    if (!title.trim()) {
      wx.showToast({ title: '请输入提醒内容', icon: 'none' })
      return
    }

    if (!reminderTime) {
      wx.showToast({ title: '请选择提醒时间', icon: 'none' })
      return
    }

    // 构建 intervalLabel
    let intervalLabel = ''
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    if (type === 'delay') {
      intervalLabel = DELAY_OPTIONS[delayIndex].label
    } else if (type === 'schedule') {
      intervalLabel = scheduleDate + ' ' + scheduleTime
    } else {
      const ruleLabel = REPEAT_OPTIONS.find(r => r.value === repeatRule).label
      if (repeatRule === 'weekly') {
        intervalLabel = '每' + weekdays[repeatWeekday] + ' ' + repeatTime
      } else {
        intervalLabel = ruleLabel + ' ' + repeatTime
      }
    }

    const targetDate = new Date(reminderTime)

    // 请求订阅消息授权
    this._requestSubscribe().then((subscribed) => {
      this._doSave({
        title: title.trim(),
        note: note.trim(),
        type,
        typeLabel,
        intervalLabel,
        repeatRule: type === 'repeat' ? repeatRule : '',
        repeatTime: type === 'repeat' ? repeatTime : '',
        repeatWeekday: type === 'repeat' ? repeatWeekday : '',
        reminderTime,
        date: this._fmtDate(targetDate),
        time: this._fmtTime(targetDate),
        subscribed
      })
    }).catch(() => {
      wx.showToast({ title: '创建提醒失败', icon: 'none' })
    })
  },

  // 请求订阅消息授权
  _requestSubscribe() {
    return new Promise((resolve) => {
      // 判断模板ID是否已配置
      if (SUBSCRIBE_TEMPLATE_ID === 'your_template_id_here') {
        // 模板未配置，跳过授权，直接保存
        resolve(false)
        return
      }

      wx.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        success(res) {
          // accept: 用户同意, reject: 用户拒绝, ban: 被后台封禁
          const accepted = res[SUBSCRIBE_TEMPLATE_ID] === 'accept'
          resolve(accepted)
        },
        fail() {
          // 授权弹窗失败（用户拒绝或环境不支持），仍然保存提醒
          resolve(false)
        }
      })
    })
  },

  // 实际保存
  _doSave(data) {
    const reminders = wx.getStorageSync('reminders') || []
    reminders.unshift({
      id: Date.now().toString(),
      title: data.title,
      note: data.note,
      type: data.type,
      typeLabel: data.typeLabel,
      intervalLabel: data.intervalLabel,
      repeatRule: data.repeatRule,
      repeatTime: data.repeatTime,
      repeatWeekday: data.repeatWeekday,
      reminderTime: data.reminderTime,
      date: data.date,
      time: data.time,
      subscribed: data.subscribed,
      completed: false,
      createdAt: Date.now()
    })

    wx.setStorageSync('reminders', reminders)

    // 如果授权了推送，提交到后端
    if (data.subscribed) {
      api.subscribeNotify({
        reminderId: reminders[0].id,
        templateId: SUBSCRIBE_TEMPLATE_ID,
        reminderTime: data.reminderTime,
        type: data.type,
        repeatRule: data.repeatRule,
        title: data.title,
        date: data.date,
        time: data.time
      }).catch(() => {
        // 后端提交失败不影响本地使用
      })
    }

    wx.showToast({
      title: data.subscribed ? '提醒已创建，到时推送通知' : '提醒已创建（未授权推送）',
      icon: data.subscribed ? 'success' : 'none',
      duration: 2000
    })

    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 1500)
  }
})
