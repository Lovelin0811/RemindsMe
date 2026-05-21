// 提醒类型
const REMINDER_TYPES = [
  { value: 'delay', label: '延时提醒' },
  { value: 'schedule', label: '指定时间' },
  { value: 'repeat', label: '定期提醒' }
]

// 订阅消息模板ID
const SUBSCRIBE_TEMPLATE_ID = 'C9lPRw7nKW4cgmaJTINBRXAEpRdhimwz9vGauR-yDWI'

const api = require('../../utils/api')
const timeUtil = require('../../utils/time')

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
    // 每秒刷新预览倒计时
    this._previewTimer = setInterval(() => this.updatePreview(), 1000)
  },

  onUnload() {
    if (this._previewTimer) {
      clearInterval(this._previewTimer)
      this._previewTimer = null
    }
  },

  _initForm() {
    const now = new Date()
    const timeStr = timeUtil.fmtTime(now)
    const dateStr = timeUtil.fmtDate(now)
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

  updatePreview() {
    const { type, delayIndex, customDelayValue, customDelayUnit, scheduleDate, scheduleTime, repeatRule, repeatTime, repeatWeekday } = this.data
    const now = new Date()
    let reminderTime = null
    let display = ''

    if (type === 'delay') {
      let minutes
      if (delayIndex === -1) {
        const val = parseInt(customDelayValue)
        if (!val || val <= 0) {
          this.setData({ reminderTimeDisplay: '请输入有效的延时时长', reminderTime: 0 })
          return
        }
        minutes = customDelayUnit === 'hour' ? val * 60 : val
      } else {
        minutes = this._delayToMinutes(delayIndex)
      }
      reminderTime = new Date(now.getTime() + minutes * 60 * 1000)
      display = timeUtil.buildDiffText(reminderTime.getTime() - now.getTime(), reminderTime)
    } else if (type === 'schedule') {
      reminderTime = new Date(scheduleDate + 'T' + scheduleTime)
      display = timeUtil.buildDiffText(reminderTime.getTime() - now.getTime(), reminderTime)
    } else if (type === 'repeat') {
      const ruleLabel = REPEAT_OPTIONS.find(r => r.value === repeatRule).label
      reminderTime = timeUtil.getNextOccurrence(repeatRule, repeatTime, now.getTime(), repeatWeekday)
      let extra = ''
      if (repeatRule === 'weekly') {
        extra = '（每' + timeUtil.WEEKDAYS[repeatWeekday] + '）'
      }
      display = ruleLabel + extra + ' ' + repeatTime + '，下次：' + timeUtil.fmtDateTime(reminderTime)
    }

    this.setData({
      reminderTime: reminderTime ? reminderTime.getTime() : 0,
      reminderTimeDisplay: display
    })
  },

  saveReminder() {
    const { title, note, type, delayIndex, customDelayValue, customDelayUnit, scheduleDate, scheduleTime, repeatRule, repeatTime, repeatWeekday, reminderTime, typeLabel } = this.data

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

    if (type === 'delay') {
      if (delayIndex === -1) {
        const val = parseInt(customDelayValue)
        if (!val || val <= 0) {
          wx.showToast({ title: '请输入有效的延时时长', icon: 'none' })
          return
        }
        intervalLabel = val + (customDelayUnit === 'hour' ? ' 小时后' : ' 分钟后')
      } else {
        intervalLabel = DELAY_OPTIONS[delayIndex].label
      }
    } else if (type === 'schedule') {
      intervalLabel = scheduleDate + ' ' + scheduleTime
    } else {
      const ruleLabel = REPEAT_OPTIONS.find(r => r.value === repeatRule).label
      if (repeatRule === 'weekly') {
        intervalLabel = '每' + timeUtil.WEEKDAYS[repeatWeekday] + ' ' + repeatTime
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
        date: timeUtil.fmtDate(targetDate),
        time: timeUtil.fmtTime(targetDate),
        subscribed
      })
    }).catch(() => {
      wx.showToast({ title: '创建提醒失败', icon: 'none' })
    })
  },

  // 请求订阅消息授权
  _requestSubscribe() {
    return new Promise((resolve) => {
      if (SUBSCRIBE_TEMPLATE_ID === 'your_template_id_here') {
        resolve(false)
        return
      }

      wx.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        success(res) {
          const accepted = res[SUBSCRIBE_TEMPLATE_ID] === 'accept'
          resolve(accepted)
        },
        fail() {
          resolve(false)
        }
      })
    })
  },

  // 实际保存
  _doSave(data) {
    // 提交到后端 API
    api.createReminder({
      templateId: SUBSCRIBE_TEMPLATE_ID,
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
      subscribed: data.subscribed
    }).then(() => {
      wx.showToast({
        title: data.subscribed ? '提醒已创建，到时推送通知' : '提醒已创建',
        icon: 'success',
        duration: 2000
      })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    }).catch(() => {
      wx.showToast({
        title: '创建失败，请重试',
        icon: 'none',
        duration: 2000
      })
    })
  }
})
