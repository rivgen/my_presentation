const Websocket = function (host) {
    let websocket;
    let session;
    const upperCase = (text = '') => {
        var textUpperCase = "";
        var len = text.length;
        for (var i = 0; i < len; i++) {
            textUpperCase += text[i].toUpperCase();
        }
        return textUpperCase;
    }
    const init = function () {
        websocket = WS.connect(host);
        websocket.on("socket/connect", function (_session) {
            session = _session;
            session.subscribe("app/channel", function (uri, payload) {
                const {msg, event_name, question, users, timer_value, registered_users, detail, typeEvent, votingStart, votingQuestion, votingResult, votingData, tableDetail, employeeDetail} = payload;

                if (msg) {
                    console.log("Received message", msg, event_name);
                }
                // console.log(999, payload)
                if (event_name === window.SUBSCRIBE_EVENT) {
                    let event = new CustomEvent('onQuestionChangeByThirdPartyUser', {
                        'detail': {
                            'question': question,
                            'votingQuestion': votingQuestion,
                            'votingStart': votingStart,
                        }
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('speechTime', {
                        detail
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('managerTime', {
                        detail
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('onParticipantConnect', {
                        'detail': {
                            'connected_users': users,
                            'registered_users': registered_users,
                        }
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('showAllRegistered', {
                        detail
                    });
                    window.dispatchEvent(event);
                }

                if (event_name === window.UNSUBSCRIBE_EVENT) {
                    const event = new CustomEvent('onParticipantConnect', {
                        'detail': {
                            'connected_users': users,
                            'registered_users': registered_users,
                        }
                    });
                    window.dispatchEvent(event);
                }

                if (event_name === window.QUESTION_CHANGE_EVENT) {
                    const event = new CustomEvent('onQuestionChangeByThirdPartyUser', {
                        'detail': {
                            'question': question,
                            'votingQuestion': votingQuestion,
                            'votingStart': votingStart
                        }
                    });

                    window.dispatchEvent(event);
                }

                if ([window[upperCase(typeEvent) + '_REGISTRATION'], window[upperCase(typeEvent) + '_DELETE'], window[upperCase(typeEvent) + '_ALL_DELETE']].includes(event_name)) {
                    let event = new CustomEvent(typeEvent + 'Time', {
                        detail
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('onParticipantConnect', {
                        'detail': {
                            'connected_users': users,
                            'registered_users': registered_users,
                        }
                    });
                    window.dispatchEvent(event);

                    event = new CustomEvent('showAllRegistered', {
                        detail
                    });
                    window.dispatchEvent(event);
                }

                if (event_name === window.REGISTERED_GET_ALL) {
                    const event = new CustomEvent('showAllRegistered', {
                        detail
                    });
                    window.dispatchEvent(event);
                }

                if (event_name === window.VOTING_START) {
                    const event = new CustomEvent('votingEvent', {
                        'detail': {
                            'questionId': question,
                            'votingStart': votingStart,
                            'votingQuestion': votingQuestion
                        }
                    });
                    window.dispatchEvent(event);
                }

                if (tableDetail) {
                    const event = new CustomEvent('tableDetail', {
                        'detail': {
                            'tableDetail': tableDetail
                        }
                    })
                    window.dispatchEvent(event);
                }

                if (employeeDetail) {
                    const event = new CustomEvent('employeeDetail', {
                        'detail': {
                            'employeeDetail': employeeDetail
                        }
                    })
                    window.dispatchEvent(event);
                }

                if (event_name === window.VOTING_SAVE) {
                }
            });
        });

        window.addEventListener('onQuestionChangeByCurrentUser', function (event) {
            session.publish("app/channel", {'event_name': window.QUESTION_CHANGE_EVENT, 'question': event.detail});
        });

        window.addEventListener('speechRegistrationUser', function (event) {
            session.publish("app/channel", {
                'event_name': window.SPEECH_REGISTRATION,
                'speech': event.detail,
                'typeEvent': 'speech'
            });
        });
        window.addEventListener('speechDelete', function (event) {
            session.publish("app/channel", {
                'event_name': window.SPEECH_DELETE,
                'speech': event.detail,
                'typeEvent': 'speech'
            });
        });
        window.addEventListener('speechAllDelete', function (event) {
            session.publish("app/channel", {
                'event_name': window.SPEECH_ALL_DELETE,
                'speech': event.detail.speech,
                'typeEvent': 'speech'
            });
        });
        window.addEventListener('getAllRegistered', function () {
            session.publish("app/channel", {'event_name': window.REGISTERED_GET_ALL});
        });
        window.addEventListener('managerRegistrationUser', function (event) {
            session.publish("app/channel", {
                'event_name': window.MANAGER_REGISTRATION,
                'manager': event.detail,
                'typeEvent': 'manager'
            });
        });
        window.addEventListener('managerDelete', function (event) {
            session.publish("app/channel", {
                'event_name': window.MANAGER_DELETE,
                'manager': event.detail,
                'typeEvent': 'manager'
            });
        });
        window.addEventListener('managerAllDelete', function (event) {
            session.publish("app/channel", {
                'event_name': window.MANAGER_ALL_DELETE,
                'manager': event.detail.manager,
                'typeEvent': 'manager'
            });
        });
        window.addEventListener('votingStart', function (event) {
            session.publish("app/channel", {
                'event_name': window.VOTING_START,
                'votingStart': event.detail.votingStart
            });
        });
        window.addEventListener('setVotingResult', function (event) {

            session.publish("app/channel", {
                'event_name': window.RESULT_VOTING,
                'votingResult': event.detail
            });
        });
        window.addEventListener('saveVotingResult', function () {
            session.publish("app/channel", {
                'event_name': window.VOTING_SAVE,
                'save': event.detail.save
            });
        });
        window.addEventListener('tableVoting', (event) => {
            session.publish("app/channel", {
                'tableDetail': event.detail
            });
        })
        window.addEventListener('employeeVoting', (event) => {
            session.publish("app/channel", {
                'employeeDetail': event.detail
            });
        })

        websocket.on("socket/disconnect", function (error) {
            console.log("Disconnected for " + error.reason + " with code " + error.code, error);
        });

        return websocket;
    };

    return {
        init
    };
};
