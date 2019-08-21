// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


var Airtable = require('airtable');
var base = new Airtable({ apiKey: 'keyMrWOUHgyGR8J5e' }).base('appMidi1Kf2tLlUgY');

var mid = "pgefluvi1m";
var cancelPwd = "123456";
var fieldStore, rowIdStore, cardInfoStore;

payBtn.onclick = function () {
  getSelected(
    function (rowId) {
      base('주문').find(rowId, function (err, record) {
        if (err) { console.error(err); return; }

        if (!record.fields["주문 내역"]) {
          alert("주문 탭이 아닙니다")
          return;
        }

        console.log(record)

        var fields = record.fields;
        fieldStore = fields;
        rowIdStore = rowId;
        findCC({
          mid: mid,
          mallUserId: fields["연락처"][0]
        }, function (data) {
          if (data.cardInfoArray) {
            cardInfoStore = data.cardInfoArray;
            $("#payBtnPanel").hide();
            $("#confirmPanel").show();
            $("#payConfirmBtn").show();
            $("confirmPanel").show();
            $("#cardPreview").empty();
            cardInfoStore.map(function(c, i) {
              $("#cardPreview").append($('<option>', {value:i, text:c.cardNum.substring(0, 4) + "-****-****-" + c.cardNum.substring(12, 16)}));
            })
          } else {
            $("#payBtnPanel").hide()
            $("#payPanel").show()
            $("#paySaveBtn").show()
          }
        })
      });
    },
    function () {
      alert("셀이 선택되지 않았습니다.")
    }
  )
};

cancelBtn.onclick = function () {
  getSelected(
    function (rowId) {
      base('주문').find(rowId, function (err, record) {
        if (err) { console.error(err); return; }

        if (!record.fields["주문 내역"]) {
          alert("주문 탭이 아닙니다")
          return;
        }
        if (!record.fields["거래고유번호"]) {
          alert("거래고유번호가 없어 취소할 수 없습니다.")
          return;
        }

        console.log(record)
        var fields = record.fields;
        var data = {
          mid: mid,
          tid: fields["거래고유번호"],
          svcCd: "01",
          cancelAmt: fields["할인 가격"] || fields["총 가격"],
          cancelMsg: fields["취소 사유"],
          cancelPwd: cancelPwd
        }
        cancelPay(data, rowId);
      });
    },
    function () {
      alert("셀이 선택되지 않았습니다.")
    }
  )
}

paySaveBtn.onclick = function () {
  var fields = fieldStore;
  
  var data = {
    mid: mid,
    moid: fields["주문 번호"],
    goodsName: fields["주문 설명"][0],
    amt: fields["할인 가격"] || fields["총 가격"],
    dutyFreeAmt: 0,
    vat: 0,
    buyerName: fields["고객명"][0],
    buyerTel: fields["연락처"][0],
    mallUserId: fields["연락처"][0],
    cardNum: $("#cardNum").val(),
    cardExpire: $("#cardExpire").val(),
    cardQuota: $("#cardQuota").val()
  }
  doPay(data, rowIdStore, true);
}

payConfirmBtn.onclick = function () {
  var fields = fieldStore;

  var selectedCard = cardInfoStore[parseInt($("#cardPreview").val())]

  var data = {
    mid: mid,
    moid: fields["주문 번호"],
    goodsName: fields["주문 설명"][0],
    amt: fields["할인 가격"] || fields["총 가격"],
    dutyFreeAmt: 0,
    vat: 0,
    buyerName: fields["고객명"][0],
    buyerTel: fields["연락처"][0],
    mallUserId: fields["연락처"][0],
    cardNum: selectedCard.cardNum,
    cardExpire: selectedCard.cardExpire,
    cardQuota: $("#cardQuotaConfirm").val()
  }
  doPay(data, rowIdStore);
}

addCard.onclick = function() {
  $("#payPanel").show();
  $("#paySaveBtn").show();
  $("#payConfirmBtn").hide();
  $("#confirmPanel").hide();
}

function getSelected(success, fail) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      text: "getSelected"
    }, function (response) {
      if (response.isSelected)
        success(response.dataId);
      else
        fail()
    });
  });
}

function doPay(userData, rowId, isSave) {
  $.ajax({
    type: "POST",
    url: "https://api.innopay.co.kr/api/pvPayApi",
    async: true,
    data: JSON.stringify(userData),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function (data) {
      console.log(data)
      alert(data.resultMsg)
      if (data.resultCode !== "0000")
        return;
      base('주문').update(rowId, {
        "상태": "결제 완료",
        "거래고유번호": data.tid,
        "카드 결제 이력": data.cardNum.substring(0, 4) + " " + data.appCardName
      }, function (err, record) {
        if (err) {
          console.error(err);
          return;
        }
        console.log(record.get('상태'));
        $("#payBtnPanel").show()
        $("#payPanel").hide()
        $("#paySaveBtn").hide()
        $("#confirmPanel").hide()
        $("#payConfirmBtn").hide()
        if (!isSave)
          return;
        $.ajax({
          type: "POST",
          url: "https://api.innopay.co.kr/api/saveCardInfo",
          async: true,
          data: JSON.stringify({
            mid: mid,
            tid: data.tid,
            mallUserId: userData.mallUserId
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (data) {
          }
        })

      });
    },
    error: function (data) {
      console.log(data);
      alert("결제 실패");
    }
  });
};

function cancelPay(data, rowId) {
  $.ajax({
    type: "POST",
    url: "https://api.innopay.co.kr/api/cancelApi",
    async: true,
    data: JSON.stringify(data),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function (data) {
      console.log(data)
      alert(data.resultMsg)
      base('주문').update(rowId, {
        "상태": "결제 취소"
      }, function (err, record) {
        if (err) {
          console.error(err);
          return;
        }
        console.log(record.get('상태'));
      });
    },
    error: function (data) {
      console.log(data);
      alert("결제 실패");
    }
  });
};

function findCC(data, cb) {
  $.ajax({
    type: "POST",
    url: "https://api.innopay.co.kr/api/getCardInfo",
    async: true,
    data: JSON.stringify(data),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function (data) {
      console.log(data)
      cb(data)
    },
    error: function (data) {
      console.log(data);
      alert("카드 정보 검색 실패");
    }
  });
};