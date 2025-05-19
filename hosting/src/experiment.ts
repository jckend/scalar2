/* eslint-disable @typescript-eslint/naming-convention */
import externalHtml from '@jspsych/plugin-external-html'
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response'
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response'
import jsPsychHtmlSliderResponse from '@jspsych/plugin-html-slider-response'
import jsPsychImageKeyboardResponse from '@jspsych/plugin-image-keyboard-response'
import jsPsychPreload from '@jspsych/plugin-preload'
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
    show_progress_bar: true,
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

    /* consent */
  const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
    <div style="margin-left: 200px; margin-right: 200px; text-align: left;">
      <b><p style="margin-bottom: 20px;">Please consider this information carefully before deciding whether to participate in this research.</p></b>
      
      <p style="margin-bottom: 20px;">The purpose of this research is to examine which factors influence linguistic meaning. You will be asked to make judgements about the meaning of sentences in different scenarios. We are simply interested in your judgement. The study will take less than 1 hour to complete, and you will receive less than $20 on Prolific. Your compensation and time commitment are specified in the study description. There are no anticipated risks associated with participating in this study. The effects of participating should be comparable to those you would ordinarily experience from viewing a computer monitor and using a mouse or keyboard for a similar amount of time. At the end of the study, we will provide an explanation of the questions that motivate this line of research and will describe the potential implications.</p>
      
      <p style="margin-bottom: 20px;"margin-bottom: 50px;>Your participation in this study is completely voluntary and you may refuse to participate or you may choose to withdraw at any time without penalty or loss of benefits to you which are otherwise entitled. Your participation in this study will remain confidential. No personally identifiable information will be associated with your data. Also, all analyses of the data will be averaged across all the participants, so your individual responses will never be specifically analyzed.</p>
      
      <p style="margin-bottom: 20px;">If you have questions or concerns about your participation or payment, or want to request a summary of research findings, please contact Dr. Jonathan Phillips at <a href="mailto:Jonathan.S.Phillips@dartmouth.edu">Jonathan.S.Phillips@dartmouth.edu</a>.</p>
      
      <p style="margin-bottom: 20px;">Please save a copy of this form for your records.</p>
      
      <h3><b>Agreement:</b></h3>
      
      <p>The nature and purpose of this research have been sufficiently explained and I agree to participate in this study. I understand that I am free to withdraw at any time without incurring any penalty. Please consent by clicking the button below to continue. Otherwise, please exit the study at any time.</p>
    </div>
  `,
    choices: ['Submit'],
    //this specifies the way in which the data will be configured inside jspsych data variable...
    data: {
      internal_type: 'consent',
      trial_name: 'consent',
    },
  }
  timeline.push(consent)


  /* define instructions trial */
  const instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>In this experiment, you be given a description of a context.</p>
<p>You will first be asked to make a judgment about the likelihood of an event.</p>
<p>You will then be asked to judge how odd you find a sentence in the context.</p> 
<p>In all examples, assume that the speaker is honest and has no incentive deceive you.</p>
<p>Press any key to begin.</p>
    `,
    post_trial_gap: 2000,
  }
  timeline.push(instructions)

  /* define trial stimuli array for timeline variables */
  const test_stimuli: Record<string, string>[] = [
    { stimulus1: 'Cleo throws 10 marbles into a swimming pool.',  prompt1: 'How likely is it that all the marbles sank?', stimulus2: '<p>Cleo throws 10 marbles into a swimming pool. Her friend tells you: Some of the marbles sank.</p>'},
    { stimulus1: 'Cleo throws 10 marbles into a sandbox.', prompt1: 'How likely is it that all the marbles sank?', stimulus2: '<p>Cleo throws 10 marbles into a sandbox. Her friend tells you: Some of the marbles sank.</p>'},
    { stimulus1: 'Troy threw 5 wine glasses off the Empire State Building.', prompt1: 'How likely is it that all the glasses broke?', stimulus2: '<p>Troy threw 5 wine glasses off the Empire State Building. His friend tells you: Most of the glasses broke.</p>'},
    { stimulus1: 'Troy dropped 5 wine glasses at the party.', prompt1: 'How likely is it that all the glasses broke?', stimulus2: '<p>Troy dropped 5 wine glasses at the party. His friend tells you: Most of the glasses broke.</p>'},
    { stimulus1: 'Noah has missed class so often that he’s been declared truant.', prompt1: 'How likely is it that he came to class everyday this month?', stimulus2: '<p>Noah has missed class so often that he’s been declared truant. His friend tells you: Noah sometimes comes to class.</p>'},
    { stimulus1: 'Noah won an award for having the best attendance in his school', prompt1: 'How likely is it that he came to class everyday this month?', stimulus2: '<p>Noah won an award for having the best attendance in his school. His friend tells you: Noah sometimes comes to class.</p>'},
    { stimulus1: 'Jamie is very disorganized and frequently oversleeps.', prompt1: 'How likely is it that she will be on time to an appointment?', stimulus2: '<p>Jamie is very disorganized and frequently oversleeps. Her friend tells you: Jamie is occasionally on time.</p>'},
    { stimulus1: 'Jamie is very organized and punctual.', prompt1: 'How likely is it that she will be on time to an appointment?', stimulus2: '<p>Jamie is very organized and punctual. Her friend tells you: Jamie is occasionally on time.</p>'},
    { stimulus1: 'Joe thrusts his hand into a pot of boiling water.', prompt1: 'How likely is it that the water is scalding?', stimulus2: '<p>Joe thrusts his hand into a pot of boiling water. His friend tells you: The water is warm.</p>'},
    { stimulus1: 'Joe thrusts his hand into a bowl of steaming soup.', prompt1: 'How likely is it that the soup is scalding?', stimulus2: '<p>Joe thrusts his hand into a bowl of steaming soup. His friend tells you: The soup is warm.</p>'},
    { stimulus1: 'Alice got a shirt from a clothing giveaway.', prompt1: 'How likely is it that the shirt was free?', stimulus2: '<p>Alice got a shirt from a clothing giveaway. Her friend tells you: The shirt was cheap.</p>'},
    { stimulus1: 'Alice got a shirt from a clothing store.', prompt1: 'How likely is it that the shirt was free?', stimulus2: '<p>Alice got a shirt from a clothing store. Her friend tells you: The shirt was cheap.</p>'},
    { stimulus1: 'James ate at a restaurant with two stars on Yelp.', prompt1: 'How likely is it that the food was good?', stimulus2: '<p>James ate a restaurant with five stars on Yelp. His friend tells you: The food was palatable.</p>'},
    { stimulus1: 'James ate at a restaurant with five stars on Yelp.', prompt1: 'How likely is it that the food was good?', stimulus2: '<p>James ate a restaurant with five stars on Yelp. His friend tells you: The food was palatable.</p>'},
    { stimulus1: 'Claire is struggling in calculus.', prompt1: 'How likely is it that Claire did really well on her midterm?', stimulus2: '<p>Claire is struggling in calculus. Her friend tells you: She got an okay grade on the midterm.</p>'},
    { stimulus1: 'Claire is excelling in calculus.', prompt1: 'How likely is it that Claire did really well on her midterm?', stimulus2: '<p>Claire is excelling in calculus. Her friend tells you: She got an okay grade on the midterm.</p>'},

  ]
  
  /* define test trials */
  const test1 = {
    type: jsPsychHtmlSliderResponse,
    stimulus: () => {
    return jsPsych.evaluateTimelineVariable('stimulus1') + " " + jsPsych.evaluateTimelineVariable('prompt1');
    },          
    labels: ['0%', '50%','100%'],
    slider_width: 500,
    require_movement: true, 
    on_finish: function (data: TrialData) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, unicorn/no-null
      data.saveIncrementally = true
    },
  }

  const test2 = {
    type: jsPsychHtmlSliderResponse,
    stimulus: () => {
    return jsPsych.evaluateTimelineVariable('stimulus2') + "<p>How odd do you find the friend's statement?</p>";
    },          
    labels: ["very odd", "somewhat odd", "neutral", "somewhat natural", "very natural"],
    slider_width: 500,
    require_movement: true, 
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
