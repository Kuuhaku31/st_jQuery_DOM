# jQuery DOM 学习

## 简介

### jQuery 和 DOM 的概念：

#### 1. **DOM（Document Object Model）**

DOM 是 **文档对象模型**（Document Object Model）的缩写，它是一种通过编程访问和操作网页内容的标准方法。DOM 将网页上的所有内容（包括 HTML 元素、文本、属性等）表示为一个树状结构，可以通过编程语言（通常是 JavaScript）对其进行操作。

- **结构**：DOM 将 HTML 或 XML 文档表示为一个树形结构，每个 HTML 标签都被视为一个节点，节点之间具有父子关系。
- **操作**：通过 DOM API（通常是 JavaScript），开发者可以访问、修改、删除或添加网页内容和结构。

例如，HTML 页面中的 `<div>` 标签在 DOM 中会表示为一个对象，可以通过 JavaScript 操作它的属性或内容：

```html
<div id="example">Hello, World!</div>
```

通过 JavaScript 操作 DOM：

```javascript
var element = document.getElementById("example"); // 获取 id 为 'example' 的 div
element.innerHTML = "New Content"; // 修改内容
```

#### 2. **jQuery**

jQuery 是一个快速、简洁的 **JavaScript 库**，旨在简化 HTML 文档遍历和操作、事件处理、动画效果以及 Ajax 请求等操作。它使得 JavaScript 的使用更加简单，并且通过提供简洁的 API 来操作 DOM 元素，减少了浏览器兼容性问题。

- **简化 DOM 操作**：jQuery 通过提供简化的选择器和方法，使开发者能够更方便地操作 DOM 元素。
- **兼容性**：jQuery 处理了不同浏览器之间的差异，使得开发者无需考虑浏览器兼容性问题。

例如，使用 jQuery 获取元素并修改其内容：

```html
<div id="example">Hello, World!</div>
```

通过 jQuery 操作 DOM：

```javascript
$("#example").text("New Content"); // 使用 jQuery 修改内容
```

在这个例子中，`$('#example')` 是 jQuery 的选择器，用于选中 ID 为 "example" 的元素，`.text()` 用于修改该元素的文本内容。

### 总结：

- **DOM** 是浏览器的原生接口，用于表示和操作 HTML 或 XML 文档的结构。
- **jQuery** 是基于 JavaScript 的库，它提供了更简单、更兼容的方式来操作 DOM 和执行其他常见的网页任务。

简而言之，DOM 是一个文档的结构模型，而 jQuery 则是一个工具库，用来让你更轻松地操作这个结构。

## 利用 Docker 搭建开发环境

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

## js 语法

let var const 区别

- **var**：函数作用域，允许重复声明和修改。
- **let**：块作用域，不允许重复声明，但允许修改。
- **const**：块作用域，不允许重复声明和修改，必须初始化。

## 端口占用问题解决

```powershell
# 查找占用端口的进程
netstat -ano | findstr :8080

# 杀死占用端口的进程
taskkill /PID <PID> /F
```