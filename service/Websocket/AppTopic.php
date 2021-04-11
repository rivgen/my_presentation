<?php

namespace App\Websocket\Topic;

use App\Entity\User;
use App\Utils\ApiClient;
use Gos\Bundle\WebSocketBundle\Client\ClientManipulatorInterface;
use Gos\Bundle\WebSocketBundle\Router\WampRequest;
use Gos\Bundle\WebSocketBundle\Server\Exception\FirewallRejectionException;
use Gos\Bundle\WebSocketBundle\Topic\SecuredTopicInterface;
use Gos\Bundle\WebSocketBundle\Topic\TopicInterface;
use Psr\Log\LoggerInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\Topic;
use Ratchet\Wamp\WampConnection;
use RuntimeException;

class AppTopic implements TopicInterface, SecuredTopicInterface
{
    private LoggerInterface $logger;
    private ClientManipulatorInterface $clientManipulator;
    private array $connectedUsers = [];
    private array $registeredUsers = [];
    private array $currentQuestion = [];
    private int $questionId = 0;
    private array $votingQuestion = [];
    private array $resaultVoting = [];
    private bool $votingStart = false;
    private bool $votingSend = false;
    private int $votingGroup = 0;
    private int $votingTime = 0;
    private array $speech = [];
    private array $manager = [];
    private int $timerStart = 0;
    private array $adminBtns = ['tribune' => true, 'member' => true];
    private ApiClient $client;

    public const SUBSCRIBE_EVENT = 1;
    public const UNSUBSCRIBE_EVENT = 2;
    public const QUESTION_CHANGE_EVENT = 3;
    public const RESET_TIMER = 4;
    public const STOP_TIMER = 5;
    public const CHANGED_MUTE_BTN = 6;
    public const SPEECH_REGISTRATION = 7;
    public const SPEECH_DELETE = 8;
    public const SPEECH_ALL_DELETE = 9;
    public const REGISTERED_GET_ALL = 10;
    public const MANAGER_REGISTRATION = 11;
    public const MANAGER_DELETE = 12;
    public const MANAGER_ALL_DELETE = 13;
    public const VOTING_START = 14;
    public const VOTING = 15;
    public const RESULT_VOTING = 16;
    public const VOTING_SAVE = 17;

    public function __construct(LoggerInterface $logger, ClientManipulatorInterface $clientManipulator, ApiClient $client)
    {
        $this->logger = $logger;
        $this->clientManipulator = $clientManipulator;
        $this->client = $client;
    }

    public function onSubscribe(ConnectionInterface $connection, Topic $topic, WampRequest $request): void
    {
        $user = $this->clientManipulator->getUser($connection);

        if (!$user instanceof User) {
            throw new RuntimeException('User is not valid. Check your session configuration!');
        }
        $registrationId = $user->getRegistrationId();
        if (null === $registrationId) {
            throw new RuntimeException('Registration cannot be null');
        }
        $this->addConnectedUser($registrationId, $user->getSuiId());
        if (!$connection instanceof WampConnection) {
            throw new RuntimeException('Connection class must be instance of WampConnection');
        }
        if ($this->votingQuestion === []) {
            $questionsId = json_decode($this->client->getSessionQuestionsId(['sessionId' => $registrationId]));
            foreach ($questionsId as $questionId) {
                $questionId = explode('-', $questionId);
                $this->votingSend = true;
                $this->votingStart = false;
                $this->votingGroup = (int) $questionId[1];
                $this->votingQuestion[$questionId[0]]['votingGroup_'.$questionId[1]] = $this->eventVotingStart();
                $this->votingSend = false;
            }
        }
        // Notify about new user
        $topic->broadcast([
            'msg' => $user->getUsername().' has joined '.$topic->getId(),
            'users' => $this->connectedUsers,
            'question' => $this->currentQuestion,
            'votingStart' => $this->eventVotingStart(),
            'votingQuestion' => $this->votingQuestion,
            'event_name' => self::SUBSCRIBE_EVENT,
            'timer_sec' => ($this->timerStart <= 0) ? $this->timerStart : (time() - $this->timerStart),
            'registered_users' => $this->registeredUsers,
            'admin_btns' => $this->adminBtns,
            'detail' => $this->eventALLDetails(),
        ]);
    }

    public function onUnSubscribe(ConnectionInterface $connection, Topic $topic, WampRequest $request): void
    {
        $token = $this->clientManipulator->getClient($connection);
        $user = $token->getUser();
        if (!$user instanceof User) {
            throw new RuntimeException('User is not valid. Check your session configuration!');
        }

        if (!$connection instanceof WampConnection) {
            throw new RuntimeException('Connection class must be instance of WampConnection');
        }
        $registrationId = $user->getRegistrationId();
        if (null === $registrationId) {
            throw new RuntimeException('Registration cannot be null');
        }
        $this->removeConnectedUser($registrationId, $user->getSuiId());
        // Notify that user disconnect
        $topic->broadcast(
            [
                'msg' => $user->getUsername().' has left '.$topic->getId(),
                'users' => $this->connectedUsers,
                'registered_users' => $this->registeredUsers,
                'event_name' => self::UNSUBSCRIBE_EVENT,
            ]
        );
    }

    public function onPublish(
        ConnectionInterface $connection,
        Topic $topic,
        WampRequest $request,
        $event,
        array $exclude,
        array $eligible
    ): void {
        if (self::QUESTION_CHANGE_EVENT === $event['event_name']) {
            $this->currentQuestion = $event['question'];
            $this->questionId = $event['question']['questionId'];
            $this->votingGroup = !empty($this->votingQuestion[$event['question']['questionId']]) ? count($this->votingQuestion[$event['question']['questionId']]) : 1;
            $event['votingQuestion'] = $this->votingQuestion;
            $event['votingStart'] = $this->votingQuestion[$event['question']['questionId']]['votingGroup_'.$this->votingGroup] ?? '';
        }

        if (self::RESET_TIMER === $event['event_name']) {
            $this->timerStart = time();
        }

        if (self::STOP_TIMER === $event['event_name']) {
            if ($this->timerStart >= 0) {
                $this->timerStart = -1 * (time() - $this->timerStart);
            }
        }

        if (self::CHANGED_MUTE_BTN === $event['event_name']) {
            $this->adminBtns[$event['player']] = !$this->adminBtns[$event['player']];
        }

        if (self::SPEECH_REGISTRATION === $event['event_name']) {
            $this->speech[$event['speech']['sender']] = $event['speech'];
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::MANAGER_REGISTRATION === $event['event_name']) {
            $this->manager[$event['manager']['sender']] = $event['manager'];
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::SPEECH_DELETE === $event['event_name']) {
            foreach ($this->speech as $key => &$speech) {
                if ($key == $event['speech']['sender']) {
                    $speech['delete'] = true;
                }
            }
            unset($speech);
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::MANAGER_DELETE === $event['event_name']) {
            foreach ($this->manager as $key => &$manager) {
                if ($key == $event['manager']['sender']) {
                    $manager['delete'] = true;
                }
            }
            unset($manager);
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::SPEECH_ALL_DELETE === $event['event_name']) {
            foreach ($this->speech as $key => &$speech) {
                if (array_key_exists($key, $event['speech'])) {
                    $speech['delete'] = true;
                }
            }
            unset($speech);
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::MANAGER_ALL_DELETE === $event['event_name']) {
            foreach ($this->manager as $key => &$manager) {
                if (array_key_exists($key, $event['manager'])) {
                    $manager['delete'] = true;
                }
            }
            unset($manager);
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::REGISTERED_GET_ALL === $event['event_name']) {
            $event['detail'] = $this->eventALLDetails();
        }

        if (self::VOTING_START === $event['event_name']) {
            $this->votingStart = $event['votingStart']['start'];
            $event['votingStart']['time'] ? $this->votingTime = $event['votingStart']['time'] : $event['votingStart']['time'] = $this->votingTime;
            $event['question'] = $this->questionId;
            if ($this->votingStart) {
                $this->votingSend = false;
                ++$this->votingGroup;
            }
            $this->votingQuestion[$this->questionId]['votingGroup_'.$this->votingGroup] = $this->eventVotingStart();
            $event['votingQuestion'] = $this->votingQuestion;
        }

        if (self::RESULT_VOTING === $event['event_name']) {
            $this->resaultVoting[$event['votingResult']['questionId']][$event['votingResult']['sender']] = [
                'name' => $event['votingResult']['name'],
                'result' => $event['votingResult']['result'],
                'time' => $event['votingResult']['time'],
                'votingGroup' => implode('-', [$event['votingResult']['questionId'], $this->votingGroup]),
            ];

            $event['votingResult'] = $this->resaultVoting;
        }

        if (self::VOTING_SAVE === $event['event_name']) {
            $result = $this->client->setRemoteTranslationVoting($this->resaultVoting);
            $event['votingResult'] = $result;
            $this->votingSend = $event['save'];
            foreach ($this->resaultVoting as $key => $voting) {
                $this->votingGroup = count($this->votingQuestion[$key]);
                $this->votingQuestion[$key]['votingGroup_'.$this->votingGroup]['save'] = $this->votingSend;
            }

            $this->resaultVoting = [];
        }

        $topic->broadcast($event);
    }

    /**
     * @return array $detail
     */
    private function eventALLDetails()
    {
        $detail = ['speech' => $this->speech, 'manager' => $this->manager];

        return $detail;
    }

    /**
     * @return array $detail
     */
    private function eventVotingStart()
    {
        $detail = ['start' => $this->votingStart, 'time' => $this->votingTime, 'save' => $this->votingSend, 'votingGroup' => $this->votingGroup];

        return $detail;
    }

    public function secure(
        ?ConnectionInterface $conn,
        Topic $topic,
        WampRequest $request,
        $payload = null,
        ?array $exclude = [],
        array $eligible = null,
        string $provider = null
    ): void {
        if ($request->getAttributes()->has('denied')) {
            throw new FirewallRejectionException('Access denied');
        }
    }

    public function getName(): string
    {
        return 'app.topic';
    }

    private function addConnectedUser(?int $registrationId, int $userSuiId): void
    {
        if (!isset($this->connectedUsers[$registrationId])) {
            $this->connectedUsers += [$registrationId => []];
        }

        if (!isset($this->registeredUsers[$registrationId])) {
            $this->registeredUsers += [$registrationId => []];
        }
        if (!in_array($userSuiId, $this->connectedUsers[$registrationId])) {
            $this->connectedUsers[$registrationId][] = $userSuiId;
        }

        if (!in_array($userSuiId, $this->registeredUsers[$registrationId])) {
            $this->registeredUsers[$registrationId][] = $userSuiId;
        }

        $this->connectedUsers[$registrationId] = array_values($this->connectedUsers[$registrationId]);
        $this->registeredUsers[$registrationId] = array_values($this->registeredUsers[$registrationId]);
    }

    private function removeConnectedUser(int $registrationId, int $userSuiId): void
    {
        if (false !== ($key = array_search($userSuiId, $this->connectedUsers[$registrationId]))) {
            unset($this->connectedUsers[$registrationId][$key]);
        }

        $this->connectedUsers[$registrationId] = array_values($this->connectedUsers[$registrationId]);
    }
}
