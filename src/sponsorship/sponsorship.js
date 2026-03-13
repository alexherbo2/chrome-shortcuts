const verificationURIElement = document.getElementById('verificationURI')
const userCodeElement = document.getElementById('userCode')
const deviceFlowCompletedCheckbox = document.getElementById('deviceFlowCompleted')
const sponsorFlowCompletedCheckbox = document.getElementById('sponsorFlowCompleted')
const spinnerElement = document.getElementById('spinner')

const sponsorFlowCompletedPopover = document.getElementById('sponsor-flow-completed-popover')
const sponsorFlowErrorPopover = document.getElementById('sponsor-flow-error-popover')
const sponsorFlowErrorDetails = document.getElementById('sponsor-flow-error-details')

const buttonElements = document.querySelectorAll('button')

const sponsorFlowStartedAbortController = new AbortController

const port = chrome.runtime.connect({
  name: 'sponsorship'
})

port.onMessage.addListener((message) => {
  switch (message.type) {
    case 'userCode':
      verificationURIElement.textContent = message.verificationURI
      verificationURIElement.href = message.verificationURI
      userCodeElement.textContent = message.userCode
      deviceFlowCompletedCheckbox.checked = false
      sponsorFlowCompletedCheckbox.checked = false
      spinnerElement.dataset.paused = 'false'
      sponsorFlowStartedAbortController.abort(
        'Sponsor flow started',
      )
      break

    case 'deviceFlowCompleted':
      deviceFlowCompletedCheckbox.checked = true
      break

    case 'sponsorFlowCompleted':
      sponsorFlowCompletedCheckbox.checked = true
      spinnerElement.dataset.paused = 'true'
      showSponsorFlowCompleted()
      break

    case 'sponsorFlowAborted':
      spinnerElement.dataset.paused = 'true'
      showSponsorFlowError(message.reason)
      break

    case 'keepAlive':
      break

    default:
      port.postMessage({
        type: 'error',
        message: 'Unknown request'
      })
  }
})

for (const buttonElement of buttonElements) {
  const actionName = buttonElement.dataset.action

  switch (actionName) {
    case 'startSponsorFlow':
      buttonElement.addEventListener('click', startSponsorFlow)
      break

    default:
      console.error(
        'Unknown action: "%s"',
        actionName,
      )
  }
}

window.addEventListener(
  'hashchange',
  () => {
    switch (window.location.hash) {
      case '#sign_in_with_github_to_verify_your_sponsorship':
        startSponsorFlow()
        break
    }
  },
  {
    signal: sponsorFlowStartedAbortController.signal,
  },
)

function startSponsorFlow() {
  port.postMessage({
    type: 'startSponsorFlow',
  })
}

function showSponsorFlowCompleted() {
  sponsorFlowCompletedPopover.showPopover()
}

function showSponsorFlowError(errorDetails) {
  sponsorFlowErrorDetails.textContent = errorDetails
  sponsorFlowErrorPopover.showPopover()
}

switch (window.location.hash) {
  case '#sign_in_with_github_to_verify_your_sponsorship':
    startSponsorFlow()
    break
}
