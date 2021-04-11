var modal = document.getElementById('dateModal')
var modalManagement = document.getElementById('dateModalByManagement')
var userSuiId = window.authenticatedUserSuiId;
const buttonClose = (userId) => {
    return '<button type="button" class="close btn-close" ' +
        'data-user-id=' + userId + ' aria-label="Close"><span aria-hidden="true">&times;</span></button>';
}
const CloseModal = (modal) => {
    modal.removeAttribute("style");
    modal.classList.remove("show");
    let modalBackdrop = document.getElementById('modalBackdrop')
    modalBackdrop.parentNode.removeChild(modalBackdrop);
}
const InputModal = (modal) => {
    let modalBackdrop = document.createElement("div")
    modalBackdrop.id = 'modalBackdrop';
    modalBackdrop.setAttribute("class", "modal-backdrop fade show");
    modal.setAttribute("style", "display: block");
    modal.classList.add("show");
    document.getElementById('kt_header').getElementsByClassName('kt-header-menu-buttons')[0].appendChild(modalBackdrop)
}
const prepareDeleteForSpeech = (val, eventName) => {
    val.addEventListener('click', () => {
        const event = new CustomEvent (eventName+'Delete', {
            'detail': {
                'sender': val.dataset.userId,
                'delete': true
            }
        });
        window.dispatchEvent(event);
    })
}
const addAttrRegiterSpeech = (inputElem, text) => {
    inputElem.innerHTML = text + ' Удалить запись?'
    inputElem.setAttribute("regiter-speech", "")
}
const prepareDeleteForArrElement = (closeElements, detail) => {
    Array.from(closeElements).map((value) => {
            prepareDeleteForSpeech(value, detail)
        }
    )
}
const dateStringToTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
}
const singUp = (modalWin, params) => {
    var close = modalWin.getElementsByClassName('btn-close');
    var submit = modalWin.getElementsByTagName('button').btnSubmit;
    var input = document.getElementById(params.button);
    // var dateInput = document.getElementById(params.modalInput);
    const regiterButton = (buttonText) => {
        input.removeAttribute("regiter-speech")
        input.innerHTML = buttonText
    }
    input.addEventListener('click', () => {
        if (input.hasAttribute("regiter-speech")) {
            regiterButton(params.buttonText)
        } else {
            InputModal(modalWin)
        }
    });
    Array.from(close).map((val) => {
            val.addEventListener('click', () => {
                CloseModal(modalWin)
            })
        }
    );
    submit.addEventListener('click', () => {
        prepareDeleteForSpeech(input, params.detail)
        CloseModal(modalWin)
        const event = new CustomEvent(params.detail+'RegistrationUser', {
            'detail': {
                // 'text': dateInput.value,
                'time': Date.now(),
                'sender': input.dataset.userId,
                'name': input.dataset.name,
                'delete': false
            }
        });
        window.dispatchEvent(event);

        console.log('Speech registration by ' + window.authenticatedUserSuiId);
    })
    window.addEventListener(params.detail+'Time', function (event) {
        const {detail} = event;
        var deleteSpeech = ''
        var senderSpeech = ''
//            проверка на пустоту
        if (!['[]', '{}'].includes(JSON.stringify(detail[params.detail]))&&detail[params.detail][userSuiId]) {
            deleteSpeech = detail[params.detail][userSuiId].delete
            senderSpeech = detail[params.detail][userSuiId].sender
        }
        if (senderSpeech == userSuiId) {
            if (deleteSpeech) {
                regiterButton(params.buttonText)
            } else {
                prepareDeleteForSpeech(input, params.detail)
                addAttrRegiterSpeech(input, 'Вы записались.')
            }
        }
    });
}

if (modal) {
    let params = {
        button: 'dateModalInput',
        // modalInput: 'dateInput',
        detail: 'speech',
        buttonText: window.textButtonsSpeech
}
    singUp(modal, params)
}

if (modalManagement) {
    let params = {
        button: 'registerByManagement',
        // modalInput: 'managerDateInput',
        detail: 'manager',
        buttonText: window.textButtonsManager
}
    singUp(modalManagement, params)
}

var pageSpeech = document.getElementById('pageSpeech')
if (pageSpeech) {
    var registrateList = {
        'speechList': document.getElementById('speechList'),
        'managerList': document.getElementById('managerList')
    }
    window.addEventListener('showAllRegistered', function (event) {
        const {detail} = arrRegistered = event;
        for (let detailKey in detail) {
            var result = [];
            Object.entries(detail[detailKey]).forEach(([key, value]) => {
                result[key] = value;
            });
            let sortDetail = result.sort((a,b) => {
                return a.time - b.time
            })
            var list = '<div class="row">'
            for (let key in sortDetail) {
                if (!sortDetail[key].delete) {
                    let date = dateStringToTime(sortDetail[key].time);
                    list += '<div class="col-8 listRegistered__name">' + sortDetail[key].name + '</div> <div class="clo-4 listRegistered__date">(' + date + ')</div>'
                }
            }
            list += '</div>'

            registrateList[detailKey+'List'].innerHTML = list;
            var closeElements = {detailKey: registrateList[detailKey+'List'].getElementsByClassName('btn-close')}
            prepareDeleteForArrElement(closeElements.detailKey, detailKey)
        }

    })
}

var modalList = document.getElementById('listModal')
if (modalList) {
    var closeList = modalList.getElementsByClassName('btn-close');
    var inputList = document.getElementById('listModalInput');
    var registrateList = {
        'speechList': document.getElementById('speechList'),
        'managerList': document.getElementById('managerList')
    }
    var deleteAllSpeech = document.getElementById('deleteAllSpeech');
    var deleteAllManager = document.getElementById('deleteAllManager');
    var arrRegistered = []
    Array.from(closeList).map((val) => {
            val.addEventListener('click', () => {
                CloseModal(modalList)
            })
        }
    );
    inputList.addEventListener('click', () => {
        const event = new CustomEvent('getAllRegistered');
        window.dispatchEvent(event);
        InputModal(modalList)
    });
    deleteAllSpeech.addEventListener('click', () => {
        const event = new CustomEvent('speechAllDelete', arrRegistered);
        window.dispatchEvent(event);
    });
    deleteAllManager.addEventListener('click', () => {
        const event = new CustomEvent('managerAllDelete', arrRegistered);
        window.dispatchEvent(event);
    });
    window.addEventListener('showAllRegistered', function (event) {
        const {detail} = arrRegistered = event;
        for (let detailKey in detail) {
            var result = [];
                Object.entries(detail[detailKey]).forEach(([key, value]) => {
                    result[key] = value;
            });
            let sortDetail = result.sort((a,b) => {
                return a.time - b.time
            })
            var list = '<ul>'
            for (let key in sortDetail) {
                if (!sortDetail[key].delete) {
                    let date = dateStringToTime(sortDetail[key].time);
                    list += '<li>' + sortDetail[key].name + ' (' + date + ')' + buttonClose(sortDetail[key].sender) + '</li>'
                }
            }
            list += '</ul>'

                registrateList[detailKey+'List'].innerHTML = list;
            var closeElements = {detailKey: registrateList[detailKey+'List'].getElementsByClassName('btn-close')}
            prepareDeleteForArrElement(closeElements.detailKey, detailKey)
        }

    })
}


var participantList = document.getElementById('participant-list');
if (participantList) {
    var speeches = participantList.getElementsByClassName('participant_item');
    const htmlForUserId = (speech, textPreview, timeString) => {
        let time = dateStringToTime(timeString);
        return '<span class="btn btn-sm status_online" data-time-string=' + timeString + '><div class="row"><div class="col-10">'+ textPreview + time + '</div><div class="col-2">'+ buttonClose(speech) + '</div></div></span>'
    }
    const forDetail = (val, participantParams) => {
        for (let v in val) {
            UserIdHtml(val[v], participantParams)
        }
    }
    const UserIdHtml = (val, participantParams) => {
        Array.from(speeches).map((speech) => {
            if (speech.dataset.userId == val.sender) {
                var userId = document.getElementById(participantParams.detail + '-' + val.sender);
                if (val.delete) {
                    userId.innerHTML = ''
                } else {
                    userId.innerHTML = htmlForUserId(val.sender, participantParams.text, val.time);
                    var closeUserTime = userId.getElementsByClassName('btn-close')
                    prepareDeleteForArrElement(closeUserTime, participantParams.detail)
                }
            }
        })

    }
    window.addEventListener('speechTime', function (event) {
        const {detail: {speech: val}} = event;
        let participantParams = {
            'detail': 'speech',
            'text': 'Запись на выступление ',
        }
        val?forDetail(val, participantParams):'';
    });
    window.addEventListener('managerTime', function (event) {
        const {detail: {manager: val}} = event;
        let participantParams = {
            'detail': 'manager',
            'text': 'Запись по ведению ',
        }
        val?forDetail(val, participantParams):'';
    });
}