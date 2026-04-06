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

## Notes

- OSC is sent to TouchDesigner on port `9001`.
- The server serves the UI and forwards light state changes over Socket.IO and OSC.
