#!/bin/bash

tmux kill-session -t discord-colorbot

git pull origin main
npm ci

tmux new -d -s discord-colorbot npm run start
