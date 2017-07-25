/**
 * Created by sban on 2017/5/29.
 */

'use strict'

// 返回一个新实例
function page() {
  return {
    data: {
      loading: false
    },
    // 可绑定switch组件的change事件
    onSwitchChange: function (e) {
      var fieldName = e.currentTarget.dataset.name
      var data = {}
      data[fieldName] = !(data[fieldName] || false)
      this.setData(data)
    },
    // 可绑定slider组件的change事件
    onSliderChange: function (e) {
      var fieldName = e.currentTarget.dataset.name
      var data = {}
      data[fieldName] = e.detail.value
      this.setData(data)
    },
    onRadioChange:function (e) {
      var fieldName = e.currentTarget.dataset.name
      var data = {}
      data[fieldName] = e.detail.value
      this.setData(data)
    },
    setNameValue:function(e){
      var fieldName = e.currentTarget.dataset.name
      var fieldValue = e.currentTarget.dataset.value
      var data = {}
      data[fieldName] = fieldValue
      // console.log(data)
      this.setData(data)
    },
    alert:function (s) {
      wx.showModal({
        title: '提示',
        content: `${s}`,
      })
    },
    onReachBottom:function(){}
  }
}

module.exports = page()