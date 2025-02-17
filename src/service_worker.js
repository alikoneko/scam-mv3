const emitter = chrome.runtime.onMessage ?? browser.runtime.onMessage;

emitter.addListener((request, sender, sendResponse) => {
  if (request.method === 'forceLogout') {
    chrome.cookies.remove({
      url: 'https://api-auth.soundcloud.com/connect/',
      name: '_soundcloud_session',
    }, () => sendResponse(true));
  } else if (request.method === 'getCookie') {
    chrome.cookies.get({
      url: 'https://soundcloud.com/',
      name: request.data.name,
    }, (cookie) => sendResponse(cookie));
  } else if (request.method === 'setCookie') {
    chrome.cookies.set({
      url: 'https://soundcloud.com/',
      name: request.data.name,
      value: request.data.value,
      secure: true,
      expirationDate: Math.floor(+new Date(+new Date() + 31536e6) / 1000), // expiry 1 year from now
    }, (cookie) => sendResponse(cookie));
  } else if (request.method === 'removeCookie') {
    chrome.cookies.remove({
      url: 'https://soundcloud.com/',
      name: request.data.name,
    }, (details) => sendResponse(details));
  } else if (request.method === 'validateCookie') {
    fetch('https://api-auth.soundcloud.com/connect/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session: { access_token: request.data.cookie } })
    })
    .then(response => {
      sendResponse(response.status === 200);
    })
    .catch(error => {
      console.error('Fetch error:', error);
      sendResponse(false); // Or handle error as needed
    });
  } else if (request.method === 'refreshCookie') {
    const fetchNewCookie = () => {
      fetch('https://api-auth.soundcloud.com/connect/session/token', {
        method: 'POST',
        body: 'null' // Or no body, depending on API requirements
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse(data.session.access_token);
      })
      .catch(error => {
        console.error('Fetch error:', error);
        sendResponse(null); // Or handle error as needed
      });
    };
    if (request.data && request.data.cookie) {
      chrome.cookies.set({
        url: 'https://api-auth.soundcloud.com/connect/',
        name: '_soundcloud_session',
        value: request.data.cookie,
        secure: true,
        SameSiteStatus: 'no_restriction',
      }, () => fetchNewCookie());
    } else fetchNewCookie();
  }

  return true; // Indicate you wish to send a response asynchronously
});
