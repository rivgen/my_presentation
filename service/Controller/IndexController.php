<?php

namespace App\Controller;

use App\Entity\User;
use App\Model\Registration;
use App\Utils\ApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class IndexController extends AbstractController
{
    private array $votingResults = [];

    /**
     * @Route("/", name="index")
     */
    public function index(): Response
    {
        if ($this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('admin');
        } else {
            return $this->redirectToRoute('user');
        }
    }

    /**
     * @Route("/user", name="user")
     */
    public function user(ApiClient $client): Response
    {
        return $this->defaultAction($client, 'index/user.html.twig');
    }

    /**
     * @Route("/admin", name="admin")
     */
    public function admin(ApiClient $client): Response
    {
        return $this->defaultAction($client, 'index/index.html.twig');
    }

    /**
     * @Route("/registration-speech", name="registration_speech")
     */
    public function showRegistrationSpeech(): Response
    {
        date_default_timezone_set('Europe/Moscow');

        return $this->render(
            'index/registrationSpeech.html.twig', [
                'timeNow' => round(microtime(true) * 1000),
                'dateNow' => date('Y-m-d'),
            ]
        );
    }

    /**
     * @Route("/remote-translation-voting-results", name="remote_translation_voting_results")
     */
    public function showRemoteTranslationVotingResults(ApiClient $client, Request $request): Response
    {
        $this->resultsVoting($client);

        if (0 === strpos($request->headers->get('Content-Type') ?? '', 'application/json')) {
            $data = json_decode((string) $request->getContent(), true);
            $votingResult['result'] = $this->votingResults[$data['questionId']]['voting_result'][$data['questionId'].'-'.$data['index']];
            $votingResult['question'] = $this->votingResults[$data['questionId']]['voting_question'];

            return new JsonResponse(json_encode($votingResult));
        }

        return $this->render(
            'index/voting_results/remoteTranslationVotingResults.html.twig',
            [
                'results' => $this->votingResults,
            ]
        );
    }

    /**
     * @Route("/remote-translation-voting-employee", name="remote_translation_voting_employee")
     */
    public function showRemoteTranslationVotingEmployee(ApiClient $client, Request $request): Response
    {
        $params = $request->getContent();
        $result = $client->getRemoteTranslationEmployee((string) $params);

        return new JsonResponse($result);
    }

    /**
     * @Route("/voting-results", name="voting_results")
     */
    public function showVotingResults(ApiClient $client): Response
    {
        return $this->render(
            'index/voting_results/votingResults.html.twig',
            [
                'results' => $client->getVotingResults(),
            ]
        );
    }

    /**
     * @Route("/show-voting-details", name="show_voting_details")
     */
    public function showVotingDetails(
        ApiClient $client,
        Request $request
    ): Response {
        return $this->render(
            'index/voting_results/votingDetails.html.twig',
            [
                'item' => $client->getVotingDetailsById($request->query->all()),
            ]
        );
    }

    /**
     * @Route("/show-question-files", name="show_question_files")
     */
    public function showQuestionFiles(ApiClient $client, Request $request): Response
    {
        $id = $request->getContent();
        $result = $client->getQuestionFiles((string) $id);

        return new JsonResponse($result);
    }

    /**
     * @return Registration|null
     */
    private function getRegistration(ApiClient $client)
    {
        $selectedRegistration = null;

        if (!($user = $this->getUser()) instanceof User) {
            throw new \LogicException('User must be instance of '.User::class.' class');
        }

        foreach ($client->getRegistrations() as $registration) {
            if ($registration->getId() === $user->getRegistrationId()) {
                /** @var Registration $selectedRegistration */
                $selectedRegistration = $registration;
            }
        }

        return $selectedRegistration;
    }

    private function defaultAction(ApiClient $client, string $templatePath): Response
    {
        $selectedRegistration = $this->getRegistration($client);
        if (null === $selectedRegistration) {
            return $this->redirectToRoute('logout');
        }
        $hasVote = '';

        if (!($user = $this->getUser()) instanceof User) {
            throw new \LogicException('User must be instance of '.User::class.' class');
        }
        $participants = $selectedRegistration->getParticipants();
        foreach ($participants as $participant) {
            if ($participant->getId() === $user->getSuiId()) {
                $hasVote = $participant->getRole();
            }
        }

        return $this->render(
            $templatePath,
            [
                'registration' => $selectedRegistration,
                'hasVote' => $hasVote,
            ]
        );
    }

    /**
     * @return bool|\Symfony\Component\HttpFoundation\RedirectResponse
     */
    private function resultsVoting(ApiClient $client)
    {
        $registrationClient = $this->getRegistration($client);
        if (null === $registrationClient) {
            return $this->redirectToRoute('logout');
        }
        $questions = $registrationClient->getTranslation()->getQuestions();
        $questionsId = [];
        foreach ($questions as $question) {
            $questionsId[] = $question->getId();
        }
        $remoteTranslationVotingResults = $client->getRemoteTranslationVotingResults(['questionsId' => implode(',', $questionsId)]);
        $countRegistrationClient = count($registrationClient->getParticipants());
        foreach ($questions as $question) {
            if (array_key_exists($question->getId(), $remoteTranslationVotingResults)) {
                $this->votingResults[$question->getId()]['voting_question'] = $question->getQuestion();
                $this->votingResults[$question->getId()]['voting_question_id'] = $question->getId();
                foreach ($remoteTranslationVotingResults[$question->getId()] as $group => $votingGroups) {
                    $agree = 0;
                    $disagree = 0;
                    $ignore = 0;
                    $countClientVoting = count($remoteTranslationVotingResults[$question->getId()][$group]);
                    foreach ($votingGroups as $voting) {
//                    за
                        if (1 == $voting['result']) {
                            ++$agree;
                        }
//                    против
                        if (2 == $voting['result']) {
                            ++$disagree;
                        }
//                    воздержался
                        if (3 == $voting['result']) {
                            ++$ignore;
                        }
                    }
                    $this->votingResults[$question->getId()]['voting_result'][$group]['votes_agree'] = $agree;
                    $this->votingResults[$question->getId()]['voting_result'][$group]['voting_disagree'] = $disagree;
                    $this->votingResults[$question->getId()]['voting_result'][$group]['votes_ignore'] = $ignore;
                    $this->votingResults[$question->getId()]['voting_result'][$group]['votes_neutral'] = $countRegistrationClient - $countClientVoting;
                }
            }
        }

        return true;
    }
}
