# Light Control

## Install

```bash
npm install
```

## Start the server

```bash
node server.js
```

If you prefer the package script:

```bash
npm start
```

## Start the frontend

The frontend is the static `index.html` served by the Node server. After the server is running, open:

```text
http://localhost:4003
```

## TouchDesigner

Assign `9001` on the `OSC Port`

## Required Ports

Use these exact values:

- `light/server.js` → `HTTP_PORT = 4003`
- `matchfit/server/ticketing/queue.js` → `HTTP_PORT = 4002`
- `matchfit/server/ticketing/queue.js` → `TD_OSC_PORT = 9000`
- `light/server.js` → `TD_OSC_PORT = 9001`

## Notes

- OSC is sent to TouchDesigner on port `9001`.
- The server serves the UI and forwards light state changes over Socket.IO and OSC.
- When the timer reaches `00:00`, the iPad UI switches to a feedback screen (stars, tip, drawn signature pad, submit), then shows a thank-you confirmation with a reset button back to the light controller.

## MISS Name Config (`config.js`)

Set the host name in [config.js](/Users/ek/Documents/GitHub/autofiction/light/config.js):

```js
window.LIGHT_CONFIG = {
  missName: "EMILY",
};
```

This same `missName` value is used in both places:

- Above timer in controller view: `Ms. Tara ON DUTY`
- Feedback page title: `Rate Your Service with Ms. Tara`

Optional temporary override:

- URL param still works: `http://localhost:4003/?miss=Emily`
