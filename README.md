[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)

Anabot, the bot, Reborn
======

My first [bot](https://github.com/anaboth/Anabot) was just a fork from [telebot](https://github.com/yukuku/telebot) and both are unmaintained, my last commit was more than a year ago. So I decided to rewrite it from scratch to remove some limitations I used to had on the previous version, and because Javascript is better than Python ;P

> This bot is heavily inspired on [HyperNerd](https://github.com/tsoding/HyperNerd)

Dependencies
------

- Node.js >= 10

Deploy
------

- Set this environment variables:
  - `BOT_TOKEN  # Telegram token of the bot`
  - `DB_URI     # The URI to connect to the database`
  - `DB_NAME    # The database name`
  - `ROUTE      # The route used as a secret to ensure that is Telegram sending the requests`
- Deploy

References
------

- [Mozilla Developer Reference](https://developer.mozilla.org/en-US/)
- [Telegram Bot API Reference](https://core.telegram.org/bots/api)
- [Node.JS](https://nodejs.org/en/)
- [HyperNerd](https://github.com/tsoding/HyperNerd)
