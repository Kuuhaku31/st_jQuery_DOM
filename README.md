# jQuery DOM 学习

- 使用 Docker 运行一个 Nginx 容器
- 访问 http://localhost:8080

### Dockerfile

```Dockerfile
FROM nginx:alpine

# 删除默认网页
RUN rm -rf /usr/share/nginx/html/*

# 复制你的网页
COPY index.html /usr/share/nginx/html/

# 暴露端口
EXPOSE 80
```

默认目录: `/usr/share/nginx/html`


---

进入到包含 `Dockerfile` 的目录，运行以下命令构建 Docker 镜像:

```bash
# 构建 Docker 镜像（挂载当前目录）
docker run -d `
  -p 8080:80 `
  -v ${PWD}/src:/usr/share/nginx/html `
  --name jquery-dev `
  nginx:alpine

# 运行 Docker 容器
docker run -d -p 8080:80 --name jquery-container jquery-demo
```

### docker-compose

```yaml
version: "3.9"

services:
  web:
    image: nginx:alpine
    container_name: st_jquery_dev
    ports:
      - "8080:80"
    volumes:
      - ./src:/usr/share/nginx/html
```

```bash
# 运行 Docker Compose
docker compose up -d

# 停止 Docker Compose
docker compose down

# 重新构建启动
docker compose up -d --build
```

---

访问: http://localhost:8080
