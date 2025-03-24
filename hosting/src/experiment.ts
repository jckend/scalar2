/* eslint-disable @typescript-eslint/naming-convention */

import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response'
import jsPsychHtmlSliderResponse from '@jspsych/plugin-html-slider-response'
import jsPsychImageKeyboardResponse from '@jspsych/plugin-image-keyboard-response'
import jsPsychPreload from '@jspsych/plugin-preload'
import jsPsychSurveyLikert from '@jspsych/plugin-survey-likert'
import { initJsPsych } from 'jspsych'

import { debugging, getUserInfo, mockStore, prolificCC, prolificCUrl } from './globalVariables'
import { saveTrialDataComplete, saveTrialDataPartial } from './lib/databaseUtils'

import type { SaveableDataRecord } from '../types/project'
import type { DataCollection } from 'jspsych'

/* Alternatively
 * type JsPsychInstance = ReturnType<typeof initJsPsych>
 * type JsPsychGetData = JsPsychInstance['data']['get']
 * export type JsPsychDataCollection = ReturnType<JsPsychGetData>
 */

const debug = debugging()
const mock = mockStore()

type Task = 'response' | 'fixation'
type Response = 'left' | 'right'
type KeyboardResponse = 'f' | 'j'

interface TrialData {
  task: Task
  response: Response
  correct: boolean
  correct_response: Response
  saveIncrementally: boolean
}

const debuggingText = debug ? `<br /><br />redirect link : ${prolificCUrl}` : '<br />'
const exitMessage = `<p class="text-center align-middle">
Please wait. You will be redirected back to Prolific in a few moments.
<br /><br />
If not, please use the following completion code to ensure compensation for this study: ${prolificCC}
${debuggingText}
</p>`

const exitExperiment = (): void => {
  document.body.innerHTML = exitMessage
  setTimeout(() => {
    globalThis.location.replace(prolificCUrl)
  }, 3000)
}

const exitExperimentDebugging = (): void => {
  const contentDiv = document.querySelector('#jspsych-content')
  if (contentDiv) contentDiv.innerHTML = exitMessage
}

export async function runExperiment(updateDebugPanel: () => void): Promise<void> {
  if (debug) {
    console.log('--runExperiment--')
    console.log('UserInfo ::', getUserInfo())
  }

  /* initialize jsPsych */
  const jsPsych = initJsPsych({
    on_data_update: function (trialData: TrialData) {
      if (debug) {
        console.log('jsPsych-update :: trialData ::', trialData)
      }
      // if trialData contains a saveIncrementally property, and the property is true, then save the trialData to Firestore immediately (otherwise the data will be saved at the end of the experiment)
      if (trialData.saveIncrementally) {
        saveTrialDataPartial(trialData as unknown as SaveableDataRecord).then(
          () => {
            if (debug) {
              console.log('saveTrialDataPartial: Success') // Success!
              if (mock) {
                updateDebugPanel()
              }
            }
          },
          (error: unknown) => {
            console.error(error) // Error!
          },
        )
      }
    },
    on_finish: (data: DataCollection) => {
      const contentDiv = document.querySelector('#jspsych-content')
      if (contentDiv) contentDiv.innerHTML = '<p> Please wait, your data are being saved.</p>'
      saveTrialDataComplete(data.values()).then(
        () => {
          if (debug) {
            exitExperimentDebugging()
            console.log('saveTrialDataComplete: Success') // Success!
            console.log('jsPsych-finish :: data ::')
            console.log(data)
            setTimeout(() => {
              jsPsych.data.displayData()
            }, 3000)
          } else {
            exitExperiment()
          }
        },
        (error: unknown) => {
          console.error(error) // Error!
          exitExperiment()
        },
      )
    },
  })

  /* create timeline */
  const timeline: Record<string, unknown>[] = []

  /* define welcome message trial */
  const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<span class="text-xl">Welcome to the experiment. Press any key to begin.</span>',
  }
  timeline.push(welcome)

  /* define instructions trial */
  const instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>In this experiment, you be given a description of a context.</p>
<p>You will first be asked to make a judgment about the likelihood of an event.</p>
<p>You will then be asked to make sense of a statement given the description of a context.</p> 
<p>In all examples, assume that the speaker is honest and has no incentive decieve you.</p>
<p>Press any key to begin.</p>
    `,
    post_trial_gap: 2000,
  }
  timeline.push(instructions)

  /* define trial stimuli array for timeline variables */
  const test_stimuli: Record<string, string, string, string>[] = [
    { stimulus1: '<p>Cleo throws 10 marbles into a swimming pool.</p>', stimulus2: '<p>Cleo throws 10 marbles into a swimming pool. Her friend tells you: Some of the marbles sank.</p>', prompt1: '<p>How likely is it that all the marbles sank?</p>'},
    { stimulus1: '<p>Cleo throws 10 marbles into a sand box.</p>', stimulus2: '<p>John throws 10 marbles into a sand box. Her friend tells you: Some of the marbles sank.</p>', prompt1: '<p>How likely is it that all the marbles sank?</p>'},
    { stimulus1: '<p>Troy threw 5 wine glasses off the Empire State Building.</p>', stimulus2: '<p>Troy threw 5 wine glasses off the Empire State Building. His friend tells you: Most of the glasses broke.</p>', prompt1: '<p>How likely is it that all the glasses broke?</p>'},
    { stimulus1: '<p>Troy dropped 5 wine glasses at the party.</p>', stimulus2: '<p>Troy dropped 5 wine glasses at the party. His friend tells you: Most of the glasses broke.</p>', prompt1: '<p>How likely is it that all the glasses broke?</p>'},
    { stimulus1: '<p>Joe thrusts his hand into a pot of boiling water.</p>', stimulus2: '<p>Joe thrusts his hand into a pot of boiling water. His friend tells you: The water is warm.</p>', prompt1: '<p>How likely is it that the water is scalding?</p>'},
    { stimulus1: '<p>Joe thrusts his hand into a bowl of steaming soup.</p>', stimulus2: '<p>Joe thrusts his hand into a bowl of steaming soup. His friend tells you: The soup is warm.</p>', prompt1: '<p>How likely is it that the soup is scalding?</p>'},
    { stimulus1: '<p>Alice got a shirt from a clothing giveaway.</p>', stimulus2: '<p>Alice got a shirt from a clothing giveaway. Her friend tells you: The shirt was cheap.</p>', prompt1: '<p>How likely is it that the shirt was free?</p>'},
    { stimulus1: '<p>Alice got a shirt from a clothing store.</p>', stimulus2: '<p>Alice got a shirt from a clothing store. Her friend tells you: The shirt was cheap.</p>', prompt1: '<p>How likely is it that the shirt was free?</p>'},
    { stimulus1: '<p>James ate a restaurant with two stars on Yelp.</p>', stimulus2: '<p>James ate a restaurant with five stars on Yelp. His friend tells you: The food was palatable.</p>', prompt1: '<p>How likely is it that the food was good?</p>'},
    { stimulus1: '<p>James ate a restaurant with five stars on Yelp.</p>', stimulus2: '<p>James ate a restaurant with five stars on Yelp. His friend tells you: The food was palatable.</p>', prompt1: '<p>How likely is it that the food was good?</p>'},
    { stimulus1: '<p>Claire is struggling in calculus.</p>', stimulus2: '<p>Claire is struggling in calculus. Her friend tells you: She got an okay grade on the midterm.</p>', prompt1: '<p>How likely is it that Claire did really well?</p>'},
    { stimulus1: '<p>Claire is excelling in calculus.</p>', stimulus2: '<p>Claire is excelling in calculus. Her friend tells you: She got an okay grade on the midterm.</p>', prompt1: '<p>How likely is it that Claire did really well?</p>'},
  ]
  
  /* define test trials */
  const test1 = {
    type: jsPsychHtmlSliderResponse,
    stimulus: jsPsych.timelineVariable('stimulus1') as unknown as string,
    questions: [
      {
        prompt: jsPsych.timelineVariable('prompt1') as unknown as string,
        labels: ['0%', '50%','100%'],
      }],
    slider_width: 500,
    on_finish: function (data: TrialData) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, unicorn/no-null
      data.saveIncrementally = true
    },
  }

  const test2 = {
    type: jsPsychSurveyLikert,
    preamble: jsPsych.timelineVariable('stimulus2') as unknown as string,
    questions: [
      {
        prompt: "<p>Do you agree with the friend's statement?</p>", 
        labels: ["strong disagree", "disagree", "neutral", "agree", "strongly agree"],
      }
      ],
    on_finish: function (data: TrialData) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, unicorn/no-null
      data.saveIncrementally = true
    },
  }

  /* define test procedure */
  const test_procedure = {
    timeline: [test1,test2],
    timeline_variables: test_stimuli,
    repetitions: 1,
    randomize_order: true,
  }
  timeline.push(test_procedure)

  /* define debrief */
  const debrief_block = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      return `
          <p>Press any key to complete the experiment. Thank you!</p>`
    },
  }
  timeline.push(debrief_block)

  /* start the experiment */
  // @ts-expect-error allow timeline to be type jsPsych TimelineArray
  await jsPsych.run(timeline)
}
