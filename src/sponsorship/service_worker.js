const KEEP_ALIVE_INTERVAL = 29000

const API_REQUEST_INTERVAL = 5000
const API_REQUEST_TIMEOUT = 900_000

function onConnect(port, cx) {
  const abortController = new AbortController
  const abortSignal = AbortSignal.any([
    abortController.signal,
    AbortSignal.timeout(API_REQUEST_TIMEOUT),
  ])

  const keepAliveIntervalId = setInterval(() => {
    port.postMessage({
      type: 'keepAlive'
    })
  }, KEEP_ALIVE_INTERVAL)

  port.onDisconnect.addListener((port) => {
    onDisconnect(
      port,
      abortController,
      keepAliveIntervalId,
    )
  })

  port.onMessage.addListener((message, port) => {
    onMessage(
      message,
      port,
      abortSignal,
      cx,
    )
  })
}

async function onDisconnect(
  port,
  abortController,
  keepAliveIntervalId,
) {
  abortController.abort(
    'Sponsorship page closed',
  )
  clearInterval(keepAliveIntervalId)
}

async function onMessage(
  message,
  port,
  signal,
  cx,
) {
  switch (message.type) {
    case 'startSponsorFlow':
      startSponsorFlow(
        port,
        signal,
        cx,
      ).catch(
        showSponsorFlowError.bind(null, port)
      )
      break

    default:
      port.postMessage({
        type: 'error',
        message: 'Unknown request'
      })
  }
}

async function startSponsorFlow(
  port,
  signal,
  cx,
) {
  const deviceCode = await requestDeviceCode({
    clientId: cx.clientId,
    signal,
  })

  port.postMessage({
    type: 'userCode',
    userCode: deviceCode.user_code,
    verificationURI: deviceCode.verification_uri,
  })

  const accessToken = await pollForToken({
    clientId: cx.clientId,
    deviceCode: deviceCode.device_code,
    interval: deviceCode.interval * 1000,
    signal,
  })

  cx.onDeviceFlowCompleted({
    accessToken: accessToken.access_token,
  })

  port.postMessage({
    type: 'deviceFlowCompleted',
  })

  await pollForSponsorship({
    accessToken: accessToken.access_token,
    maintainerLogins: cx.maintainerLogins,
    interval: API_REQUEST_INTERVAL,
    signal,
  })

  cx.onSponsorFlowCompleted()

  port.postMessage({
    type: 'sponsorFlowCompleted',
  })
}

async function requestDeviceCode({
  clientId,
  signal,
}) {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
    }),
    signal,
  })
  if (!response.ok) {
    throw new Error(
      `Response status: ${response.status}`,
    )
  }
  return response.json()
}

async function pollForToken({
  clientId,
  deviceCode,
  interval,
  signal,
}) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
    signal,
  })
  if (!response.ok) {
    throw new Error(
      `Response status: ${response.status}`,
    )
  }
  const data = await response.json()
  if (data.error) {
    switch (data.error) {
      case 'authorization_pending':
        await new Promise((resolve) => {
          setTimeout(resolve, interval)
        })
        return pollForToken({
          clientId,
          deviceCode,
          interval,
          signal,
        })

      case 'slow_down':
        await new Promise((resolve) => {
          setTimeout(resolve, data.interval * 1000)
        })
        return pollForToken({
          clientId,
          deviceCode,
          interval,
          signal,
        })

      case 'access_denied':
        throw new Error(
          `access_denied: ${data.error_description}`,
        )

      case 'expired_token':
        throw new Error(
          `expired_token: ${data.error_description}`,
        )

      case 'incorrect_device_code':
        throw new Error(
          `incorrect_device_code: ${data.error_description}`,
        )

      default:
        throw new Error(
          `${data.error}: ${data.error_description}`,
        )
    }
  }
  return data
}

async function pollForSponsorship({
  accessToken,
  maintainerLogins,
  interval,
  signal,
}) {
  const sponsorshipCount = await requestSponsorshipCount({
    accessToken,
    maintainerLogins,
    signal,
  })
  if (sponsorshipCount < maintainerLogins.length) {
    await new Promise((resolve) => {
      setTimeout(resolve, interval)
    })
    return pollForSponsorship({
      accessToken,
      maintainerLogins,
      interval,
      signal,
    })
  }
}

async function requestSponsorshipCount({
  accessToken,
  maintainerLogins,
  signal,
}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query(
          $maintainerLogins: [String!]
        ) {
          viewer {
            sponsorshipsAsSponsor(
              maintainerLogins: $maintainerLogins
            ) {
              totalCount
            }
          }
        }
      `,
      variables: {
        maintainerLogins,
      },
    }),
    signal,
  })
  if (!response.ok) {
    throw new Error(
      `Response status: ${response.status}`,
    )
  }
  const data = await response.json()
  if (data.errors) {
    const errorDetails = data.errors[0]
    throw new Error(
      `${errorDetails.type}: ${errorDetails.message}`,
    )
  }
  return data.data.viewer.sponsorshipsAsSponsor.totalCount
}

function showSponsorFlowError(port, errorDetails) {
  port.postMessage({
    type: 'sponsorFlowAborted',
    reason: errorDetails.toString(),
  })
}

export default {
  onConnect,
  requestSponsorshipCount,
}
