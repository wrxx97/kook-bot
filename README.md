```
docker run -d -p 7082:3000 -e REDIS_HOST=wrxx.site -e REDIS_PORT=9379 -v /etc/timezone:/etc/timezone -v /etc/localtime:/eetc/localtime  --name w-kook-bot wrxx/koot-bot:latest
```
