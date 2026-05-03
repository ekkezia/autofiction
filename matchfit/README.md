# THE RECOGNITION OFFICE

## Run

```bash
npm install
npm run dev
```

## Calling System Queue Focus

To switch the calling system into queue-only focus mode:

1. Open THE RECOGNITION OFFICE in the browser.
2. Click once on the page so it has keyboard focus.
3. Press `R` to show only the queue section.
4. Press `R` again to exit and return to normal view.

## Queue Server Port

The queue Socket.IO server in `server/queue.js` should use:

- `HTTP_PORT = 4002`
- `TD_OSC_PORT = 9000`

Run with `node queue.js`
