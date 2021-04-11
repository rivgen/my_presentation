const tableVoting = document.getElementById("tableVoting")
const timeBegin = document.getElementById("timeBegin")
const votingEmployee = document.getElementById("votingEmployee")
const eventTableVoting = (data) => {
    const event = new CustomEvent('tableVoting', {
        'detail': {
            'result': data.result,
            'question': data.question,
            'questionIndex': data.questionIndex,
            'active': data.active,
        }
    });
    window.dispatchEvent(event);
}

const eventEmployeeVoting = (data) => {
    const event = new CustomEvent('employeeVoting', {
        'detail': data
    });
    window.dispatchEvent(event);
}

const removeClassActive = () => {
    $('.votingGroup').map((key, elem) => {
        $(elem).removeClass('active')
    })
    $('.jsVotesResult').parent().map((key, elem) => {
        $(elem).removeClass('active')
    })
}

$('.votingGroup').on('click', (event) => {
    let questionIndex = $(event.currentTarget).data('index')
    if ($(event.currentTarget).hasClass('active')) {
        let data = {'active': false}
        $(event.currentTarget).removeClass('active')
        eventTableVoting(data)
    } else {
        let active = true
        removeClassActive()
        $(event.currentTarget).addClass('active')

        $.ajax({
            type: "POST",
            url: '/remote-translation-voting-results',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({
                index: questionIndex,
                questionId: $(event.currentTarget).data('questionId'),
            })
        }).done((data) => {
            data = JSON.parse(data)
            data.active = active
            data.questionIndex = questionIndex
            eventTableVoting(data)
        }).fail(function (error) {
            console.log("Error: " + error);
        })
    }
})

$('.jsVotesResult').on('click', (event) => {
    if ($(event.currentTarget).hasClass('active')) {
        let data = {'active': false}
        $(event.currentTarget).removeClass('active')
        eventEmployeeVoting(data)
    } else {
        let questionId = $(event.currentTarget).data('questionsId'),
            group = $(event.currentTarget).data('group'),
            voting = $(event.currentTarget).data('voting'),
            votingTitle = '',
            active = true
        switch (voting) {
            case 'agree':
                voting = 1
                votingTitle = 'Проголосовали ЗА:'
                break;
            case 'disagree':
                voting = 2
                votingTitle = 'Проголосовали ПРОТИВ:'
                break;
            case 'ignore':
                voting = 3
                votingTitle = 'ВОЗДЕРЖАЛИСЬ:'
                break;
        }
        removeClassActive()
        $(event.currentTarget).parent().addClass('active')
        $.ajax({
            type: "POST",
            url: '/remote-translation-voting-employee',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({
                questionId: questionId,
                group: group,
                voting: voting,
            })
        }).done((obj) => {
            obj = JSON.parse(obj)
            let data = {}
            data.employee = obj.employee
            data.questionText = obj.question.Text
            data.group = obj.group
            data.votingTitle = votingTitle
            data.active = active
            eventEmployeeVoting(data)
        }).fail(function (error) {
            console.log("Error: " + error);
        })
    }

})

if (tableVoting) {
    window.addEventListener('tableDetail', (event) => {
        const {detail: {tableDetail: {result, question, questionIndex, active}}} = event
        if (active) {
            const tableAgree = $('#tableAgree')
            const tableDisagree = $('#tableDisagree')
            const tableNeutral = $('#tableNeutral')
            const tableIgnore = $('#tableIgnore')
            const tableQuestionText = $('#tableQuestionText')
            const tableQuestionVoting = $('#tableQuestionVoting')

            $(tableVoting).show()
            $(votingEmployee).hide()
            tableAgree.html(result.votes_agree)
            tableDisagree.html(result.voting_disagree)
            tableNeutral.html(result.votes_neutral)
            tableIgnore.html(result.votes_ignore)
            tableQuestionText.html(question)
            tableQuestionVoting.html('Голосование №' + questionIndex)
        } else {
            $(tableVoting).hide()
        }
    })
}

if (timeBegin) {
    var timeDate = $(timeBegin).data('time')
    setInterval(() => {
        timeDate += 1000
        let res = new Date(timeDate);
        let str_timer = `${(res.getHours() < 10 ? '0' : '') + res.getHours()}:${(res.getMinutes() < 10 ? '0' : '') + res.getMinutes()}:${(res.getSeconds() < 10 ? '0' : '') + res.getSeconds()}`;
        $(timeBegin).html(str_timer)
    }, 1000);
}

if(votingEmployee) {
    window.addEventListener('employeeDetail', (event) => {
        const {detail: {employeeDetail:{votingTitle, employee, active, questionText, group}}} = event
        if (active) {
            $(votingEmployee).show()
            $(tableVoting).hide()
            $('#votingEmployeeTitle').html(votingTitle)
            $('#votingEmployeeQuestion').html(questionText)
            $('#votingEmployeeGroup').html("Голосование №"+group)
            let html = ''
            Object.keys(employee).forEach(key => {
                html += '<div class=" col-4 text">' + employee[key].Name + '</div>'
            })
            $('#employees').html(html)
        } else {
            $(votingEmployee).hide()
        }
    })
}