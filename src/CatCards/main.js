
const INITIAL_DRAW_COUNT = 3;
const PLAYER_CARD_LIMIT = 8;
const GAME_STATE_STORAGE_KEY = "cat-cards-game-state";

let gameState = {};    // 游戏状态对象
let isBusy    = false; // 是否正在进行异步操作（如抽卡或对战）

// 统一记录游戏日志，集中渲染到日志面板
function addGameLog(message) {
    gameState.log.push(message);
}

// 将 gameState 保存到 localStorage
function saveGameState() {
    localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(gameState));
}

// 尝试从 localStorage 恢复 gameState，成功返回 true
function loadGameState() {
    const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    if(!raw) return false;

    const savedState = JSON.parse(raw);
    if(!savedState || typeof savedState !== "object") return false;
    gameState = savedState;
    return true;
}

// 获取初始状态对象的函数，返回一个新的状态对象
function initialState(gameState) {
    gameState.cardID         = 0;      // 用于生成唯一卡牌 ID 的计数器
    gameState.playerCards    = [];     // 玩家当前拥有的卡牌列表
    gameState.selectedCardId = null;   // 当前选择的出战卡牌 ID 
    gameState.enemyCard      = null;   // 电脑当前的卡牌
    gameState.round          = 0;      // 当前回合数
    gameState.log            = [];     // 游戏日志
    gameState.sortBy         = "none"; // 玩家卡牌排序字段
    gameState.sortOrder      = "desc"; // 玩家卡牌排序方向
    gameState.filterAliveOnly = false; // 是否仅显示生命值大于0的卡牌
}

// 根据当前筛选与排序设置返回用于显示的卡牌数组（不修改原数组）
function getDisplayedPlayerCards() {
    let cards = gameState.playerCards.slice(); // 创建玩家卡牌列表的副本，避免直接修改原数组

    // 如果设置了仅显示生命值大于0的卡牌，则进行过滤
    if(gameState.filterAliveOnly) cards = cards.filter((card) => card.life > 0);

    // 如果没有设置排序字段，则直接返回过滤后的卡牌列表
    if(gameState.sortBy === "none") return cards;

    // 决定排序的方向，升序为 1，降序为 -1
    const orderFactor = gameState.sortOrder === "asc" ? 1 : -1;

    // 根据当前设置的排序字段对卡牌进行排序，未加载完成的卡牌按 0 处理，名称按字典序排序
    cards.sort((a, b) => {
        switch(gameState.sortBy) {
            case "life":    return (a.life    - b.life   ) * orderFactor;
            case "attack":  return (a.attack  - b.attack ) * orderFactor;
            case "defense": return (a.defense - b.defense) * orderFactor;
            case "maxLife": return (a.maxLife - b.maxLife) * orderFactor;
            default:        return 0;
        }
    });

    return cards;
}

// 通过id查询卡牌是否存在于玩家的卡牌列表中，如果存在则返回该卡牌对象，否则返回 null
function findCardById(cardId) {
    for(const card of gameState.playerCards) if(card.id === cardId) return card;
    return null;
}

// 移除卡牌
function removeCardById(cardId) {
    gameState.playerCards = gameState.playerCards.filter((c) => c.id !== cardId);
    if(gameState.selectedCardId === cardId) gameState.selectedCardId = null; // 如果丢弃的卡牌是当前选择的出战卡牌，则取消选择
}

// 设置卡牌生命
function setCardLifeById(cardId, newLife) {
    for(const card of gameState.playerCards) if(card.id === cardId) {
        card.life = newLife;
        return;
    }
}


// 抽卡
async function drawOneCard(isForEnemy = false) {

    // 从 API 获取一张新的卡牌信息
    async function getCardInfoFromAPI() {

        const CAT_API  = "https://api.thecatapi.com/v1/images/search";
        const USER_API = "https://randomuser.me/api/?results=3&nat=jp";

        // 通用的 fetch JSON 数据函数，带错误处理
        // async 表示这是一个异步函数，可以使用 await 来等待 Promise 的结果
        async function fetchJson(url) {
            const response = await fetch(url);
            if(!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }
            return response.json();
        }

        // 从猫咪 API 获取一张猫咪图片的 URL
        async function getCatImageUrl() {
            const data = await fetchJson(CAT_API);
            return data[0]?.url || "";
        }

        // 从随机用户 API 获取一个用户的信息
        async function getUserInfo() {
            const data = await fetchJson(USER_API);
            const user = data.results?.[0];
            if (!user) {
                throw new Error("No user data");
            }

            return {
                firstName:    user.name.first,             // 用户的名字
                lastName:     user.name.last,              // 用户的姓氏
                age:          user.dob.age,                // 用户的年龄
                streetNumber: user.location.street.number, // 用户住址的街道号码
            };
        }

        // 根据猫咪图片 URL 和用户信息创建一张卡牌对象
        function makeCardInfo(catImageUrl, userInfo) {

            // 计算卡牌的攻击力，基于用户的年龄和街道号码，确保最低攻击力为 10
            const attack = Math.max(10, (userInfo.age % 50) + (userInfo.streetNumber % 30));
            const defense = Math.max(5, (userInfo.age % 30) + (userInfo.streetNumber % 20)); // 计算防御力，确保最低为 5
            const life = Math.max(20, (userInfo.age % 40) + (userInfo.streetNumber % 20) + 10); // 计算生命值，确保最低为 20

            return {
                imageUrl: catImageUrl,                                            // 卡牌的图片 URL
                name:     `${userInfo.firstName} ${userInfo.lastName}`,           // 卡牌的名称
                attack:   attack,                                                 // 卡牌的攻击力
                defense: defense,                                                 // 卡牌的防御力
                life:    life,                                                    // 卡牌当前生命值
                maxLife: life,                                                    // 卡牌最大生命值
            };
        }

        // 发起两个 API 请求，等待它们都完成后再创建卡牌对象
        const catImageUrl = await getCatImageUrl();
        const userInfo    = await getUserInfo();
        const newCardInfo = makeCardInfo(catImageUrl, userInfo);

        return newCardInfo;
    }

    isBusy = true; // 设置正在进行抽卡的状态，禁用相关按钮

    const newCardID = `card-${gameState.cardID++}`; // 生成新的卡牌 ID
    const newCard   = { id: newCardID, };           // 使用生成的卡牌 ID

    if(isForEnemy) gameState.enemyCard = newCard;       // 更新电脑的卡牌状态以显示在界面上
    else           gameState.playerCards.push(newCard); // 将新卡牌添加到玩家的卡牌列表中

    render();

    const cardInfo = await getCardInfoFromAPI(); // 从 API 获取卡牌信息（同步）
    if(!cardInfo) {
        console.error("カード取得に失敗しました。ネットワーク接続を確認して再試行してください。");
    }

    // 如果为电脑抽卡
    else if(isForEnemy) {

        gameState.enemyCard.imageUrl = cardInfo.imageUrl;
        gameState.enemyCard.name     = cardInfo.name;
        gameState.enemyCard.attack   = cardInfo.attack;
        gameState.enemyCard.defense  = cardInfo.defense;
        gameState.enemyCard.life     = cardInfo.life;
        gameState.enemyCard.maxLife  = cardInfo.maxLife;

        addGameLog(`第 ${gameState.round} ラウンド：相手が ${gameState.enemyCard.name} を引きました（攻撃力 ${gameState.enemyCard.attack}、防御力 ${gameState.enemyCard.defense}、HP ${gameState.enemyCard.life}）`);
    }

    // 如果为玩家抽卡
    else {
        // 更新玩家卡牌列表中对应卡牌的信息
        const playerCard = findCardById(newCardID);
        if(playerCard) {

            playerCard.imageUrl = cardInfo.imageUrl;
            playerCard.name     = cardInfo.name;
            playerCard.attack   = cardInfo.attack;
            playerCard.defense  = cardInfo.defense;
            playerCard.life     = cardInfo.life;
            playerCard.maxLife  = cardInfo.maxLife;

            addGameLog(`カードを引きました：${cardInfo.name}（攻撃力 ${cardInfo.attack}、防御力 ${cardInfo.defense}、HP ${cardInfo.life}）`);
        }
    }

    // 抽卡完成后重置状态并更新界面显示
    isBusy = false; // 重置正在进行抽卡的状态
    render();       // 更新界面显示
}

// 绑定页面上的按钮和卡牌操作事件，设置相应的事件处理函数
function bindEvents() {

    // 开始游戏，重置状态并抽取初始卡牌
    function restartGame() {

        // 重置游戏状态
        initialState(gameState); // 重新获取初始状态对象
        render();

        // 同时发起多个抽卡请求，等待所有请求完成后更新玩家的卡牌列表
        for(let i = 0; i < INITIAL_DRAW_COUNT; i++) {
            drawOneCard(false); // 抽取玩家的卡牌
        }
        addGameLog(`初期ドロー完了：${gameState.playerCards.length} 枚のカードを獲得しました`);

        drawOneCard(true);       // 先抽取一张电脑的卡牌

        render();
    }

    // 执行一次对战，比较玩家选择的卡牌和电脑抽取的卡牌，根据结果更新状态和日志
    function doBattle() {

        // 获取当前选择的出战卡牌，如果没有选择则提示玩家先选择卡牌
        const playerCard = findCardById(gameState.selectedCardId);
        const enemyCard      = gameState.enemyCard;
        if(!playerCard || !enemyCard) return;

        // 双方伤害结算
        // 伤害 = 攻击力 - 对方防御力
        const damageToEnemy  = Math.max(0, playerCard.attack - enemyCard.defense);
        const damageToPlayer = Math.max(0, enemyCard.attack - playerCard.defense);
        const newEnemyLife   = Math.max(0, enemyCard.life  - damageToEnemy);
        const newPlayerLife  = Math.max(0, playerCard.life - damageToPlayer);
        const enemyDefeated  = newEnemyLife  <= 0;
        const playerDefeated = newPlayerLife <= 0;

        // 更新双方卡牌的生命值
        setCardLifeById(playerCard.id, newPlayerLife);
        enemyCard.life = newEnemyLife;

        addGameLog(`第 ${gameState.round + 1} ラウンド：${playerCard.name} が ${enemyCard.name} に ${damageToEnemy} ダメージ、${enemyCard.name} が ${playerCard.name} に ${damageToPlayer} ダメージ`);

        // 敌方卡牌被击败：重置生命值后归入玩家卡组，并清空敌方战场
        if(enemyDefeated) {
            enemyCard.life = enemyCard.maxLife; // 击败敌方卡牌后恢复其生命值

            if(gameState.playerCards.length < PLAYER_CARD_LIMIT) {
                gameState.playerCards.push(enemyCard);
                addGameLog(`${enemyCard.name} を撃破！カードを獲得し、HPを全回復しました`);
            } else {
                addGameLog(`${enemyCard.name} を撃破しましたが、カード上限のため獲得できませんでした`);
            }

            drawOneCard(true); // 直接抽取一张新的敌方卡牌，保持对战的连续性
        }

        // 玩家出战卡被击败：从玩家卡组移除
        if(playerDefeated) {
            addGameLog(`あなたの出撃カード ${playerCard.name} は撃破されました`);

            // 玩家没有卡牌
            if(gameState.playerCards.length === 0) {
                addGameLog("カードがなくなりました。ゲーム終了です");
            }
            // 没有生命值大于0的卡牌了
            // else 
        }

        // 如果双方都没有被击败，输出当前双方卡牌的生命值状态
        if(!enemyDefeated && !playerDefeated) {
            addGameLog(`戦闘後の生存状況：自分 ${playerCard.name}（HP ${playerCard.life}）、相手 ${enemyCard.name}（HP ${enemyCard.life}）`);
        }

        gameState.round++; // 回合数加 1

        render();
    }

    // 选择一张卡牌作为出战卡牌，更新状态并输出日志
    function chooseCard(cardId) {

        // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
        const card = findCardById(cardId);
        if(!card) return;

        // 更新当前选择的出战卡牌 ID，并输出日志信息
        gameState.selectedCardId = cardId;
        addGameLog(`${card.name} を出撃に選択しました（攻撃力 ${card.attack}）`);
        render();
    }

    // 丢弃一张卡牌，从玩家的卡牌列表中移除，并更新状态和日志
    function discardCard(cardId) {

        // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
        const card = findCardById(cardId);
        if(!card) return;

        // 从玩家的卡牌列表中移除丢弃的卡牌，如果丢弃的卡牌是当前选择的出战卡牌，则取消选择
        removeCardById(cardId);
        addGameLog(`カードを破棄しました：${card.name}`);

        // 如果玩家没有卡牌了，游戏结束
        if(gameState.playerCards.length === 0) {
            addGameLog("カードがなくなりました。ゲーム終了です");
        }

        render();
    }

    // 事件绑定
    $("#restart-game").on("click", restartGame);
    $("#battle-btn")  .on("click", doBattle);
    $("#sort-by").on("change", function() {
        gameState.sortBy = $(this).val();
        render();
    });
    $("#sort-order").on("change", function() {
        gameState.sortOrder = $(this).val();
        render();
    });
    $("#filter-alive").on("change", function() {
        gameState.filterAliveOnly = $(this).is(":checked");
        render();
    });

    // 事件委托
    $("#player-cards").on("click", ".choose-btn",  function() { chooseCard ($(this).data("id")); });
    $("#player-cards").on("click", ".discard-btn", function() { discardCard($(this).data("id")); });
}

// 渲染游戏界面，根据当前状态更新页面上的卡牌、按钮状态和日志等信息
function render() {

    // 生成卡牌的 HTML 结构
    // showActions 参数控制是否显示出战和丢弃按钮
    // selected 参数控制是否高亮显示
    // 返回一个 jQuery 对象，表示整个卡牌元素
    function createCardElement(card, showActions, selected) {

        // 如果没有卡牌数据，返回一个提示信息
        if (!card) return $("<p>").text("カードなし");

        // 创建卡牌的根元素，如果需要高亮显示则添加 selected 类
        const cardEl = $("<article>").addClass("card");
        if (selected) cardEl.addClass("selected");

        // 创建卡牌的图片元素
        const imageEl = $("<img>").attr("src", card.imageUrl).attr("alt", card.name);

        // 创建卡牌内容元素，包括名称和攻击力、防御力、生命值
        const contentEl = $("<div>").addClass("content");
        const nameEl    = $("<p>")  .addClass("name").text(card.name);
        const metaEl    = $("<p>")  .addClass("meta");
        metaEl.append(`🗡: <strong>${card.attack}</strong>`);
        metaEl.append(`　🛡: <strong>${card.defense}</strong>`);
        metaEl.append(`　❤: <strong>${card.life}/${card.maxLife}</strong>`);

        // 将名称和攻击力添加到内容元素中
        contentEl.append(nameEl, metaEl);

        // 如果需要显示操作按钮，创建出战和丢弃按钮，并添加到内容元素中
        if(showActions) {
            const actionsEl  = $("<div>")   .addClass("card-actions");
            const chooseBtn  = $("<button>").addClass("choose-btn")        .data("id", card.id).text("出撃");
            const discardBtn = $("<button>").addClass("discard-btn danger").data("id", card.id).text("破棄");
            actionsEl.append(chooseBtn, discardBtn);
            contentEl.append(actionsEl);
        }

        // 将图片和内容添加到卡牌根元素中，并返回整个卡牌元素
        cardEl.append(imageEl, contentEl);
        return cardEl;
    }

    // 更新游戏状态显示
    {
        // 更新回合数、卡牌数量和卡牌上限的显示
        $("#round-text").text(gameState.round);
        $("#card-count").text(gameState.playerCards.length + "/" + PLAYER_CARD_LIMIT);

        // 根据游戏状态更新按钮的可用性
        $("#battle-btn").prop("disabled", isBusy || !gameState.selectedCardId || findCardById(gameState.selectedCardId).life <= 0 || !gameState.enemyCard.life);
        $("#restart-game").prop("disabled", isBusy);
        $("#sort-by").val(gameState.sortBy);
        $("#sort-order").val(gameState.sortOrder);
        $("#filter-alive").prop("checked", gameState.filterAliveOnly);

        // 渲染游戏日志，最新的日志显示在最上面
        const gameLogEl = $("#game-log");
        gameLogEl.empty();
        for(let i = gameState.log.length - 1; i >= 0; i--) {
            const item = gameState.log[i];
            gameLogEl.append($("<li>").text(item));
        }
    }

    // 渲染手牌区
    // 如果玩家没有卡牌了，显示提示信息
    const cardsContainer = $("#player-cards");
    if(gameState.playerCards.length === 0) {
        cardsContainer.html("<p>カードがありません。ニューゲームを開始してください。</p>");
    }
    // 否则渲染玩家的卡牌列表
    else {
        const displayedCards = getDisplayedPlayerCards(); // 获取根据当前筛选和排序设置后的卡牌列表

        if(displayedCards.length === 0) cardsContainer.html("<p>表示できるカードがありません。</p>");
        else {
            cardsContainer.empty(); // 清空当前的卡牌显示
            for(let i = 0; i < displayedCards.length; i++) {
                const card   = displayedCards[i];
                const cardEl = createCardElement(card, true, card.id === gameState.selectedCardId);
                cardsContainer.append(cardEl);
            }
        }
    }

    // 渲染对战区
    {
        // 渲染当前选择的出战卡牌和电脑的卡牌，不显示操作按钮，出战卡牌高亮显示
        const selectedCard = findCardById(gameState.selectedCardId);
        $("#selected-card").empty().append(createCardElement(selectedCard, false, true));
        $("#enemy-card").empty().append(createCardElement(gameState.enemyCard, false, false));
    }

    // 每次界面刷新后持久化当前状态
    saveGameState();
}

// 页面加载完成后执行的初始化函数
$(function () {
    bindEvents();                                 // 绑定事件处理函数
    if(!loadGameState()) initialState(gameState); // 无存档时初始化游戏状态
    render();                                     // 初始渲染界面
});
