<?php


class registration_for_sessionActions extends apiActions
{
    /**
     * Зарегистрироваться на заседание
     *
     * @SWG\Get(
     *   path="/api/registration-for-session/register/{employee_id}/{session_id}",
     *   tags={"RegistrationForSession"},
     *   security={{"token":{}}},
     *   @SWG\Parameter(name="employee_id", type="integer", in="path", required=true),
     *   @SWG\Parameter(name="session_id", type="integer", in="path", required=false),
     *   @SWG\Response(
     *     response="200", ref="$/responses/Json",
     *     description="Корректный ответ",
     *     @SWG\Schema(
     *       @SWG\Property(property="role", type="integer", description="Роль пользователя: 0 - не имеет доступа, 1 - помощник, 2 - участник, 3 - админ"),
     *     )
     *   ),
     *   @SWG\Response(response="404", ref="$/responses/NotFound")
     * )
     *
     * @param sfWebRequest $request
     * @return string
     * @throws PropelException
     * @throws sfStopException
     */
    public function executeRegister(sfWebRequest $request)
    {
        // Получаем id авторизованного пользователя
        if (($employeeId = $this->checkAuth($request)) == sfView::NONE) {
            return sfView::NONE;
        }

        $employeeId = $request->getParameter('employee_id');
        $employee = EmployeeQuery::create()->findOneById($employeeId);
        if (!$employee) {
            return $this->error('Пользователь не найден');
        }

        $registrationForSessionId = $request->getParameter('session_id');

        if (!$registrationForSessionId) {
            $registrationForSession = RegistrationForSessionQuery::create()->findCurrent();
        } else {
            $registrationForSession = RegistrationForSessionQuery::create()->findOneById($registrationForSessionId);
        }

        if (!$registrationForSession) {
            return $this->error('Заседание не найдено');
        }

        $admin = RemoteTranslationMemberQuery::create()
            ->useRemoteTranslationQuery()
            ->filterByRegistrationId($registrationForSession->getId())
            ->endUse()
            ->filterByEmployee($employee)
            ->count();

        $role = new RegistrationForSessionRole();
        if ($admin) {
            $role->setAdmin();
        }

        /** @var RegistrationForSessionEmployee $sessionEmployee */
        if ($sessionEmployee = $registrationForSession->findEmployee($employee)) {

            // регестрируем пользователя
            $writeConnection = (sfConfig::get('sf_environment') == 'test') ? Propel::getConnection() : Propel::getConnection('public_api');
            $sessionEmployee->setRegistered(true);
            $sessionEmployee->setUpdatedAt(new DateTime());
            $sessionEmployee->save($writeConnection);

            if (!$sessionEmployee->getHasvote()) {
                $role->setParticipant();
            } else {
                $role->setDeputy();
            }
        }

        return $this->response(['role' => $role->returnRole()]);
    }

    /**
     * Запосить конфигурацию трансляции
     *
     * @SWG\Get(
     *   path="/api/registration-for-session/configure/{session_id}",
     *   tags={"RegistrationForSession"},
     *   security={{"token":{}}},
     *   @SWG\Parameter(name="session_id", type="integer", in="path", required=false),
     *   @SWG\Response(
     *     response="200", ref="$/responses/Json",
     *     description="Корректный ответ"
     *   ),
     *   @SWG\Response(response="404", ref="$/responses/NotFound")
     * )
     *
     * @param sfWebRequest $request
     * @return string
     * @throws PropelException
     * @throws sfStopException
     */
    public function executeConfigure(sfWebRequest $request)
    {
        if ($this->checkAuth($request) == sfView::NONE) {
            return sfView::NONE;
        }

        $registrationForSessionId = $request->getParameter('session_id');

        if (!$registrationForSessionId) {
            $registrationsForSession = RegistrationForSessionQuery::create()->findCurrent(true);
        } else {
            if (!$registrationForSession = RegistrationForSessionQuery::create()->findOneById($registrationForSessionId)) {
                return $this->error('Заседание не найдено');
            }

            $registrationsForSession[] = $registrationForSession;
        }

        $result = [];
        foreach ($registrationsForSession as $key => $registrationForSession) {
            $remoteTranslation = RemoteTranslationQuery::create()->findOneByRegistrationId($registrationForSession->getId());

            if (!$remoteTranslation) {
                continue;
            }

            $result[$key]['registration']['id'] = $registrationForSession->getId();
            $result[$key]['registration']['name'] = $registrationForSession->getName();

            /** @var RegistrationForSessionEmployee $sessionEmployee */
            foreach ($registrationForSession->getRegistrationForSessionEmployees() as $sessionEmployee) {
                $employee['id'] = $sessionEmployee->getEmployee()->getId();
                $employee['name'] = $sessionEmployee->getEmployee()->getName();
                $employee['avatar'] = (in_array($sessionEmployee->getEmployee()->getPhotoDestination(), DestinationPeer::getSiteDestinations())) ? sfConfig::get('app_site_domain') . $sessionEmployee->getEmployee()->getPhotoPath() : null;

                $admin = RemoteTranslationMemberQuery::create()
                    ->useRemoteTranslationQuery()
                    ->filterByRegistrationId($registrationForSession->getId())
                    ->endUse()
                    ->filterByEmployee($sessionEmployee->getEmployee())
                    ->count();
                $role = new RegistrationForSessionRole();
                if ($admin) {
                    $role->setAdmin();
                } elseif (!$sessionEmployee->getHasvote()) {
                    $role->setParticipant();
                } else {
                    $role->setDeputy();
                }
                $employee['role'] = $role->returnRole();

                $result[$key]['registration']['participants'][] = $employee;
            }

            $result[$key]['translation']['id'] = $remoteTranslation->getId();
            $result[$key]['translation']['speaker']['rtmp'] = $remoteTranslation->getRtmpSpeaker();
            $result[$key]['translation']['speaker']['hls'] = $remoteTranslation->getHlsSpeaker();
            $result[$key]['translation']['board']['rtmp'] = $remoteTranslation->getRtmpBoard();
            $result[$key]['translation']['board']['hls'] = $remoteTranslation->getHlsBoard();
            foreach ($remoteTranslation->getRemoteTranslationQuestions() as $question) {
                $translationQuestion['id'] = $question->getId();
                $translationQuestion['question'] = $question->getText();
                $result[$key]['translation']['questions'][] = $translationQuestion;
            }
        }

        return $this->response(array_values($result));
    }

    /**
     * Результаты голосования
     *
     * @param sfWebRequest $request
     * @return string
     * @throws PropelException
     * @throws sfStopException
     */
    public function executeGetUpcomingConferenceVoting(sfWebRequest $request)
    {
        if ($this->checkAuth($request) == sfView::NONE) {
            return sfView::NONE;
        }

        $conferences = Aisszd2Peer::getUpcomingConferenceList(Aisszd2Peer::CONFERENCE_ALL);
        $conference = array_shift($conferences)[0];

        $types = [
            $conference['ID_VID_ZAS'],
            Aisszd2Peer::getSecondConferenceType($conference['ID_VID_ZAS'], $conference['DATE_ZAS'])
        ];

        $votings = Aisszd2Peer::getVotingsByDateAndType($conference['DATE_ZAS'], $types);

        $result = [];
        foreach ($votings as $key => $voting) {
            $result[$key] = [
                'conference_id' => $conference['UNOM_ZAS'],
                'voting_id' => $voting['UNOM_GOLOS'],
                'voting_question' => $voting['TEMA_GOLOS'],
                'voting_type' => Aisszd2Peer::VOTING_TYPES[$voting['TIP_GOLOS']],
                'voting_time' => Misc::formatTime($voting['TIME_GOLOS_H'], $voting['TIME_GOLOS_M']),
                'votes_agree' => $voting['GOLOS_ZA'],
                'voting_disagree' => $voting['GOLOS_PROTIV'],
                'votes_neutral' => $voting['GOLOS_VOZD'],
                'votes_ignore' => $voting['GOLOS_NEGOL'],
                'voting_result' => Aisszd2Peer::VOTING_RESULT[$voting['ID_RESULT_GOLOS']]
            ];
        }

        return $this->response($result);
    }

    /**
     *  Детали голосования
     *
     * @param sfWebRequest $request
     * @return string
     * @throws PropelException
     * @throws sfStopException
     */
    public function executeGetVotingDetails(sfWebRequest $request)
    {
        if ($this->checkAuth($request) == sfView::NONE) {
            return sfView::NONE;
        }

        $conference = Aisszd2Peer::getConferenceById($request->getParameter('conference_id'), false, Aisszd2Peer::CONFERENCE_ALL);
        $voting = Aisszd2Peer::getVotingById($request->getParameter('voting_id'));
        $votes = Aisszd2Peer::getVotes($request->getParameter('voting_id'));

        usort($votes, function ($a, $b) {
            if (($result = ($a['FRACTION'] <=> $b['FRACTION'])) === 0) {
                return ($a['FIO_DEP'] <=> $b['FIO_DEP']);
            }

            return -1 * $result;
        });

        $votes = array_filter($votes, function ($dep) {
            if ($dep['GOLOS_FLAG'] == Aisszd2Peer::VOTE_DID_NOT_VOTE_2 ||
                $dep['GOLOS_FLAG'] == Aisszd2Peer::VOTE_DID_NOT_VOTE
            ) {
                return false;
            }
            return true;
        });

        $summary = [];
        foreach ($votes as &$vote) {
            $summary[$vote['FRACTION']][$vote['GOLOS_FLAG']] = isset($summary[$vote['FRACTION']][$vote['GOLOS_FLAG']]) ?
                $summary[$vote['FRACTION']][$vote['GOLOS_FLAG']] + 1 : 1;

            $summary['all'][$vote['GOLOS_FLAG']] = isset($summary['all'][$vote['GOLOS_FLAG']]) ?
                $summary['all'][$vote['GOLOS_FLAG']] + 1 : 1;

            $vote['GOLOS_FLAG'] = Aisszd2Peer::VOTE_FLAGS[$vote['GOLOS_FLAG']];
        }

        $result = [
            'voting_date' => $conference['DATE_ZAS'],
            'voting_time' => Misc::formatTime($voting['TIME_GOLOS_H'], $voting['TIME_GOLOS_M']),
            'voting_question' => $voting['TEMA_GOLOS'],
            'voting_type' => Aisszd2Peer::VOTING_TYPES[$voting['TIP_GOLOS']],
            'voting_number' => $voting['NUM_GOLOS'] > 0 ? $voting['NUM_GOLOS'] : 'не указан',
            'voting_result' => Aisszd2Peer::VOTING_RESULT[$voting['ID_RESULT_GOLOS']],
            'votes' => $votes,
            'summary' => $summary
        ];

        return $this->response($result);
    }

    /**
     * Записываем голосование
     *
     * @param sfWebRequest $request
     * @return string
     * @throws Exception
     * @throws PropelException
     */
    public function executeSetRemoteTranslationVoting(sfWebRequest $request)
    {

        $writeConnection = Propel::getConnection('public_api');

        $votingResults = $request->getPostParameter('params');
        $votingResultsArr = new PropelObjectCollection();
        $votingResultsArr->setModel('RemoteTranslationVoting');

        foreach ($votingResults as $questionId => $votingUsers) {
            foreach ($votingUsers as $userId => $votingUser) {
                $remoteTranslationVoting = new RemoteTranslationVoting();
                $remoteTranslationVoting->setDocumentId($questionId);
                $remoteTranslationVoting->setVotingGroup($votingUser['votingGroup']);
                $remoteTranslationVoting->setEmployeeId($userId);
                $remoteTranslationVoting->setResult($votingUser['result']);
                $remoteTranslationVoting->setTimeVoting($votingUser['time']);
                $votingResultsArr->append($remoteTranslationVoting);
            }
        }
        $votingResultsArr->save($writeConnection);
        return $this->response(json_encode($votingResults));
    }

    /**
     * Получаем результаты голосование
     *
     * @param sfWebRequest $request
     * @return string
     * @throws Exception
     * @throws PropelException
     */
    public function executeGetRemoteTranslationVoting(sfWebRequest $request)
    {
        $questionsId = $request->getParameter('questionsId');
        $questionsId = explode(',', $questionsId);
        $remoteTranslationVoting = [];
        foreach ($questionsId as $questionId) {
            $questionsVoting = RemoteTranslationVotingQuery::create()->findByDocumentId($questionId)->toArray();
            foreach ($questionsVoting as $voting) {
                if ($voting) {
                    $remoteTranslationVoting[$questionId][$voting['VotingGroup']][$voting['EmployeeId']]['id'] = $voting['Id'];
                    $remoteTranslationVoting[$questionId][$voting['VotingGroup']][$voting['EmployeeId']]['result'] = $voting['Result'];
                    $remoteTranslationVoting[$questionId][$voting['VotingGroup']][$voting['EmployeeId']]['employeeId'] = $voting['EmployeeId'];
                    $remoteTranslationVoting[$questionId][$voting['VotingGroup']][$voting['EmployeeId']]['documentId'] = $voting['DocumentId'];
                }
            }
        }
        return $this->response($remoteTranslationVoting);
    }

    public function executeGetSessionQuestionsId(sfWebRequest $request)
    {
        $sessionId = $request->getParameter('sessionId');

        $questionsId = RemoteTranslationQuestionQuery::create()
            ->select(['rtv.VotingGroup'])
            ->useRemoteTranslationQuery()
            ->filterByRegistrationId($sessionId)
            ->endUse()
            ->useRemoteTranslationVotingQuery('rtv', Criteria::LEFT_JOIN)
            ->filterById(null, Criteria::ISNOTNULL)
            ->groupByVotingGroup()
            ->endUse()
            ->find()
            ->toJSON();

        return $this->response($questionsId);
    }

    public function executeGetRemoteTranslationEmployee(sfWebRequest $request)
    {
        $params = json_decode($request->getParameter('params'));
        $employeeIds = RemoteTranslationVotingQuery::create()
            ->select(['EmployeeId'])
        ->filterByVotingGroup($params->questionId.'-'.$params->group)
        ->filterByResult($params->voting)
        ->find()
        ->toArray();

        $employee = EmployeeQuery::create()->select(['Id','Name'])->filterById($employeeIds)->find()->toArray();
        $question = RemoteTranslationQuestionQuery::create()->findOneById($params->questionId)->toArray();

        $voting = ['employee' => $employee, 'question' => $question, 'group' => $params->group];

        return $this->response(json_encode($voting));
    }

    public function executeGetQuestionFiles(sfWebRequest $request)
    {
        $questionId = $request->getPostParameter('questionId');
        $files = RemoteTranslationFileQuery::create()->findByQuestionId(json_decode($questionId));
        foreach ($files as $file) {
            if (null === $file->getUrlIsszd()) {
                $url = sfConfig::get('app_portal_domain').'/uploads/remote_translation/'.$questionId.'/'.$file->getDocumentName();
                $file->setUrlIsszd($url);
            }
        }
        $result = $files->toJSON();

        return $this->response($result);
    }
}