// Question select handler
const questionSelectBox = document.getElementById("translationQuestion");
const questionText = document.getElementById("questionText");
const buttonVoting = document.getElementById("voting")
const translationQuestion = document.getElementById("translationQuestion");
const votingModal = document.getElementById("votingModal");
const votingModalTitle = $('#votingModalTitle').html()
const votingButtonsGroup = document.getElementById("votingButtonsGroup");
const pageSpeechVoting = document.getElementById("pageSpeechVoting");
var votingTime = document.getElementById("votingTime");
var votingMinute = document.getElementById("votingMinute");
if (buttonVoting) {
    var buttonVotingValue = buttonVoting.innerHTML
}
if (votingTime) {
    var votingTimeValue = votingTime.innerHTML
}
if (votingButtonsGroup) {
    var votingButtonsGroupValue = votingButtonsGroup.innerHTML
}

const buttonVotingHTML = (ivent) => {
    if (ivent === window.VOTING_END) {
        return buttonVoting.innerHTML = "По вопросу голосование закончилось. Переголосовать"
    } else if (ivent === window.VOTING_START) {
        buttonVoting.innerHTML = "Голосоваие началось, до конца голосования:"
    } else if (ivent === window.VOTING) {
        buttonVoting.innerHTML = buttonVotingValue
    } else if (ivent === window.VOTING_SAVE) {
        buttonVoting.innerHTML = "Голосование закончилось. Сохранить результаты"
    }
}
const questionId = (element) => {
    return element.dataset.select2Id.replace(/\D+/g, "")
};
const translationQuestionEvent = (event) => {
    if (event) {
        $(translationQuestion).removeAttr('disabled')
    } else {
        $(translationQuestion).attr('disabled', '')
    }
}

const votingButtonsGroupStart = (time, questionId) => {
    $(votingButtonsGroup).show().html(votingButtonsGroupValue)
    votingTime = document.getElementById("votingTime");
    timerInit(time)
    votingIs(questionId)
}

const setInputVotingTime = () =>{
    votingTime.innerHTML = votingTimeValue;
    buttonVoting.removeAttribute('disabled')
    buttonVotingHTML(window.VOTING)
}

if (questionSelectBox) {
    questionSelectBox.onchange = function () {
        const questionText = questionSelectBox.options[questionSelectBox.selectedIndex].text;
        let questionIdSelect = questionId(questionSelectBox.options[questionSelectBox.selectedIndex]);
        setInputVotingTime()
        const event = new CustomEvent('onQuestionChangeByCurrentUser', {
            'detail': {
                'index': questionSelectBox.selectedIndex,
                'questionId': Number(questionIdSelect),
                'text': questionText,
                'sender': window.authenticatedUserSuiId,
            }
        });
        window.dispatchEvent(event);
        console.log('Question changed to: ' + questionText);
    };
}

const eventVoting = (event, time = null) => {
    let eventVoting = new CustomEvent('votingStart', {
        'detail': {
            'votingStart': {
                'start': event,
                'time': time
            }
        }
    })
    window.dispatchEvent(eventVoting);
}

const timer = (differenceDate, interval) => {
    if (differenceDate <= 0) {
        clearInterval(interval);
        if (buttonVoting) {
            buttonVoting.removeAttribute('stop');
            votingTime.innerHTML = '';
            translationQuestion.removeAttribute('disabled', '')
            buttonVoting.removeAttribute('disabled', '')
            translationQuestionEvent(true)
            buttonVotingHTML(window.VOTING_SAVE)
            buttonVoting.dataset.sendVoting = 0
        }
        if (buttonVoting) {
            eventVoting(false)
        }
        if(pageSpeechVoting) {

        } else {
            alert("Время закончилось");
        }
    } else {
        let res = new Date(differenceDate);
        let str_timer = `${(res.getMinutes() < 10 ? '0' : '') + res.getMinutes()}:${(res.getSeconds() < 10 ? '0' : '') + res.getSeconds()}`;
        votingTime = document.getElementById("votingTime");
        votingTime.innerHTML = str_timer;
    }
}

const timerInit = (startTime) => {
    let dateNow = new Date().getTime(),
        differenceDate = startTime - dateNow,
        interval
    if (differenceDate > 0) {
        interval = setInterval(() => {
            timer(differenceDate -= 1000, interval)
        }, 1000);
    }

    if (pageSpeechVoting) {
        let intervalPageSpeechVoting,
            timeoutPageSpeechVoting,
            i = 0,
            intervalSpeech = differenceDate/100 - 20
        const pageSpeechVotingHide = ()=> {
            $(pageSpeechVoting).hide()
            $('.radial-progress').attr('data-progress', 0)
            clearTimeout(timeoutPageSpeechVoting)
        }
        if (differenceDate > 0 ){
            intervalPageSpeechVoting = setInterval(() => {
                if (i >= 100){
                    clearInterval(intervalPageSpeechVoting)
                    timeoutPageSpeechVoting = setTimeout(pageSpeechVotingHide, 5000)
                } else {
                    $('.radial-progress').attr('data-progress', ++i)
                }
            }, intervalSpeech);
        }

    }

}

const votingEnd = () => {
    buttonVoting.removeAttribute('disabled')
    buttonVoting.dataset.sendVoting = 1
    votingTime.innerHTML = '';
    buttonVotingHTML(window.VOTING_END)
}

const hideAllBlocks = ()=>{
    $('.votingGroup').map((key, elem) => {
        $(elem).removeClass('active')
    })
    $('#tableVoting').hide()
    $('#votingEmployee').hide()
}


if (buttonVoting) {
    let interval,
        differenceDate = 0,
        date;
    buttonVoting.addEventListener('click', () => {
        votingMinute = document.getElementById("votingMinute");
        if (+buttonVoting.dataset.sendVoting) {
            if (votingMinute) {
                if (!votingMinute.value) {
                    alert("Установите время голосования")
                } else {
                    if (differenceDate <= 0) {
                        let dateNow = new Date().getTime();
                        date = new Date(dateNow + votingMinute.value * 1000).getTime();
                        differenceDate = date - dateNow;
                    }
                    interval = setInterval(() => {
                        timer(differenceDate -= 1000, interval)
                    }, 1000);
                    translationQuestionEvent(false)
                    buttonVoting.setAttribute('disabled', '')
                    buttonVotingHTML(window.VOTING_START)
                    eventVoting(true, date)
                }
            } else {
                setInputVotingTime()
            }
        } else  {
            const event = new CustomEvent('saveVotingResult', {
                'detail': {
                    'save': true,
                }
            });
            window.dispatchEvent(event);
            votingEnd()

        }

    });
}

if (votingModal) {

    const votingModalСlose = votingModal.getElementsByClassName('btn-close');
    Array.from(votingModalСlose).map((val) => {
        val.addEventListener('click', () => {
            votingModal.removeAttribute("style");
            votingModal.classList.remove("show");
            let modalBackdrop = document.getElementById('modalBackdrop')
            modalBackdrop.parentNode.removeChild(modalBackdrop);
        })
    })
}

window.addEventListener('onQuestionChangeByThirdPartyUser', function (event) {
    const {detail: {question: currentQuestion, votingQuestion, votingStart}} = event;
    let arrVotingQuestionsId = Object.keys(votingQuestion ? votingQuestion : [])
    if (questionSelectBox) {
        $(questionSelectBox).val(currentQuestion.index + 1).select2();
        const isVotingQuestions = (id) => {
            return questionId(document.getElementById("select__" + currentQuestion.questionId)) == id
        }
        if (arrVotingQuestionsId.some(isVotingQuestions) && buttonVoting) {
            if (votingQuestion[currentQuestion.questionId]['votingGroup_'+Object.keys(votingQuestion[currentQuestion.questionId]).length].save) {
                votingEnd()
            } else {
                buttonVoting.removeAttribute('disabled')
                buttonVoting.dataset.sendVoting = 0
                votingTime.innerHTML = '';
                buttonVotingHTML(window.VOTING_SAVE)


            }
        } else if (buttonVoting && currentQuestion.length != 0) {
            buttonVoting.dataset.sendVoting = 1
            buttonVoting.removeAttribute('disabled')
        }

        // нужна проверка если идет голосование то select не возможен
        if (votingStart.start) {
            translationQuestionEvent(false)
            buttonVoting.setAttribute('disabled', '')
            buttonVotingHTML(window.VOTING_START)
            timerInit(votingStart.time)
        }
    }
    if (questionText) {
        $(questionText).text(currentQuestion.text);
    }
    document.getElementById("questionFilesButton").dataset.questionId = currentQuestion.questionId
    if (votingButtonsGroup) {
        let votingGroup = votingQuestion[currentQuestion.questionId]?Object.keys(votingQuestion[currentQuestion.questionId]).length:0
        if (votingQuestion[currentQuestion.questionId]) {
            if (votingQuestion[currentQuestion.questionId]['votingGroup_' + votingGroup].start) {
                votingButtonsGroupStart(votingStart.time, currentQuestion.questionId)
            } else {
                if (arrVotingQuestionsId.some((id) => (currentQuestion.questionId == id))) {
                    $(votingButtonsGroup).show().html("По текущему вопросу голосование закончилось")
                } else {
                    $(votingButtonsGroup).hide().html(votingButtonsGroupValue)
                }
            }
        }
    }
    // для монитора если идет голосование то показывать надпись "Идет голосование"
    if(pageSpeechVoting){
        if (votingStart.start) {
            $(pageSpeechVoting).show()
            timerInit(votingStart.time)
        }
    }
    hideAllBlocks()
});

window.addEventListener('votingEvent', function (event) {
    const {detail: {questionId, votingStart, votingQuestion}} = event;
    let arrVotingQuestionsId = Object.keys(votingQuestion ? votingQuestion : [])
    if (questionSelectBox) {
        if (votingStart.start) {
            translationQuestionEvent(false)
        } else {
            translationQuestionEvent(true)
        }
    }
    if (votingButtonsGroup) {
        if (votingStart.start) {
            votingButtonsGroupStart(votingStart.time, questionId)
        } else {
            if (arrVotingQuestionsId.some((id) => (Number(questionId) == Number(id)))) {
                $(votingButtonsGroup).show().html("По текущему вопросу голосование закончилось")
            }
        }
    }
    // устанавливает для монитора надпись "Идет голосование"
    if(pageSpeechVoting && votingStart.start){
        $(pageSpeechVoting).show()
        timerInit(votingStart.time)
    }
    hideAllBlocks()
});


const votingIs = (questionId) => {
    const InputModalVoting = (dataText, data) => {

        let modalBackdrop = document.createElement("div")
        modalBackdrop.id = 'modalBackdrop';
        modalBackdrop.setAttribute("class", "modal-backdrop fade show");
        document.getElementById('kt_header').getElementsByClassName('kt-header-menu-buttons')[0].appendChild(modalBackdrop)
        votingModal.setAttribute("style", "display: block");
        votingModal.classList.add("show");

        if (data == 3) {
            $('#votingModalTitle').html("Вы воздержались!")
        } else {
            let voice = votingModalTitle.replace('{voice}', dataText.trim())
            $('#votingModalTitle').html(voice)
        }
    }
    Array.from($(votingButtonsGroup).children('button')).map((button) => {
        button.addEventListener('click', () => {
            InputModalVoting($(button).html(), $(button).data('voting'))
            const event = new CustomEvent('setVotingResult', {
                'detail': {
                    'questionId': questionId,
                    'sender': $(button).data('userId'),
                    'name': $(button).data('name'),
                    'result': $(button).data('voting'),
                    'time': new Date().toLocaleString("ru-RU", {timeZone: "Europe/Moscow"}),
                }
            });
            window.dispatchEvent(event);
        })
    })
}