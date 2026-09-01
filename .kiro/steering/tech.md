---
inclusion: always
---

# Technology guidance

- Use modern, dependency-free HTML, CSS, and JavaScript modules.
- Run tests with Node's built-in `node:test` module.
- Serve files with the included Node HTTP server.
- Keep scoring logic pure and independent from the DOM.
- Do not introduce frameworks or package dependencies unless a requirement cannot be met without them.
- Do not add analytics, remote fonts, external APIs, or network calls.
- Validate untrusted local input before rendering or scoring.
- Prefer small named functions and explicit data transformations.

Verification commands:

```powershell
node --test
node scripts/validate.mjs
```

